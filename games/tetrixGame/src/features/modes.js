import { Game } from "../game.js";
import gamemodeJSON from "../data/gamemodes.json" with { type: "json" };
import { gameoverResultText, gameoverText, resultSuffix, statDecimals } from "../data/data.js";
import { reverseLookup } from "../display/renderer.js";

export class Modes {
    modeJSON;
    customSettings;

    /**
     * @param {Game} game 
     */
    constructor(game) {
        this.game = game;
    }

    checkFinished() {
        const goals = this.game.settings.game;
        const stats = this.game.stats;

        // hardcoded objectives
        let combobreak = this.game.stats.combo == -1 && stats.clearlines >= 1 && this.modeJSON.target == 'combobreak';
        let gameend = this.game.ended && this.modeJSON.target == 'gameEnd';

        let stat = stats[this.modeJSON.goalStat]
        let goal = goals[this.modeJSON.target]
        let result = stats[this.modeJSON.result]

        if (stat >= goal || combobreak || gameend) {
            if(this.game.settings.game.gamemode != "race" ) result = Math.round(result * 1000) / 1000
            stat = Math.round(stat * 1000) / 1000
            this.game.profilestats.setPB(result);
            const text = this.statText(this.modeJSON.goalStat, stat, this.modeJSON.result, result)
            const suffix = resultSuffix[this.modeJSON.result]
            this.game.endGame(result + suffix, text);
        }

        if (this.game.settings.game.gamemode == 'ultra') { // changes ultra sidebar
            stat = stats.score;
            goal = undefined
        }
        this.setObjectiveText(this.modeJSON.goalstat, stat, goal);
    }

    statText(stat, value, result, resultvalue) {
        const front = gameoverText[stat].replace("_", value);
        const back = gameoverResultText[result].replace("_", resultvalue);
        return front + back;
    }

    setObjectiveText(stat, statValue, resultValue) {
        if (statValue != undefined) statValue = statValue.toFixed(reverseLookup(statDecimals)[stat])
        let modetext = (statValue == undefined ? '' : statValue)
            + (resultValue == undefined ? '' : `/${resultValue}`)
        this.game.pixi.texts.objectiveText.sprite.text = modetext;
    }

    loadModes() {
        let currentGamemode = this.game.settings.game.gamemode;
        if (typeof currentGamemode == 'number') { // backwards compatibility
            this.game.settings.game.gamemode = 'sprint'
            currentGamemode = 'sprint'
        }
        this.setGamemode(currentGamemode);

        this.game.pixi.texts.objectiveNameText.sprite.text = this.modeJSON.objectiveText.toUpperCase();
        this.game.pixi.toggleEditButton(this.game.settings.game.gamemode == 'custom');
    }

    setGamemode(mode) {
        this.game.settings.game.gamemode = mode;
        const competitive = this.game.settings.game.competitiveMode;
        const custom = JSON.parse(localStorage.getItem('customGame'));

        if (competitive) {
            if (custom == null) {
                localStorage.setItem('customGame', JSON.stringify(this.game.settings.game));
                this.game.menuactions.saveSettings();
            }
            this.modeJSON = this.getGamemodeJSON(mode);
            this.game.settings.game = { ...this.game.settings.game, ...this.modeJSON.settings };
        } else {
            if (custom != null) {
                this.game.settings.game = custom;
                this.game.settings.game.competitiveMode = false;
                localStorage.removeItem('customGame');
                this.game.menuactions.saveSettings();
            }
            this.modeJSON = this.getGamemodeJSON(mode);
        }
        this.toggleDialogState(competitive);
    }

    toggleDialogState(enabled) {
        document.getElementById('game').disabled = enabled;
        document.getElementById('goals').disabled = enabled;
    }

    getGamemodeJSON(mode) {
        const modeinfo = gamemodeJSON[mode];
        const allinfo = gamemodeJSON["*"];

        let info = {}
        Object.keys(allinfo).forEach(key => info[key] = modeinfo[key] ?? allinfo[key]);
        info.settings = { ...allinfo.settings, ...modeinfo.settings }

        return info;
    }

    getGamemodeNames() {
        return Object.keys(gamemodeJSON).filter(key => key != "*");
    }

    getSuffix(mode) {
        const modeinfo = gamemodeJSON[mode] ?? {};
        return resultSuffix[modeinfo.result] ?? " (legacy)";
    }

    diggerAddGarbage(removed) {
        if (this.game.stats.getRemainingGarbage() > 10 && this.game.settings.game.gamemode == "digger")
            this.game.mechanics.addGarbage(removed);
    }

    set4WCols(start) {
        if (this.game.settings.game.gamemode == 'combo') this.game.board.setComboBoard(start);

    }

    startSurvival() {
        const time = (60 * 1000) / this.game.settings.game.survivalRate;
        if (this.game.settings.game.gamemode == 'survival')
            this.game.survivalTimer = setInterval(() => this.game.mechanics.addGarbage(1), time);
    }

    diggerGarbageSet(start) {
        const rows =
            this.game.settings.game.requiredGarbage < 10
                ? this.game.settings.game.requiredGarbage
                : 10;
        if (this.game.stats.getRemainingGarbage() > 0 && start && this.game.settings.game.gamemode == 'digger')
            this.game.mechanics.addGarbage(rows);
    }
}