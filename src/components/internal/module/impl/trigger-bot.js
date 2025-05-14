const mc = require("minecraft-protocol");
const { Module } = require("../module");
const {BoundingBox} = require("../../math/type/aa-bounding-box");
const {Projection} = require("../../math/projection");
const {Vec3} = require("vec3");

class TriggerBot extends Module {
    constructor(logger, clientManager) {
        super("TriggerBot", "R", logger);
        this.clientManager = clientManager;
        this.delay = 800;
        this.lastAttackTime = 0;
        this.minDelay = 700;
        this.maxDelay = 1100;
        this.playerPosition = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
        this.entityPositions = new Map();
        this.attackRange =  3.5373217697949784; // base attack range
    }

    handleClientPacket(meta, data) {
        if (meta.name === 'position' || meta.name === 'look') {
            this.updatePlayerPosition(data);
        }
    }

    handleServerPacket(meta, data) {
        if (meta.name === 'entity_teleport' || meta.name === 'entity_move_look') {
            this.updateEntityPosition(meta, data);
        }

        this.tryAttack();
    }

    updatePlayerPosition(data) {
        this.playerPosition.x = data.x || this.playerPosition.x;
        this.playerPosition.y = data.y || this.playerPosition.y;
        this.playerPosition.z = data.z || this.playerPosition.z;

        this.playerPosition.yaw = data.yaw || this.playerPosition.yaw;
        this.playerPosition.pitch = data.pitch || this.playerPosition.pitch;

        this.logger.debug(`[TriggerBot] updated player position: ${JSON.stringify(this.playerPosition)}`);
    }

    updateEntityPosition(meta, data) {
        const entityId = data.entityId;
        let entityPosition = this.entityPositions.get(entityId) || new Vec3(0, 0, 0);

        if (meta.name === 'entity_teleport') {
            entityPosition.set(data.x, data.y, data.z)
        } else if (meta.name === 'entity_move_look') {
            entityPosition.x += data.dX / 4096.0;
            entityPosition.y += data.dY / 4096.0;
            entityPosition.z += data.dZ / 4096.0;
        }

        this.entityPositions.set(entityId, entityPosition);

        this.logger.debug(`(TriggerBot) updated entity position for entityId ${entityId}: ${JSON.stringify(entityPosition)}`);
    }

    tryAttack() {
        const primaryClient = this.clientManager.primaryClient;
        if (!primaryClient || primaryClient.state !== mc.states.PLAY) {
            return;
        }

        const now = Date.now();
        if (now - this.lastAttackTime < this.delay) {
            this.logger.debug(`(TriggerBot) attack delayed - waiting for ${this.delay}ms`);
            return;
        }

        for (const [entityId, entityPosition] of this.entityPositions) {
            if (this.isCanAttack(entityPosition)) {
                this.logger.debug(`(TriggerBot) attacking entity ${entityId} at position: ${JSON.stringify(entityPosition)}`);

                this.clientManager.proxyClient.write("use_entity", {target: entityId, mouse: 1, sneaking: false});
                this.clientManager.proxyClient.write("arm_animation", {hand: 0})

                /*
                TODO: сделать эту функцию работающей (не понятно как получить entityId у клиента)
                primaryClient.write("animation", {
                    entityId: this.clientManager.proxyClient.id,
                    animation: 0 // hand attack
                });
                 */

                this.delay = this.randomDelay(this.minDelay, this.maxDelay);
                this.lastAttackTime = now;
                break;
            }
        }
    }

    isCanAttack(entityPosition) {
        const dx = entityPosition.x - this.playerPosition.x;
        const dy = entityPosition.y - (this.playerPosition.y + 1.62);
        const dz = entityPosition.z - this.playerPosition.z;

        const eyePosition = new Vec3(this.playerPosition.x, this.playerPosition.y + 1.62, this.playerPosition.z);

        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance > this.attackRange) {
            return false;
        }

        const entityBoundingBox = BoundingBox.createBoundingBox(
            entityPosition.x,
            entityPosition.y,
            entityPosition.z
        );

        this.logger.debug(`(TriggerBot) distance to entity: ${distance}, in range: ${distance <= this.attackRange}`);
        return distance <= this.attackRange && Projection.isLookingAt(this.playerPosition, entityBoundingBox, eyePosition, entityPosition);
    }

    randomDelay(min, max) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        this.logger.debug(`(TriggerBot) generated random delay: ${delay}ms`);
        return delay;
    }

    toggle() {
        super.toggle();
        if (!this.enabled) {
            this.entityPositions.clear();
            this.logger.debug(`(TriggerBot) cleared entity positions on disable`);
        }
    }
}

module.exports = { TriggerBot };
