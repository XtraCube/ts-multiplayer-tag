import { Body, Vec2 } from 'planck';

abstract class MapObject {
    color: string;
    strokeColor: string;
    strokeWidth: number;
    planckScale: Vec2;

    abstract body: Body;

    constructor(planckScale: Vec2, color: string, strokeColor: string = "#000000", strokeWidth: number = 0) {
        this.planckScale = planckScale;
        this.color = color;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
    }
    
    abstract serialize(): any;
}

export { MapObject }