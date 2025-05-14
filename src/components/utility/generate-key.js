function generateKey(keyLength = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '0x';
    for (let i = 0; i < keyLength; i++) {
        if (i % 3 === 0 && i !== 0) {
            key += '0x';
        }
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

module.exports = {
    generateKey
}