const mc = require('minecraft-protocol');

class PacketHandler {
    constructor(logger) {
        this.logger = logger;
        this.playerPositions = {x: null, y: null, z: null, yaw: null, pitch: null};

        this.packetBuffer = {};
    }

    handleClientPacket(client, data, meta, clientManager) {
        if (clientManager.primaryClient === null) {
            if (meta.name === "settings" || meta.name === "custom_payload") return;
            this.logger.debug(`(second client) packet name: ${meta.name}, data: ${JSON.stringify(data).substring(0, 512)}`);
        }

        if (meta.state === mc.states.PLAY && clientManager.proxyClient.state === mc.states.PLAY) {
            if (client === clientManager.primaryClient) {
                this.logger.debug(`(primary client) packet name: ${meta.name}, data: ${JSON.stringify(data).substring(0, 512)}`);
                meta.cancelled = false;
                let result = clientManager.moduleManager.handleClientPacket(meta, data, clientManager);
                if (result !== undefined) {
                    meta = result.meta;
                    data = result.data;
                }
                if (meta.cancelled) return;

                clientManager.proxyClient.write(meta.name, data);
                this.handleMovementPackets(meta.name, data, clientManager);
            } else if (client === clientManager.secondaryClient && !clientManager.primaryClient) {
                clientManager.proxyClient.write(meta.name, data);
            }
        }
    }

    handleProxyPacket(data, meta, clientManager) {
        if (meta.state === mc.states.PLAY) {
            if (meta.name === "transaction" && clientManager.configManager.host.includes("funtime.su")) {
                this.handleFuntimeTransaction(data, clientManager);
                return;
            }

            if (!["keep_alive", "compress"].includes(meta.name)) {
                meta.cancelled = false;
                let result = clientManager.moduleManager.handleServerPacket(meta, data, clientManager);
                if (result !== undefined) {
                    meta = result.meta;
                    data = result.data;
                }
                if (meta.cancelled) return;

                if (!clientManager.secondaryClient) {
                    if (!this.packetBuffer[clientManager.primaryClient.id]) {
                        this.packetBuffer[clientManager.primaryClient.id] = [];
                    }
                    this.packetBuffer[clientManager.primaryClient.id].push({"name": meta.name, "data": data});
                }

                if (clientManager.primaryClient && clientManager.primaryClient.state === mc.states.PLAY) {
                    clientManager.primaryClient.write(meta.name, data);
                }
                if (clientManager.secondaryClient && clientManager.secondaryClient.state === mc.states.PLAY) {
                    if (this.packetBuffer[clientManager.secondaryClient.id]) {
                        this.packetBuffer[clientManager.secondaryClient.id].forEach(packet => {
                            clientManager.secondaryClient.write(packet.name, packet.data);
                        });
                        this.packetBuffer[clientManager.secondaryClient.id] = [];
                    }

                    clientManager.secondaryClient.write(meta.name, data);
                }
            }
        }
    }

    handleFuntimeTransaction(data, clientManager) {
        const { windowId, action } = data;
        if (windowId !== 0) return false;
        clientManager.proxyClient.write('transaction', {windowId: 0, action, accepted: true});
    }

    handleMovementPackets(packetName, data, clientManager) {
        if (!clientManager.secondaryClient || clientManager.secondaryClient.state !== mc.states.PLAY) return;

        const positionData = {
            x: this.playerPositions.x || data.x,
            y: this.playerPositions.y || data.y,
            z: this.playerPositions.z || data.z,
            yaw: this.playerPositions.yaw || data.yaw,
            pitch: this.playerPositions.pitch || data.pitch,
            flags: 0,
            teleportId: 11,
            dismountVehicle: false,
        };

        if (packetName === 'look') {
            this.playerPositions.yaw = data.yaw;
            this.playerPositions.pitch = data.pitch;
        } else if (packetName === 'position_look' || packetName === 'position') {
            this.playerPositions = { ...this.playerPositions, ...data };
        }

        clientManager.secondaryClient.write('position', positionData);
    }

    synchronizePackets(client, clientManager) {
        client.on('packet', () => {});

        if (this.packetBuffer[clientManager.primaryClient.id]) {
            this.packetBuffer[clientManager.primaryClient.id].forEach(packet => {
                client.write(packet.name, packet.data);
            });
        }

        clientManager.proxyClient.on('packet', (data, meta) => {
            if (meta.state === mc.states.PLAY) {
                client.write(meta.name, data);
            }
        });

        client.on('packet', (data, meta) => this.handleClientPacket(client, data, meta, clientManager));

        this.packetBuffer[client.id] = [];
    }
}

module.exports = {
    PacketHandler
};
