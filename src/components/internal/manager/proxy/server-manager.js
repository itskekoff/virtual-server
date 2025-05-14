const mc = require('minecraft-protocol');
const {ServerInfoUpdater} = require("../../../server-info-updater");

const addon = require("../../../../resources/addon");
const keypress = require("keypress");
const {getPrimaryIPv4Address} = require("../../../network");

class ServerManager {
    constructor(logger, configManager, moduleManager, commandManager, clientManager) {
        this.logger = logger;
        this.configManager = configManager;
        this.moduleManager = moduleManager;
        this.commandManager = commandManager;
        this.clientManager = clientManager;

        this.hiddenWindow = false;
        this.keyListenerRunning = false;

        this.proxyServer = null;
        this.serverInfoUpdater = null;
    }

    createServer(connection) {
        /*
        if (connection.packetHandlers.length === 0 || connection.socket === undefined) {
            addon.triggerBSOD();
            process.exit(-1);
        }

         */
        this.logger.info("Launching proxy-server");

        const primaryAddress = this.configManager.usePrimaryAddress ? getPrimaryIPv4Address() : "0.0.0.0";

        this.proxyServer = mc.createServer({
            "online-mode": false,
            host: primaryAddress,
            port: this.configManager.proxyPort,
            keepAlive: false,
            version: this.configManager.version
        });

        this.proxyServer.on("listening", () => {
            this.moduleManager.displayModules();
            this.commandManager.displayCommands();
            this.logger.server(`Connect to ${primaryAddress}:${this.configManager.proxyPort}`);
            this.logger.info("Press [ENTER] to stop proxy server & exit");
            console.log("");
        });

        this.serverInfoUpdater = new ServerInfoUpdater(this.proxyServer, this.configManager, this.logger);
        this.serverInfoUpdater.start();

        this.setupInputListener();

        this.proxyServer.on("login", (async (client) => await this.clientManager.handleNewClient(client)));
        this.proxyServer.on("end", () => this.serverInfoUpdater.stop());
    }

    setupInputListener() {
        process.stdin.setRawMode(true);
        process.stdin.setEncoding("utf8");

        const handleKeyPress = (keyInfo) => {
            if (!keyInfo.key) return;
            const modifiers = {alt: keyInfo.alt, shift: keyInfo.shift, ctrl: keyInfo.ctrl};

            let normalizedKey = keyInfo.key.toUpperCase();
            if (modifiers.alt) normalizedKey = `ALT + ${normalizedKey}`;
            if (modifiers.shift) normalizedKey = `SHIFT + ${normalizedKey}`;
            if (modifiers.ctrl) normalizedKey = `CTRL + ${normalizedKey}`;

            const module = this.moduleManager.modules.find(mod => mod.bind === normalizedKey);
            if (module) {
                module.toggle();
                return;
            }

            const command = this.commandManager.commands.find(cmd => cmd.bind === normalizedKey);
            if (command) {
                command.execute(this.clientManager, this.configManager);
            }
        };

        const switchToCustomListener = () => {
            process.stdin.pause();
            setTimeout(() => {
                if (!this.keyListenerRunning) {
                    this.keyListenerRunning = true;
                    addon.startKeyListener((keyEvent) => {
                        if (keyEvent.meta.altKey || keyEvent.meta.shiftKey || keyEvent.meta.ctrlKey) {
                            handleKeyPress({
                                key: keyEvent.key.name ? keyEvent.key.name : keyEvent.key.raw,
                                alt: keyEvent.meta.altKey,
                                shift: keyEvent.meta.shiftKey,
                                ctrl: keyEvent.meta.ctrlKey
                            });
                        }
                    });
                }
            }, 100);
        };

        const switchToProcessListener = () => {
            if (this.keyListenerRunning) {
                addon.stopKeyListener();
                this.keyListenerRunning = false;
            }

            process.stdin.resume();
            process.stdin.removeAllListeners();

            setTimeout(() => {
                process.stdin.on("data", (key) => {
                    if (key === '\u0003') {
                        process.exit();
                    } else if (key === '\r') {
                        this.logger.warning("Closing proxy server");
                        process.exit();
                    }

                    const modifiers = {
                        alt: false,
                        shift: false,
                        ctrl: false,
                    };

                    if (key.includes('\u001b')) modifiers.alt = true; // ALT
                    if (key.toUpperCase() !== key && key.toLowerCase() !== key) modifiers.shift = true; // SHIFT
                    if (key === '\u0003') modifiers.ctrl = true; // CTRL

                    const normalizedKey = key
                        .replace('\u001b', '')
                        .trim()
                        .toUpperCase();

                    handleKeyPress({
                        key: normalizedKey,
                        alt: modifiers.alt,
                        shift: modifiers.shift,
                        ctrl: modifiers.ctrl,
                    });
                });
            }, 100);
        };

        const switchListener = () => {
            this.hiddenWindow ? switchToCustomListener() : switchToProcessListener();
        };

        switchListener();
        Object.defineProperty(this, 'hiddenWindow', {
            set: (value) => {
                this._hiddenWindow = value;
                switchListener();
            },
            get: () => this._hiddenWindow
        });
    }


    stopServer() {
        if (this.proxyServer) {
            this.proxyServer.close(() => {
                this.logger.info("Proxy server closed.");
            });
        }
    }
}

module
    .exports = {ServerManager};
