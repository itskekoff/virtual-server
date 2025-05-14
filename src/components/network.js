const os = require("os");
const dns = require("dns");

const networkInterfaces = os.networkInterfaces();

function getPrimaryIPv4Address() {
    let reachableAddress = null;

    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];

        for (const iface of interfaces) {
            if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254')) {
                reachableAddress = iface.address;
                return reachableAddress;
            }
        }
    }

    return null;
}

async function getServerIP(host) {
    try {
        const srvRecords = await new Promise((resolve, reject) => {
            dns.resolveSrv('_minecraft._tcp.' + host, (err, addresses) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(addresses);
                }
            });
        });

        if (srvRecords.length === 0) {
            return Promise.reject(new Error(`SRV records for ${host} not found`));
        }
        const srvRecord = srvRecords[0];
        return await new Promise((resolve, reject) => {
            dns.lookup(srvRecord.name, {family: 4}, (err, address, family) => { // family: 4 - для IPv4
                if (err) {
                    reject(err);
                } else {
                    resolve(address);
                }
            });
        });
    } catch (error) {
        return Promise.reject(error);
    }
}

module.exports = {
    getPrimaryIPv4Address,
    getServerIP,
}