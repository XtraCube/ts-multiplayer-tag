import { Player } from "./Player.ts";
import { CustomTimer } from "./CustomTimer.ts";
import { randomItem } from "../utils.ts";

class GameState {
    private _state: "lobby" | "game" | "end";
    private _message: string;
    private _startTimer: CustomTimer;
    private _endTimer: CustomTimer;
    private _gameTimer: CustomTimer;
    private _minPlayers: number = 2;
    private _winner: string;
    public players: Map<string, Player>;

    constructor() {
        this.players = new Map();
        this._state = "lobby";
        this._winner = "none";
        this._message = "Waiting for players to join..."
        this._startTimer = new CustomTimer(this.startGame.bind(this), 5000);
        this._endTimer = new CustomTimer(this.goToLobby.bind(this), 5000);
        this._gameTimer = new CustomTimer(this.eliminatePlayer.bind(this), 10000);
    }

    startGame() {
        this._state = "game";
        this._message = "";
        this.selectTagger();

        this._gameTimer.start();
    }

    serialize() {
        return {
            state: this._state,
            message: this._message,
            winner: this._winner
        };
    }

    update() {
        if (this._state === "lobby") {
            if (this.players.size < this._minPlayers) {
                this._message = `Waiting for ${ this._minPlayers - this.players.size } player(s) to join...`;
            } else {
                this._message = `Game starting in ${Math.ceil(this._startTimer.remaining/1000)} seconds`;
            }
        } else if (this._state === "game") {
            this._message = "Next elimination in " + Math.ceil(this._gameTimer.remaining/1000) + " seconds";
        }
    }
    
    eliminatePlayer() {
        const players = Array.from(this.players.values());

        const tagger = players.find(player => player.tagger);
        if (!tagger) {
            this.resetGame();
            return;
        }

        tagger.tagger = false;
        tagger.eliminated = true;

        var winner = this.checkWin();
        if (winner){
            this.resetGame(winner.id);
            return;
        }

        if (this.selectTagger()) {
            this._gameTimer.start();
        }

    }

    goToLobby() {
        this._state = "lobby";
        this._winner = "none";
        if (this.players.size >= this._minPlayers) {
            this._startTimer.start();
        }
    }

    resetGame(winner: string | undefined = undefined) {
        this._gameTimer.stop();

        this._state = "end";
        this._message = "Game over!";
        this._winner = winner ? winner : "none";

        this.players.forEach(player => {
            player.tagger = player.eliminated = false;
        });

        this._endTimer.start();
    }

    checkWin() {
        const players = Array.from(this.players.values());
        const nonEliminatedPlayers = players.filter(player => !player.eliminated);
        if (nonEliminatedPlayers.length === 1) {
            return nonEliminatedPlayers[0];
        }
        return undefined;
    }

    selectTagger() {
        const players = Array.from(this.players.values()).filter(player => !player.eliminated && !player.tagger);
        const random = randomItem(players);
        if (!random) return undefined;
        random.tagger = true;
        return random;
    }

    addPlayer(socketId: string, player: Player) {
        this.players.set(socketId, player);
        if (this._state === "lobby" && this.players.size >= this._minPlayers) {
            this._startTimer.start();
        }
    }

    removePlayer(socketId: string) {
        var player = this.players.get(socketId);
        this.players.delete(socketId);

        if (player?.tagger) {
            this.selectTagger();
        }
        
        switch (this._state) {
            case "lobby":
                if (this.players.size < this._minPlayers) {
                    this._startTimer.stop();
                }
                break;
            case "game":
                if (Array.from(this.players.values()).filter(player => !player.eliminated).length < 2) {
                    this.resetGame();
                }
                break;
        }
    }

    getPlayer(socketId: string): Player | undefined {
        return this.players.get(socketId);
    }

    getPlayerByBody(bodyId: number): Player | undefined {
        return Array.from(this.players.values()).find(player => player.body.id === bodyId);
    }

}

export { GameState };