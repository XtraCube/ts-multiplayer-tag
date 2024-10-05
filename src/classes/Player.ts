import { Vector2, RigidBody } from '@dimforge/rapier2d-compat';
import { CustomTimer } from './CustomTimer';

class Player {

    readonly id: string;
    readonly body: RigidBody;

    public force: Vector2;
    public wins: number;

    public name: string = "";
    private _color: string;
    private _tagTimer: CustomTimer;
    private _tagger: boolean;
    private _eliminated: boolean;

    constructor(id: string, body: RigidBody) {
        this.id = id;
        this.body = body;
        this.force = new Vector2(0, 0);
        // 16^6 = 16777216 aka max hexadecimal value
        this._color = `${Math.floor(Math.random()*16777215).toString(16)}`;
        this._tagger = false;
        this._eliminated = false;
        this._tagTimer = new CustomTimer(()=>{}, 1000);
        this.wins = 0;
        this.body.userData = this;
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
        var collider = this.body.collider(0);
        collider?.setCollisionGroups(value ? 1 : 2);
    }

    public canTag() : boolean {
        return this._tagTimer.remaining <= 0;
    }

    serialize() {
        return {
            id: this.id,
            name: this.name,
            color: this._color,
            position: {
                x: this.body.translation().x * 192,
                y: this.body.translation().y * 108,
            },
            tagger: this.tagger,
            eliminated: this.eliminated
        };
    }
}

export { Player }