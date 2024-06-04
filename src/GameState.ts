import { Player } from "./shared/Player";
import { CustomTimer } from "./CustomTimer";
import { randomItem } from "./utils.ts";

class GameState {
    private state: "lobby" | "game";
    private message: string;
    private startTimer: CustomTimer;
    private gameTimer: CustomTimer;
    private minPlayers: number = 4;
    public players: Map<string, Player>;

    constructor() {
        this.players = new Map();
        this.state = "lobby";
        this.message = "Waiting for players to join..."
        this.startTimer = new CustomTimer(this.startGame.bind(this), 5000);
        this.gameTimer = new CustomTimer(this.eliminatePlayer.bind(this), 10000);
    }

    startGame() {
        this.state = "game";
        this.message = "";

        randomItem(Array.from(this.players.values())).tagger = true;

        this.gameTimer.start();
    }

    serialize() {
        return {
            state: this.state,
            message: this.message
        };
    }

    update() {
        if (this.state === "lobby") {
            if (this.players.size < this.minPlayers) {
                this.message = `Waiting for ${ this.minPlayers - this.players.size } player(s) to join...`;
            } else {
                this.message = `Game starting in ${Math.ceil(this.startTimer.getTimeLeft()/1000)} seconds`;
            }
        } else if (this.state === "game") {
            this.message = "Next elimination in " + Math.ceil(this.gameTimer.getTimeLeft()/1000) + " seconds";
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
        tagger.body.isSensor = true;

        if (this.checkWin()){
            this.resetGame();
            return;
        }

        const nonEliminatedPlayers = players.filter(player => !player.eliminated);
        if (nonEliminatedPlayers.length > 1) {
            var random = randomItem(nonEliminatedPlayers);
            random.tagger = true;
            random.tagTimer.start();
            this.gameTimer.start();
        }

    }

    resetGame() {
        this.gameTimer.stop();

        this.state = "lobby";

        this.players.forEach(player => {
            player.tagger = player.eliminated = player.body.isSensor = false;
        });

        this.startTimer.start();
    }

    checkWin() {
        const players = Array.from(this.players.values());
        const nonEliminatedPlayers = players.filter(player => !player.eliminated);
        if (nonEliminatedPlayers.length === 1) {
            return nonEliminatedPlayers[0];
        }
        return undefined;
    }

    addPlayer(socketId: string, player: Player) {
        this.players.set(socketId, player);
        if (this.state === "lobby" && this.players.size >= this.minPlayers) {
            this.startTimer.start();
        }
    }

    removePlayer(socketId: string) {
        var player = this.players.get(socketId);
        if (player?.tagger) {
            this.resetGame();
        }

        var success = this.players.delete(socketId);
        if (success && this.state === "lobby") {
            if (this.players.size < this.minPlayers) {
                this.startTimer.stop();
            }
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