import 'matter-js';
import { CustomTimer } from '../CustomTimer';

class Player {
    id: string;
    body: Matter.Body;
    color: string;
    tagger: boolean;
    eliminated: boolean;
    force: Matter.Vector;
    tagTimer: CustomTimer;

    constructor(id: string, body: Matter.Body, tagger: boolean, eliminated: boolean) {
        this.id = id;
        this.body = body;
        this.force = { x:0, y:0 };
        // 16^6 = 16777216 aka max hexadecimal value
        this.color = `${Math.floor(Math.random()*16777215).toString(16)}`;
        this.tagger = tagger;
        this.eliminated = eliminated;
        this.tagTimer = new CustomTimer(()=>{}, 1000);
    }

    canTag(){
        return this.tagTimer.getTimeLeft() <= 0;
    }

    serialize() {
        return {
            id: this.id,
            color: this.color,
            position: this.body.position,
            tagger: this.tagger,
            eliminated: this.eliminated,
            tagAlpha: (this.tagTimer.totalTime-Math.max(0,this.tagTimer.getTimeLeft()))/this.tagTimer.totalTime
        };
    }
}

export { Player }