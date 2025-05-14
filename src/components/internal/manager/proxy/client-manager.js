const mc = require('minecraft-protocol');
const { PacketHandler } = require("../../packet-handler");
const {getServerIP} = require("../../../network");

class ClientManager {
    constructor(logger, configManager, moduleManager, commandsManager) {
        this.logger = logger;
        this.configManager = configManager;
        this.moduleManager = moduleManager;
        this.commandsManager = commandsManager;

        this.packetHandler = new PacketHandler(this.logger);

        this.resolvedIp = null;

        this.primaryClient = null;
        this.secondaryClient = null;
        this.proxyClient = null;
    }

    async handleNewClient(client) {
        if (!this.primaryClient) {
            this.primaryClient = client;
            await this.startProxyClient(client, "Player 1");
        } else if (!this.secondaryClient) {
            this.secondaryClient = client;
            await this.startProxyClient(client, "Player 2");
        } else {
            client.end("Two players are already connected to this proxy.");
        }
    }

    async startProxyClient(client, userLabel) {
        this.logger.client(`${userLabel} connected with username: ${client.username}`);
        if (!this.proxyClient) {
            this.logger.info(`Creating proxy client with username: ${client.username}`);
            await this.createProxyClient(client.username);
        }

        if (client === this.secondaryClient && this.packetHandler.packetBuffer.length > 0) {
            this.packetHandler.synchronizePackets(client, this);
        }

        client.on("packet", (data, meta) => this.packetHandler.handleClientPacket(client, data, meta, this));
        client.on("end", () => this.handleClientDisconnect(client, userLabel));
    }

    async createProxyClient(username) {
        if (!this.resolvedIp) this.resolvedIp = this.configManager.host;
        this.proxyClient = mc.createClient({
            username: username,
            host: this.resolvedIp,
            port: this.configManager.port,
            keepAlive: true,
            version: this.configManager.version
        });

        this.proxyClient.on("packet", (data, meta) => this.packetHandler.handleProxyPacket(data, meta, this));
        this.proxyClient.on("end", () => this.handleProxyDisconnect());
        this.proxyClient.on("error", (err) => this.handleProxyError(err));
    }

    handleClientDisconnect(client, userLabel) {
        this.logger.client(`${userLabel} disconnected`);
        if (this.primaryClient === client) {
            this.primaryClient = null;
            this.logger.info("Primary client disconnected");
        } else if (this.secondaryClient === client) {
            this.secondaryClient = null;
            this.logger.info("Secondary client disconnected.");
        }

        if (!this.primaryClient && !this.secondaryClient) {
            this.logger.info("Both players disconnected. Entering keep-alive mode.");
        }
    }

    handleProxyDisconnect() {
        this.logger.error("Proxy client disconnected from the server.");
        this.proxyClient = null;
        if (this.primaryClient) this.primaryClient.end("Server disconnected");
        if (this.secondaryClient) this.secondaryClient.end("Server disconnected");
    }

    handleProxyError(err) {
        this.logger.error(`Proxy client error: ${err.message}`);
        if (this.primaryClient) this.primaryClient.end(err.message);
        if (this.secondaryClient) this.secondaryClient.end(err.message);
    }
}

module.exports = { ClientManager };
