const os = require('os');
const crypto = require('crypto');

const {machineIdSync} = require('node-machine-id');

const getSystemInfo = () => {
    const cpu = os.cpus()[0].model;
    const platform = os.platform();
    const arch = os.arch();
    const hostname = os.hostname();
    const machineId = machineIdSync();

    return `${cpu}-${platform}-${arch}-${hostname}-${machineId}`;
};

const createHWID = () => {
    return crypto.createHash('sha256').update(getSystemInfo()).digest('hex').slice(0, 24);
};

module.exports = {
    generateHWID: createHWID
}