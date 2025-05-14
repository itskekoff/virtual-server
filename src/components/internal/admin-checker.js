const { exec } = require('child_process');

async function testFltmc() {
    return new Promise((resolve) => {
        exec('fltmc', (error) => {
            resolve(!error);
        });
    });
}

async function isAdmin() {
    if (process.platform !== 'win32') {
        return false;
    }

    return new Promise((resolve) => {
        const systemDrive = process.env.SYSTEMDRIVE || 'C:';
        exec(`fsutil dirty query ${systemDrive}`, (error) => {
            if (!error) {
                resolve(true);
            } else if (error.code === 'ENOENT') {
                testFltmc().then(resolve);
            } else {
                resolve(false);
            }
        });
    });
}

module.exports = { isAdmin };
