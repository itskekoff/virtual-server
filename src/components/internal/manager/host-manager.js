const fs = require('fs');
const os = require('os');
const {getPrimaryIPv4Address} = require("../../network");

class HostManager {
    constructor() {
        this.startMarker = "# ;3 #";
        this.endMarker = "# :) #";
        this.toggled = false;
    }

    init() {
        const hostsFile = getHostsFilePath();
        let hostsContent = fs.readFileSync(hostsFile, 'utf-8');

        if (hostsContent.includes(this.startMarker) && hostsContent.includes(this.endMarker)) {
            return;
        }

        hostsContent += `\n${this.startMarker}\n${this.endMarker}\n`;

        fs.writeFileSync(hostsFile, hostsContent, 'utf-8');
    }

    changeHosts(host, revert) {
        const hostsFile = getHostsFilePath();
        let hostsContent = fs.readFileSync(hostsFile, 'utf-8');

        const startPos = hostsContent.indexOf(this.startMarker) + this.startMarker.length;
        const endPos = hostsContent.indexOf(this.endMarker);

        if (startPos > 0 && endPos > 0) {
            let sectionContent = hostsContent.substring(startPos, endPos);
            if (host === "funtime.su" || host === "mc.funtime.su") host = "connect.funtime.su";
            if (revert) {
                sectionContent = sectionContent.replace(`\n127.0.0.1 ${host}`, '');
            } else {
                sectionContent = `\n127.0.0.1 ${host}` + sectionContent;
            }

            hostsContent = hostsContent.substring(0, startPos) + sectionContent + hostsContent.substring(endPos);
            fs.writeFileSync(hostsFile, hostsContent, 'utf-8');
        }
    }

    clear() {
        const hostsFile = getHostsFilePath();
        let hostsContent = fs.readFileSync(hostsFile, 'utf-8');

        const startPos = hostsContent.indexOf(this.startMarker);
        const endPos = hostsContent.indexOf(this.endMarker) + this.endMarker.length;

        if (startPos > 0 && endPos > 0) {
            hostsContent = hostsContent.substring(0, startPos) + hostsContent.substring(endPos);
            fs.writeFileSync(hostsFile, hostsContent, 'utf-8');
        }
    }
}

function getHostsFilePath() {
    return os.platform() === 'win32' ? 'C:\\Windows\\System32\\drivers\\etc\\hosts' : '/etc/hosts';
}

module.exports = {
    HostManager
};
