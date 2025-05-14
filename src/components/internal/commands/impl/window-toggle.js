const {Command} = require("../command");

const addon = require("../../../../resources/addon");

class WindowToggle extends Command {
    constructor(logger, serverManager) {
        super("Window Toggle", "Hides or shows the application window", "ALT + J", logger);
        this.logger = logger;
        this.serverManager = serverManager;
    }

    execute(clientManager, configManager) {
        this.serverManager.hiddenWindow = !this.serverManager.hiddenWindow;
        addon.switchWindowVisibility(process.pid);
        this.logger.info(`(window toggle) Switched window visibility: ${!this.serverManager.hiddenWindow}`);
    }
}

module.exports = {WindowToggle}