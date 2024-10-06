import { MapData } from "../../../shared/MapData";
import { Map } from "./Map";
import { MapObject } from "./MapObject";
import { RectangleMapObject } from "./RectangleMapObject";
import { World, Vec2 } from "planck";

class MapLoader {

    static loadMapFromJson(json: MapData, physicsScale: Vec2, world: World): Map {
        const mapData = json;
        var objects = new Array<MapObject>();
        var mapScale = new Vec2(mapData.width/physicsScale.x, mapData.height/physicsScale.y);

        // create bound objects
        objects.push(new RectangleMapObject(world, new Vec2(mapData.width, mapData.wallWidth), new Vec2(mapData.width/2, 0), mapScale, 0, 'gray')); // top
        objects.push(new RectangleMapObject(world, new Vec2(mapData.width, mapData.wallWidth), new Vec2(mapData.width/2, mapData.height), mapScale, 0, 'gray')); // bottom
        objects.push(new RectangleMapObject(world, new Vec2(mapData.wallWidth, mapData.height), new Vec2(0, mapData.height/2), mapScale, 0, 'gray')); // left
        objects.push(new RectangleMapObject(world, new Vec2(mapData.wallWidth, mapData.height), new Vec2(mapData.width, mapData.height/2), mapScale, 0, 'gray')); // right

        for (var i = 0; i < mapData.objects.length; i++) {
            const objectData = mapData.objects[i];
            if (objectData.type === 'RectangleMapObject') {
                var position = new Vec2(objectData.x, objectData.y);
                var size = new Vec2(objectData.width, objectData.height);

                objects.push(new RectangleMapObject(world, size, position, mapScale, objectData.rotation, objectData.fillColor, objectData.strokeColor, objectData.strokeWidth));
            }
        }

        const map = new Map(mapData.name, mapData.width, mapData.height, objects);
        return map;
    }
}

export { MapLoader };