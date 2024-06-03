import { Player } from "./shared/Player";
import { CustomTimer } from "./Timer";

class GameState {
    private state: "lobby" | "game";
    private message: string;
    private timer: CustomTimer;
    public players: Map<string, Player>;

    constructor() {
        this.players = new Map();
        this.state = "lobby";
        this.message = "Waiting for players to join..."
        this.timer = new CustomTimer(()=>{}, 5000);
    }

    serialize() {
        return {
            state: this.state,
            message: this.message
        };
    }

    update() {
        if (this.state === "lobby") {
            if (this.players.size < 2) {
                this.message = "Waiting for players to join...";
            } else {
                this.message = "Game starting in " + this.timer.getTimeLeft() + " seconds";
            }
        } else if (this.state === "game") {
            this.message = "";
        }
    }

    addPlayer(socketId: string, player: Player) {
        this.players.set(socketId, player);
        if (this.state === "lobby" && this.players.size >= 2) {
            this.timer.reset();
            this.timer.start();
        }
    }

    removePlayer(socketId: string) {
        var success = this.players.delete(socketId);
        if (success && this.state === "lobby") {
            this.timer.reset();
        }
    }

    getPlayer(socketId: string): Player | undefined {
        return this.players.get(socketId);
    }
    
    eliminatePlayer() {
        const players = Array.from(this.players.values());
        const nonEliminatedPlayers = players.filter(player => !player.eliminated);
        if (nonEliminatedPlayers.length > 1) {
            nonEliminatedPlayers[Math.random()*nonEliminatedPlayers.length].eliminated = true;
        }
    }

}

export { GameState };