const {exec} = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const Logger = require("./src/components/logger");
const {NameObfuscation} = require("./name-obfuscator");

const inputDir = './src'

const entrypointBaseName = `${inputDir}/index.js`;

const obfuscateDir = './src-out';
const outputDir = './build';
const nativeBuildDir = './native/build/Release';

const inputResourcesDir = `${inputDir}/resources`;
const outputResourcesDir = `${outputDir}/resources`

const logger = new Logger();
let entryPointName;

function runCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${error.message}`);
                return;
            }
            if (stderr) {
                logger.error(`(run command) error: ${stderr}`);
            }
            resolve();
        });
    });
}

async function cleanNativeBuildDir() {
    try {
        const files = await fs.promises.readdir(nativeBuildDir);
        for (const file of files) {
            const filePath = path.join(nativeBuildDir, file);
            if (file !== 'addon.node') {
                await fs.promises.unlink(filePath);
            }
        }
    } catch (error) {
        logger.error(`(cleanup native) Error cleaning native build directory: ${error}`);
    }
}

async function moveAddonToInputResources() {
    try {
        const addonPath = path.join(nativeBuildDir, 'addon.node');
        const destinationPath = path.join(inputResourcesDir, 'addon.node');

        await fs.promises.mkdir(inputResourcesDir, {recursive: true});
        await fs.promises.copyFile(addonPath, destinationPath);

        logger.info(`(move addon) moved addon.node to resources dir`);
    } catch (error) {
        logger.error(`(move addon) error moving addon.node: ${error}`);
    }
}

async function remapCode() {
    const nameObfuscation = new NameObfuscation(
        entrypointBaseName.replaceAll("/", "\\").replaceAll(".\\", ""),
        `${inputDir}`,
        `${obfuscateDir}/obfuscated`, logger);
    entryPointName = nameObfuscation.run();
}

async function moveAddonToOutputDirectory() {
    const obfuscatedDir = path.join(obfuscateDir, 'obfuscated');
    const files = await fs.promises.readdir(obfuscatedDir);
    for (const file of files) {
        const filePath = path.join(obfuscatedDir, file);
        const stats = await fs.promises.stat(filePath);
        if (stats.isFile() && !file.endsWith('.js')) {
            if (!fs.existsSync(outputResourcesDir)) {
                fs.mkdirSync(outputResourcesDir, {recursive: true});
            }
            const destinationPath = `${outputResourcesDir}/${file}`;
            await fs.promises.rename(filePath, destinationPath);
            logger.info(`Moved ${file} to src-out directory`);
        }
    }
}

async function obfuscateCode() {
    logger.info("(obfuscation) obfuscating code...");
    await runCommand(`javascript-obfuscator ${obfuscateDir}/obfuscated --output ${obfuscateDir} --source-map-sources-mode sources --options-preset high-obfuscation --ignore-imports true`);
    logger.info("(obfuscation) code obfuscated");
    await deleteDirectory(obfuscateDir + "/obfuscated");
}

async function generatePackageJson() {
    logger.info("(package) building binary");
    const projectName = 'virtual-server';
    const version = '1.0.0';
    const description = 'oh shit here we go again';
    const entryFile = entryPointName;
    const author = 'itskekoff';
    const license = 'MIT';
    const dependencies = {
        "fs-extra": "^11.2.0",
        "gradient-string": "2.0.2",
        "keypress": "^0.2.1",
        "minecraft-protocol": "1.44.0",
        "nan": "^2.22.0",
        "node-machine-id": "^1.1.12",
        "path": "^0.12.7",
        "vec3": "^0.1.10"
    };
    const packageJson = {
        name: projectName,
        version: version,
        description: description,
        main: entryFile,
        scripts: {
            start: `node ${entryFile}`
        },
        author: author,
        license: license,
        dependencies: dependencies
    };
    fs.writeFileSync(
        path.join(__dirname, obfuscateDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    );
}

async function createBinary() {
    logger.info("(binary) building binary");
    const pkgCommand = `pkg ${obfuscateDir}/${entryPointName} -o ${outputDir}/virtual-server.exe -t node18-win`;
    await runCommand(pkgCommand);
    logger.info("(binary) build success");
}

async function deleteDirectory(dirPath) {
    try {
        const files = await fs.promises.readdir(dirPath);
        await Promise.all(files.map(async (file) => {
            const currentPath = path.join(dirPath, file);
            const stats = await fs.promises.stat(currentPath);
            if (stats.isDirectory()) {
                await deleteDirectory(currentPath);
            } else {
                await fs.promises.unlink(currentPath);
            }
        }));
        await fs.promises.rmdir(dirPath);
    } catch (error) {
        logger.error(`(cleanup) an error has occurred: ${error}`);
    }
}

async function main() {
    try {
        await deleteDirectory(`${outputDir}`);
        await deleteDirectory(`${obfuscateDir}`)
        await cleanNativeBuildDir();

        await moveAddonToInputResources();
        await remapCode();
        await moveAddonToOutputDirectory();

        await obfuscateCode();
        await generatePackageJson();
        await createBinary();
    } catch (error) {
        console.log(error);
        logger.error(`(main) an error has occurred: ${error}`);
    }
}

main().then(() => null);