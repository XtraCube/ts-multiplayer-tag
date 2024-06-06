import 'matter-js';

class MapObject {
    color: string;
    body: Matter.Body;
    strokeColor: string;
    strokeWidth: number;

    constructor(color: string, body: Matter.Body, strokeColor: string = "#000000", strokeWidth: number = 0) {
        this.color = color;
        this.body = body;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
    }
    
    serialize() {
        return {
            color: this.color,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            x: this.body.position.x,
            y: this.body.position.y,
            angle: this.body.angle,
            width: this.body.bounds.max.x - this.body.bounds.min.x,
            height: this.body.bounds.max.y - this.body.bounds.min.y,
        }
    }
}

export { MapObject }