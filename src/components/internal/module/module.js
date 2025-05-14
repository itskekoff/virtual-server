class Module {
    constructor(name, bind, logger) {
        this.name = name;
        this.bind = bind;
        this.enabled = false;
        this.logger = logger;
    }

    toggle() {
        this.enabled = !this.enabled;
        this.logger.info(`${this.name} is now ${this.enabled ? "enabled" : "disabled"}`);
    }

    handleClientPacket(meta, data, clientManager) {}
    handleServerPacket(meta, data, clientManager) {}
}

module.exports = { Module };
