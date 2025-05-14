class ModuleManager {
    constructor(logger, proxy) {
        this.logger = logger;
        this.proxy = proxy;
        this.modules = [];
    }

    addModule(module) {
        this.modules.push(module);
    }

    displayModules() {
        console.log("");
        this.logger.info("Available modules:");
        this.modules.forEach(mod => this.logger.info(`[${mod.bind}] ${mod.name}`));
        console.log("");
    }

    handleClientPacket(meta, data, clientManager) {
        return this._basePacketHandler(meta, data, clientManager, true)
    }

    handleServerPacket(meta, data, clientManager) {
        return this._basePacketHandler(meta, data, clientManager, false)
    }

    _basePacketHandler(meta, data, clientManager, client) {
        this.modules.forEach(module => {
            if (module.enabled) {
                return client ? module.handleClientPacket(meta, data, clientManager) : module.handleServerPacket(meta, data, clientManager);
            }
        });
    }

}

module.exports = { ModuleManager };