const mc = require('minecraft-protocol');

const { Module } = require("../module");

class FreeCam extends Module {
    constructor(logger, clientManager) {
        super("FreeCam", "H", logger);
        this.clientManager = clientManager;
    }

    handleClientPacket(meta, data) {
        meta.cancelled = true;
    }

    toggle() {
        super.toggle();

        const primaryClient = this.clientManager.primaryClient;
        if (primaryClient && primaryClient.state === mc.states.PLAY) {
            if (this.enabled && 3 !== primaryClient.gameMode) primaryClient.previousGameMode = primaryClient.gameMode;
            primaryClient.gameMode = this.enabled ? 3 : primaryClient.previousGameMode;

            primaryClient.write('game_state_change', {
                reason: 3,
                gameMode: primaryClient.gameMode
            });
        }
    }
}

module.exports = { FreeCam };
