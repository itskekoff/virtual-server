class CommandManager {
    constructor(logger) {
        this.logger = logger;
        this.commands = [];
    }

    addCommand(command) {
        this.commands.push(command);
    }

    getCommandByName(name) {
        return this.commands.find(c => c.name === name);
    }

    displayCommands() {
        this.logger.info("Available commands:");
        this.commands.forEach(cmd => this.logger.info(`[${cmd.bind}] ${cmd.desc}`));
        console.log("");
    }
}

module.exports = { CommandManager };