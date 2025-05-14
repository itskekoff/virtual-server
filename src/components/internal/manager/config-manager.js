const fs = require('fs');
const path = require('path');
const os = require('os');

class Config {
    constructor(logger, key) {
        this.logger = logger;
        this.appDataPath = path.join(os.homedir(), 'AppData', 'Roaming');
        this.configFile = path.join(this.appDataPath, 'config.json');
        this.defaultConfig = {
            key: key,
            version: '1.16.5',
            host: 'funtime.su',
            port: 25565,
            proxyPort: 25565,
            usePrimaryAddress: true
        };
        this.key = this.defaultConfig.key;
        this.version = this.defaultConfig.version;
        this.host = this.defaultConfig.host;
        this.port = this.defaultConfig.port;
        this.proxyPort = this.defaultConfig.proxyPort;
        this.usePrimaryAddress = this.defaultConfig.usePrimaryAddress;
    }

    async loadConfig(keyValue) {
        try {
            this.key = keyValue;
            let configData = this.defaultConfig;

            if (fs.existsSync(this.configFile)) {
                const data = fs.readFileSync(this.configFile, 'utf8');
                configData = JSON.parse(data);

                try {
                    this.host = configData.host;
                    this.port = configData.port;
                    this.proxyPort = configData.proxyPort;
                    this.version = configData.version;
                    this.usePrimaryAddress = configData.usePrimaryAddress;
                } catch (e) {
                    this.logger.error("Unable to load data: delete configuration file (%appdata%/config.json) and restart program.");
                    setTimeout(() => process.exit(-1), 5000);
                }
            }

            this.logger.info(`Loaded configuration [${this.toString()}]`);
            console.log();
            const shouldUpdate = await this.logger.askQuestion(`Do you want to change configuration? (yes/no): `);

            if (shouldUpdate.toLowerCase() === 'yes') {
                this.host = await this.logger.askQuestionWithDefault(
                    `Enter host (current ${configData.host})`, this.defaultConfig.host);
                this.port = parseInt(await this.logger.askQuestionWithDefault(
                    `Enter port (current ${configData.port})`, this.defaultConfig.port
                ), 10);
                this.proxyPort = parseInt(await this.logger.askQuestionWithDefault(
                    `Enter proxy port (current ${configData.proxyPort})`, this.defaultConfig.proxyPort
                ), 10);
                this.version = await this.logger.askQuestionWithDefault(
                    `Enter server version (current ${configData.version})`, this.defaultConfig.version);

                const usePrimary = await this.logger.askQuestionWithDefault(
                    `Use primary ipv4 address or localhost (current ${await this.formatBoolean(configData.usePrimaryAddress)}) (yes/no)`,
                    await this.formatBoolean(this.defaultConfig.usePrimaryAddress));

                usePrimary.toLowerCase() === 'yes' ? this.usePrimaryAddress = true : false;

                this.saveConfig();
            }
        } catch (error) {
            this.logger.error(`Error loading config: ${error.message}`);
            this.saveConfig();
        }
        console.clear();
        this.logger.info(`Current configuration [${this.toString()}]`);
    }

    async formatBoolean(value) {
        return value ? 'yes' : 'no';
    }

    async getKeyFromConfig() {
        if (!fs.existsSync(this.configFile)) {
            return undefined;
        }
        const data = fs.readFileSync(this.configFile, 'utf8');
        return JSON.parse(data).key;
    }

    saveConfig() {
        try {
            const config = {
                key: this.key,
                version: this.version,
                host: this.host,
                port: this.port,
                proxyPort: this.proxyPort,
                usePrimaryAddress: this.usePrimaryAddress
            };
            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 4));
            this.logger.info(`Configuration saved to ${this.configFile}`);
        } catch (error) {
            this.logger.error(`Error saving config: ${error.message}`);
        }
    }

    toString() {
        return `host=${this.host}, port=${this.port}, version=${this.version}, proxyPort=${this.proxyPort}, primary=${this.usePrimaryAddress}`;
    }
}

module.exports = {Config};
