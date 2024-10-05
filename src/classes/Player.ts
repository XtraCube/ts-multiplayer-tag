import { Vec2, Body } from 'planck';
import { CustomTimer } from './CustomTimer';

class Player {

    readonly id: string;
    readonly body: Body;

    public force: Vec2;
    public wins: number;

    public name: string = "";
    private _color: string;
    private _tagTimer: CustomTimer;
    private _tagger: boolean;
    private _eliminated: boolean;
    private _mapScale: Vec2;

    constructor(id: string, body: Body, mapScale: Vec2) {
        this.id = id;
        this.body = body;
        this.force = Vec2(0, 0);
        // 16^6 = 16777216 aka max hexadecimal value
        this._color = `${Math.floor(Math.random()*16777215).toString(16)}`;
        this._tagger = false;
        this._eliminated = false;
        this._tagTimer = new CustomTimer(()=>{}, 1000);
        this._mapScale = mapScale;
        this.wins = 0;
        this.body.setUserData(this);
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
        var fixture = this.body.getFixtureList();
        fixture?.setFilterGroupIndex(value ? 1 : 2);
        fixture?.setFilterCategoryBits(value ? 2 : 1);
        fixture?.setFilterMaskBits(value ? 2 : 1);
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
                x: this.body.getPosition().x * this._mapScale.x,
                y: this.body.getPosition().y * this._mapScale.y,
            },
            tagger: this.tagger,
            eliminated: this.eliminated
        };
    }
}

export { Player }