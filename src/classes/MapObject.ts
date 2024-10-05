import { Body } from 'planck';

abstract class MapObject {
    color: string;
    strokeColor: string;
    strokeWidth: number;

    abstract body: Body;

    constructor(color: string, strokeColor: string = "#000000", strokeWidth: number = 0) {
        this.color = color;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
    }
    
    abstract serialize(): any;
}

export { MapObject }