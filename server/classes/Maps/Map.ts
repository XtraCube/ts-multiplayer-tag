import type { MapObject } from "./MapObject";

class Map {
    private name: string;
    private width: number;
    private height: number;
    private objects: MapObject[];

    constructor(name: string, width: number, height: number, objects: MapObject[]) {
        this.name = name;
        this.width = width;
        this.height = height;
        this.objects = objects;
    }

    getName(): string {
        return this.name;
    }

    getObjects(): MapObject[] {
        return this.objects;
    }

    getDimensions(): { width: number, height: number } {
        return { width: this.width, height: this.height };
    }
}

export { Map }