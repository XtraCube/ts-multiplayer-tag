import { Map } from "./Map";
import { MapObject } from "./MapObject";
import { World, Vector2, ColliderDesc } from "@dimforge/rapier2d-compat";

class MapLoader {

    static loadMapFromJson(json: any, world: World): Map {
        const mapData = json;
        let mapSize = new Vector2(mapData.width, mapData.height);
        let objects = new Array<MapObject>();

        // create bound objects
        objects.push(this.CreateRectObject(world, mapSize, new Vector2(mapData.width, 10), new Vector2(mapData.width/2, 0), 0, 'gray')); // top
        objects.push(this.CreateRectObject(world, mapSize, new Vector2(mapData.width, 10), new Vector2(mapData.width/2, mapData.height), 0, 'gray')); // bottom
        objects.push(this.CreateRectObject(world, mapSize, new Vector2(10, mapData.height), new Vector2(0, mapData.height/2), 0, 'gray')); // left
        objects.push(this.CreateRectObject(world, mapSize, new Vector2(10, mapData.height), new Vector2(mapData.width, mapData.height/2), 0, 'gray')); // right

        for (let i = 0; i < mapData.objects.length; i++) {
            const objectData = mapData.objects[i];
            if (objectData.type === 'rect') {
                let properties = objectData.properties;
                let position = new Vector2(properties.x, properties.y);
                let size = new Vector2(properties.width, properties.height);

                objects.push(this.CreateRectObject(world, mapSize, size, position, properties.rotation, properties.fillColor, properties.strokeColor, properties.strokeWidth));
            }
        }

        const map = new Map(mapData.name, mapData.width, mapData.height, objects);
        return map;
    }

    static CreateRectObject(world: World, mapSize: Vector2, size: Vector2, position: Vector2, rotation: number, fillColor: string, strokeColor: string = "#000000", strokeWidth: number = 0): MapObject {
        let scaledSize = new Vector2(size.x / mapSize.x, size.y / mapSize.y);
        let scaledPosition = new Vector2(position.x / mapSize.x, position.y / mapSize.y);
        let colliderDesc = ColliderDesc.cuboid(scaledSize.x, scaledSize.y).setTranslation(scaledPosition.x, scaledPosition.y).setRotation(rotation);

        return new MapObject(world, colliderDesc, fillColor, strokeColor, strokeWidth);
    }
}

export { MapLoader };