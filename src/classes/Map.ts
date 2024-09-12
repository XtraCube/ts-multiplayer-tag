import type { MapObject } from "./MapObject";

class Map {
    private name: string;
    private objects: MapObject[];

    constructor(name: string, objects: MapObject[]) {
        this.name = name;
        this.objects = objects;
    }

    getName(): string {
        return this.name;
    }

    getObjects(): MapObject[] {
        return this.objects;
    }
}

export { Map }