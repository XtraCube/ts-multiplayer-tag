import 'matter-js';

class MapObject {
    color: string;
    body: Matter.Body;

    constructor(color: string, body: Matter.Body) {
        this.color = color;
        this.body = body;
    }
    
    serialize() {
        return {
            color: this.color,
            x: this.body.position.x,
            y: this.body.position.y,
            angle: this.body.angle,
            width: this.body.bounds.max.x - this.body.bounds.min.x,
            height: this.body.bounds.max.y - this.body.bounds.min.y,
        }
    }
}

export { MapObject }