const { Command } = require("../command");

class ClientSwitcher extends Command {
    constructor(logger) {
        super("Client Switch", "Switches between primary client and secondary client", "ALT + G", logger);
        this.logger = logger;
    }

    execute(clientManager, configManager) {
        if (clientManager.primaryClient && clientManager.secondaryClient) {
            this.logger.debug("(client switcher) Switching primary and secondary clients...");

            const oldPrimary = clientManager.primaryClient;
            clientManager.primaryClient = clientManager.secondaryClient;
            clientManager.secondaryClient = oldPrimary;

            this.logger.info("(client switcher) Clients switched: primary <-> secondary");

            if (clientManager.packetHandler.packetBuffer.length > 0) {
                clientManager.packetHandler.synchronizePackets(clientManager.secondaryClient, clientManager);
                this.logger.debug("(client switcher) Synchronized packet buffer with the new secondary client.");
            }
            this.attachPacketHandlers(clientManager);
        } else {
            this.logger.error("(client switcher) Cannot switch: One or both clients are not connected.");
        }
    }

    attachPacketHandlers(clientManager) {
        if (clientManager.primaryClient) {
            clientManager.primaryClient.on("packet", (data, meta) => {
                clientManager.packetHandler.handleClientPacket(clientManager.primaryClient, data, meta, clientManager);
            });
        }

        if (clientManager.secondaryClient) {
            clientManager.secondaryClient.on("packet", (data, meta) => {
                clientManager.packetHandler.handleClientPacket(clientManager.secondaryClient, data, meta, clientManager);
            });
        }
    }
}

module.exports = { ClientSwitcher };
