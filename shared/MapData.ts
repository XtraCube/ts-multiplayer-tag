import { MapObjectData } from "./MapObjectData";

export interface MapData {
    name: string;
    width: number;
    height: number;
    wallWidth: number;
    objects: Array<MapObjectData>;
}