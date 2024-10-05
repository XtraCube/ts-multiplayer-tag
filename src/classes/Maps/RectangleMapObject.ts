import { Body, BoxShape, Vec2, World } from 'planck';
import { MapObject } from './MapObject';

class RectangleMapObject extends MapObject {
    body: Body;
    width: number;
    height: number;
    
    constructor(world: World, size: Vec2, position: Vec2, mapScale: Vec2, angle: number, color: string, strokeColor: string = "#000000", strokeWidth: number = 0) {
        super(mapScale, color, strokeColor, strokeWidth);
        this.width = size.x;
        this.height = size.y;

        var shape = new BoxShape(this.width/(2*mapScale.x), this.height/(2*mapScale.y));

        var body = world.createBody({
            type: 'static',
            position: new Vec2(position.x / mapScale.x, position.y / mapScale.y),
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
            x: this.body.getPosition().x * this.mapScale.x,
            y: this.body.getPosition().y * this.mapScale.y,
            angle: this.body.getAngle(),
            width: this.width,
            height: this.height,
            color: this.color,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth
        };
    }
}

export { RectangleMapObject };