class Command {
    constructor(name, desc, bind, logger) {
        this.name = name;
        this.desc = desc;
        this.bind = bind;
        this.logger = logger;
    }

    execute(clientManager, configManager) {}
}

module.exports = { Command };
