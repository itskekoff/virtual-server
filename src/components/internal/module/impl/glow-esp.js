const mc = require("minecraft-protocol")

const { Module } = require("../module");

class GlowESP extends Module {
    constructor(logger, clientManager) {
        super("Glow ESP", "G", logger);
        this.glowingEntities = new Set();
        this.clientManager = clientManager;
    }

    handleServerPacket(meta, data) {
        if (this.enabled && meta.name === "entity_metadata") {
            let old_value = 0x00
            data.metadata = data.metadata.map(entry => {
                if (entry.key === 0) {
                    old_value = entry.value;
                    entry.value |= 0x40;
                }
                return entry;
            });
            this.glowingEntities.add({id: data.entityId, value: old_value});
            return { meta, data };
        }
        return undefined;
    }

    disableEffectForAllEntities() {
        const resetPackets = Array.from(this.glowingEntities).map((id, value) => ({
            name: 'entity_metadata',
            data: {
                entityId: id,
                metadata: [{ key: 0, value: value, type: 0 }]
            }
        }));
        this.glowingEntities.clear();
        return resetPackets;
    }

    toggle() {
        super.toggle();

        if (!this.enabled && this.clientManager.primaryClient && this.clientManager.primaryClient.state === mc.states.PLAY) {
            const resetPackets = this.disableEffectForAllEntities();
            resetPackets.forEach(packet => {
                this.clientManager.primaryClient.write(packet.name, packet.data);
            });
        }
    }
}

module.exports = { GlowESP };
