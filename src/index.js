const Logger = require("./components/logger");

const {Config} = require("./components/internal/manager/config-manager");
const {ClientManager} = require("./components/internal/manager/proxy/client-manager");
const {ModuleManager} = require("./components/internal/manager/functions/module-manager");
const {GlowESP} = require("./components/internal/module/impl/glow-esp");
const {FreeCam} = require("./components/internal/module/impl/free-cam");
const {TriggerBot} = require("./components/internal/module/impl/trigger-bot");
const {ServerManager} = require("./components/internal/manager/proxy/server-manager");
const {CommandManager} = require("./components/internal/manager/functions/command-manager");
const {HostSpoofer} = require("./components/internal/commands/impl/host-spoofer");

const {generateHWID} = require("./components/utility/security/hwid-generator");
const {generateKey} = require("./components/utility/generate-key");
const {isAdmin} = require("./components/internal/admin-checker");

const addon = require("./resources/addon");

const { exec } = require('child_process');
const os = require("node:os");
const path = require("node:path");
const {ClientSwitcher} = require("./components/internal/commands/impl/client-switcher");
const {WindowToggle} = require("./components/internal/commands/impl/window-toggle");


class ProxyServer {
    constructor() {
        this.logger = new Logger();
        this.configManager = new Config(this.logger, undefined);

        this.moduleManager = new ModuleManager(this.logger);
        this.commandManager = new CommandManager(this.logger);

        this.clientManager = new ClientManager(this.logger, this.configManager, this.moduleManager, this.commandManager);
        this.serverManager = new ServerManager(this.logger, this.configManager, this.moduleManager, this.commandManager, this.clientManager);

        this.moduleManager.addModule(new GlowESP(this.logger, this.clientManager));
        this.moduleManager.addModule(new FreeCam(this.logger, this.clientManager));
        this.moduleManager.addModule(new TriggerBot(this.logger, this.clientManager));

        //this.commandManager.addCommand(new HostSpoofer(this.logger));
        this.commandManager.addCommand(new ClientSwitcher(this.logger));
        this.commandManager.addCommand(new WindowToggle(this.logger, this.serverManager));
    }

    timeoutExit() {
        setTimeout(() => process.exit(-1), 5000);
    }

    async ensureAdmin() {
        const platform = os.platform();

        if (platform === 'linux' || platform === 'darwin') {
            const isRoot = process.geteuid && process.geteuid() === 0;
            if (!isRoot) {
                this.logger.error("(admin checker) Restart proxy server with 'sudo' perms");
                process.exit(1);
            }
        } else if (platform === 'win32') {
            const result = await isAdmin();
            if (!result) {
                this.logger.error("(admin checker) Admin rights not found. Please wait for admin dialog appear and accept.");
                const script = `"& {Start-Process '${path.basename(process.argv[0])}' -Verb RunAs}"`;
                return new Promise((resolve, reject) => {
                    exec(`powershell.exe ${script}`, (error) => {
                        if (error) {
                            this.logger.error(`(admin requester) An error has occurred: ${error.message}`);
                            reject(error);
                        } else {
                            process.exit(1);
                        }
                    });
                });
            }
        }
    }


    async start() {
        if (!addon.ping()) {
            this.logger.error("(native api) Can't load native library");
            this.timeoutExit();
        }
        await this.ensureAdmin();

        const debugAnswer = await this.logger.askQuestion("Enable debug mode (yes/no): ");
        this.logger.debugMode = debugAnswer.toLowerCase() === 'yes';

        let keyValue = await this.configManager.getKeyFromConfig();
        if (keyValue === undefined) {
            keyValue = await this.logger.askQuestion("Enter license key: ");
        }
        this.logger.info("Successfully passed authentication");
        await this.configManager.loadConfig(keyValue);
        this.serverManager.createServer(null);

        /*

        if (keyValue.startsWith("0x") && keyValue.length === 14) {
            const connection = new ServerConnection(keyValue, generateHWID());
            await connection.connect().catch((err) => {
                this.logger.error("Active subscription not found");
                this.timeoutExit();
            }).then(async (result) => {
                if (result.length < 8 && result.length > 4) {
                    this.logger.info("Successfully passed authentication");
                    await this.configManager.loadConfig(keyValue);
                    this.serverManager.createServer(connection);
                }
            });
        } else {
            this.logger.error("Please enter valid key, returning in 5s...");
            setTimeout(async () => {
                console.clear();
                await this.start();
            }, 5000);
        }

         */
    }
}

async function main() {
    const randomString = generateKey().slice(2, 14);
    process.stdout.write(`\x1B]0;${randomString}\x07`);
    process.stdout.write(`\x1b]2;${randomString}\x1b\x5c`);
    try {
        const proxyServer = new ProxyServer();
        await proxyServer.start();
    } catch (error) {
        console.error(`Setup failed: ${error.message}`);
    }
}

main().then(() => null);