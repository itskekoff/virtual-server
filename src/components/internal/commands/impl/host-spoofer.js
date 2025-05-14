const { Command } = require("../command");
const {HostManager} = require("../../manager/host-manager");
const {getPrimaryIPv4Address, getServerIP} = require("../../../network");

class HostSpoofer extends Command {
    constructor(logger) {
        super("Host Spoof", "Allows you to join using original ip (only pc)", "ALT + H", logger);
        this.logger = logger;
        this.hostManager = new HostManager();

        this.primaryIpv4 = getPrimaryIPv4Address();
        this.hostManager.clear();
    }

    execute(clientManager, configManager) {
        this.hostManager.toggled = !this.hostManager.toggled;
        if (this.hostManager.toggled) {
            this.logger.info("Hosts spoofer enabled");
            this.hostManager.init();

            getServerIP(configManager.host)
                .then((result) => clientManager.resolvedIp = result)
                .catch((error) => this.logger.error(error.message));

            this.logger.server(`Join using ${this.primaryIpv4}:${configManager.proxyPort} on mobile phone`)
            this.logger.server(`Join using ${configManager.host} on computer`);
        }

        this.hostManager.changeHosts(configManager.host, !this.hostManager.toggled);

        if (!this.hostManager.toggled) {
            this.logger.warning("Hosts spoofer disabled.");
            this.hostManager.clear();
        }
    }
}

module.exports = { HostSpoofer };
