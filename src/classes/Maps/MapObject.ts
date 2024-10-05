import { ColliderDesc, World } from '@dimforge/rapier2d-compat';

class MapObject {
    colliderDesc: ColliderDesc;
    color: string;
    strokeColor: string;
    strokeWidth: number;

    constructor(world: World, colliderDesc: ColliderDesc, color: string, strokeColor: string = "#000000", strokeWidth: number = 0) {
        this.color = color;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
        this.colliderDesc = colliderDesc;

        world.createCollider(this.colliderDesc);
    }
    
    serialize() {
        return {
            type: 'rectangle',
            colliderDesc: this.colliderDesc,
            color: this.color,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth
        };
    }
}

export { MapObject }