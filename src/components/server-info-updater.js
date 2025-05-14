const https = require("node:https");

class ServerInfoUpdater {
    constructor(proxyServer, config, logger) {
        this.proxyServer = proxyServer;
        this.config = config;
        this.logger = logger;
        this.updateInterval = 10000;
        this.intervalId = null;
    }

    start() {
        this.intervalId = setInterval(() => this.updateServerInfo(), this.updateInterval);
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    async updateServerInfo() {
        await this.getInfo(this.config.host).then((serverInfo) => {
            this.updateProxyServer(serverInfo);
        }).catch((err) => {
            this.logger.error(`Failed to update server info: ${err}`);
        });
    }

    updateProxyServer(serverInfo) {
        if (serverInfo) {
            if ('raw' in serverInfo.motd)
                this.proxyServer.motd = serverInfo.motd.raw;
            this.proxyServer.favicon = serverInfo.icon;
            this.proxyServer.maxPlayers = serverInfo.players.max;
            this.proxyServer.playerCount = serverInfo.players.online;
            this.logger.debug('(proxy query-data) server info updated successfully');
        }
    }

    async getInfo(host) {
        return new Promise((resolve, reject) => {
            const options = {
                hostname: 'api.mcstatus.io',
                port: 443,
                path: `/v2/status/java/${host}`,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const req = https.get(options, (res) => {
                let data = '';

                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const jsonResponse = JSON.parse(data);
                        resolve(jsonResponse);
                    } catch (err) {
                        reject(`Error parsing response: ${err}`);
                    }
                });
            });
            req.on('error', (error) => reject(`Request failed: ${error}`));

            req.end();
        });
    }

}

module.exports = {
    ServerInfoUpdater
}