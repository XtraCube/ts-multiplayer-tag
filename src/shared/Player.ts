import 'matter-js';
import { CustomTimer } from '../CustomTimer';

class Player {

    readonly id: string;
    readonly body: Matter.Body;

    public force: Matter.Vector;

    private _color: string;
    private _tagTimer: CustomTimer;
    private _tagger: boolean;
    private _eliminated: boolean;

    constructor(id: string, body: Matter.Body) {
        this.id = id;
        this.body = body;
        this.force = { x:0, y:0 };
        // 16^6 = 16777216 aka max hexadecimal value
        this._color = `${Math.floor(Math.random()*16777215).toString(16)}`;
        this._tagger = false;
        this._eliminated = false;
        this._tagTimer = new CustomTimer(()=>{}, 1000);
    }

    public get tagger() : boolean {
        return this._tagger;
    }

    public set tagger(value: boolean) {
        this._tagger = value;
        if (value) {
            this._tagTimer.start();
        }
    }

    public get eliminated() : boolean {
        return this._eliminated;
    }

    public set eliminated(value: boolean) {
        this._eliminated = value;
        this.body.collisionFilter.category = value ? 0x0002 : 0x0001;
    }

    public canTag() : boolean {
        return this._tagTimer.remaining <= 0;
    }

    serialize() {
        return {
            id: this.id,
            color: this._color,
            position: this.body.position,
            tagger: this.tagger,
            eliminated: this.eliminated,
            tagAlpha: this.tagger ? (this._tagTimer.elapsed / this._tagTimer.totalTime): 0
        };
    }
}

export { Player }