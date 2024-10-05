import { Body, BoxShape, Vec2, World } from 'planck';
import { MapObject } from './MapObject';

class RectangleMapObject extends MapObject {
    body: Body;
    width: number;
    height: number;
    
    constructor(world: World, width: number, height: number, position: Vec2, angle: number, color: string, strokeColor: string = "#000000", strokeWidth: number = 0) {
        super(color, strokeColor, strokeWidth);
        this.width = width;
        this.height = height;

        var shape = new BoxShape(width/2, height/2);

        var body = world.createBody({
            type: 'static',
            position: position,
            angle: angle
        });
        body.createFixture(shape,{
            friction: 0,
            restitution: 0,
            density: 1
        });

        this.body = body;
    }
    
    serialize() {
        return {
            type: 'rectangle',
            x: this.body.getPosition().x * (1920/16),
            y: this.body.getPosition().y * (1080/9),
            angle: this.body.getAngle(),
            width: this.width * (1920/16),
            height: this.height * (1080/9),
            color: this.color,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth
        };
    }
}

export { RectangleMapObject };