const gradient = require('gradient-string');
const readline = require("readline");

class Logger {
    constructor() {
        this.debugMode = false;
    }

    static colors = {
        info: gradient('#01fd95', '#4ee11c'),
        warning: gradient('#b86b14', '#cf6b23'),
        client: gradient('#059e8d', '#3fdcbe'),
        server: gradient('#f6f10c', '#afdf12'),
        error: gradient('#e84a55', '#4f080d'),
        debug: gradient('#1e02f8', '#3d4388'),
    };

    log(level, msg) {
        const color = Logger.colors[level];
        console.log(color(`[${level.charAt(0).toUpperCase() + level.slice(1)}] `) + msg);
    }

    info(msg) { this.log('info', msg); }
    warning(msg) { this.log('warning', msg); }
    client(msg) { this.log('client', msg); }
    server(msg) { this.log('server', msg); }
    error(msg) { this.log('error', msg); }
    debug(msg) {
        if (this.debugMode) {
            this.log('debug', msg);
        }
    }

    async askQuestionWithDefault(question, defaultValue) {
        const fullQuestion = `${question} (default ${defaultValue}): `;
        const answer = await this.askQuestion(fullQuestion);
        return answer.trim() || defaultValue;
    }

    askQuestion(question) {
        return new Promise(resolve => {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question(gradient('#9807f1', '#5c018e')("[Input] ") + question, answer => {
                resolve(answer);
                rl.close();
            });
        });
    }
}

module.exports = Logger;