import { Map } from "./Map";
import { MapObject } from "./MapObject";
import { RectangleMapObject } from "./RectangleMapObject";
import { World, Vec2 } from "planck";

class MapLoader {

    static loadMapFromJson(json: any, world: World): Map {
        const mapData = json;
        var objects = new Array<MapObject>();
        var planckScale = new Vec2(16/mapData.width, 9/mapData.height);

        // create bound objects
        objects.push(new RectangleMapObject(world, new Vec2(mapData.width, 10), new Vec2(mapData.width/2, 0), planckScale, 0, 'gray')); // top
        objects.push(new RectangleMapObject(world, new Vec2(mapData.width, 10), new Vec2(mapData.width/2, mapData.height), planckScale, 0, 'gray')); // bottom
        objects.push(new RectangleMapObject(world, new Vec2(10, mapData.height), new Vec2(0, mapData.height/2), planckScale, 0, 'gray')); // left
        objects.push(new RectangleMapObject(world, new Vec2(10, mapData.height), new Vec2(mapData.width, mapData.height/2), planckScale, 0, 'gray')); // right

        for (var i = 0; i < mapData.objects.length; i++) {
            const objectData = mapData.objects[i];
            if (objectData.type === 'RectangleMapObject') {
                var properties = objectData.properties;
                var position = new Vec2(properties.x, properties.y);
                var size = new Vec2(properties.width, properties.height);

                objects.push(new RectangleMapObject(world, size, position, planckScale, properties.rotation, properties.fillColor, properties.strokeColor, properties.strokeWidth));
            }
        }

        const map = new Map(mapData.name, mapData.width, mapData.height, objects);
        return map;
    }
}

export { MapLoader };