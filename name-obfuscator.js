const {generateKey} = require("./src/components/utility/generate-key");
const fs = require("fs-extra");
const path = require("path");
const parser = require("@babel/parser");
const {default: traverse} = require("@babel/traverse");
const {default: generate} = require("@babel/generator");

let renameMap;
let input;

class NameObfuscation {
    constructor(entryPointBaseName, inputDir, outputDir, logger) {
        this.entryPoint = entryPointBaseName;
        this.inputDir = inputDir;
        this.outputDir = outputDir;
        this.logger = logger;
        this.renameMap = new Map();

        input = this.inputDir;
        renameMap = this.renameMap;
    }

    generateUniqueName() {
        return generateKey(16);
    }

    getLastSegment(filePath) {
        return filePath.split('/').pop();
    }

    updateMappings(inputDir, outputDir) {
        const files = fs.readdirSync(inputDir, {withFileTypes: true});

        files.forEach((file) => {
            const inputPath = path.join(inputDir, file.name);
            const isDirectory = file.isDirectory();
            const ext = isDirectory ? "" : path.extname(file.name);
            const uniqueName = this.generateUniqueName() + ext;
            let outputPath = path.join(outputDir, uniqueName);

            let renameKey = path.relative(process.cwd(), inputPath).replace(/\\/g, "/");
            let renameValue = path.relative(process.cwd(), outputPath).replaceAll(/\\/g, "/");

            if (renameKey.includes(".")) renameKey = renameKey.split(".")[0];
            if (renameValue.includes(".")) renameValue = renameValue.split(".")[0];

            renameKey = renameKey.replace(`${this.inputDir}/`, "./");
            renameValue = renameValue.replace(`${this.outputDir}/`, "./");
            let remapValue = "./" + this.getLastSegment(renameValue);
            if (renameKey.includes("resources")) {
                remapValue = `./resources/${this.getLastSegment(renameValue)}`
            }
            this.renameMap.set(renameKey, remapValue);
            if (isDirectory) this.updateMappings(inputPath, outputPath);
        });
    }

    processFiles(inputDir, outputDir) {
        const files = fs.readdirSync(inputDir, {withFileTypes: true});

        files.forEach((file) => {
            const inputPath = path.join(inputDir, file.name);
            let renameKey = path.relative(process.cwd(), inputPath).replace(/\\/g, "/");

            if (renameKey.includes(".")) renameKey = renameKey.split(".")[0];
            renameKey = renameKey.replace(`${this.inputDir}/`, "./");

            const isDirectory = file.isDirectory();
            const ext = isDirectory ? "" : path.extname(file.name);
            let uniqueName = this.renameMap.get(renameKey) + ext;
            if (uniqueName === undefined) uniqueName = renameKey;
            if (!isDirectory) {
                const outputFilePath = this.getLastSegment(path.join(outputDir, uniqueName).replaceAll("\\", "/"));

                if (ext !== ".js") {
                    fs.copyFileSync(inputPath, `./${this.outputDir}/${outputFilePath}`);
                    return;
                }

                const content = fs.readFileSync(inputPath, "utf8");
                let updatedContent = this.transformContent(content, path.dirname(inputPath));

                if (inputPath === this.entryPoint) {
                    this.obfuscatedEntryPoint = outputFilePath;
                }

                fs.writeFileSync(`./${this.outputDir}/${outputFilePath}`, updatedContent, "utf8");
            } else {
                const newOutputDir = path.join(outputDir, this.renameMap.get(renameKey));
                this.processFiles(inputPath, newOutputDir);
            }
        });
    }

    transformContent(content, fileDir) {
        const ast = parser.parse(content, {
            sourceType: "module",
            plugins: ["dynamicImport"],
        });

        traverse(ast, {
            CallExpression(path) {
                if (path.node.callee.name === "require") {
                    const arg = path.node.arguments[0];
                    if (arg && arg.type === "StringLiteral") {
                        const updatedPath = updateImportPath(arg.value, fileDir);
                        if (updatedPath) arg.value = updatedPath;
                    }
                }
            },
            ImportDeclaration(path) {
                const source = path.node.source;
                if (source && source.type === "StringLiteral") {
                    const updatedPath = updateImportPath(source.value, fileDir);
                    if (updatedPath) source.value = updatedPath;
                }
            },
        });

        const {code} = generate(ast, {retainLines: true});
        return code;
    }

    run() {
        if (!fs.existsSync(this.inputDir)) {
            this.logger.error("(name obfuscation) input directory does not exist!");
            return;
        }

        fs.emptyDirSync(this.outputDir);
        this.updateMappings(this.inputDir, this.outputDir);
        this.processFiles(this.inputDir, this.outputDir);

        this.logger.info("(name obfuscation) mappings:");
        console.log(this.renameMap);
        return this.obfuscatedEntryPoint;
    }
}

function updateImportPath(importPath, currentFilePath) {
    if (!(importPath.startsWith("./") || importPath.startsWith("../"))) {
        return null;
    }
    const normalizedPath = path.resolve(currentFilePath, importPath);
    const relativePath = path.relative(`./${input}`, normalizedPath).replace(/\\/g, '/');
    const finalPath = `${input.replaceAll("./", "")}/${relativePath}`;
    return renameMap.get(finalPath);
}

module.exports = {
    NameObfuscation
}