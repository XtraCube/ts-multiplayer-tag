import { Body, Vec2 } from 'planck';

abstract class MapObject {
    color: string;
    strokeColor: string;
    strokeWidth: number;
    mapScale: Vec2;

    abstract body: Body;

    constructor(mapScale: Vec2, color: string, strokeColor: string = "#000000", strokeWidth: number = 0) {
        this.mapScale = mapScale;
        this.color = color;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
    }
    
    abstract serialize(): any;
}

export { MapObject }