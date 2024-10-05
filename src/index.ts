import { Elysia, t } from 'elysia';
import { staticPlugin } from '@elysiajs/static'
import { Player }  from "./classes/Player";
import { GameState } from './classes/GameState';
import { MapLoader } from './classes/Maps/MapLoader.ts';
import Rapier from "@dimforge/rapier2d-compat";

Rapier.init().then(() => {

// DEFINE SERVER CONSTANTS
const PORT = Number(process.env['PORT'] ?? 3001);

// tick rate only affects the update rate of the server
// not the physics engine
const TICK_RATE = 60;

// define player information
const SPEED = 1;
const RADIUS = .32;
const MASS = 1;
const FRICTION = 0.15;

// message schema for all websocket messages
const MESSAGE_SCHEMA = t.Object({
    type: t.String(),
    data: t.Any()
});

const gameState = new GameState();

const world = new Rapier.World({x: 0, y: 0});

const map = MapLoader.loadMapFromJson(require('./maps/gray.json'), world);

const app = new Elysia()
.use(staticPlugin({assets: 'src/public', prefix:'', noCache: true}))
.ws('/ws', {
    body: MESSAGE_SCHEMA,
    open(ws) {
        ws.subscribe("game");
        ws.send({ type: 'init', data: ws.id });
        var mapDimensions = map.getDimensions();
        ws.send({ type: 'config', data: { radius: RADIUS, tickRate: TICK_RATE, width: mapDimensions.width, height: mapDimensions.height } });
        ws.send({ type: 'map', data: map.getObjects().map(obj => obj.serialize()) })


        const bodyDesc = Rapier.RigidBodyDesc.dynamic()
        .setTranslation(Math.random()*10, Math.random()*10)
        .setLinearDamping(0.1);

        const body = world.createRigidBody(bodyDesc);

        const colliderDesc = Rapier.ColliderDesc.ball(RADIUS)
        .setMass(MASS)
        .setFriction(FRICTION)
        .setActiveEvents(Rapier.ActiveEvents.COLLISION_EVENTS);

        world.createCollider(colliderDesc, body);

        const player = new Player(ws.id, body);
        gameState.addPlayer(ws.id, player);
    },
    message(ws, { type, data }) {
        switch (type) {
            case 'ping':
                ws.send({ type: 'pong', data: data });
                break;

            case 'update':
                var player = gameState.getPlayer(ws.id);
                if (!player) return;
                var force = new Rapier.Vector2(data.x, data.y);
                player.force = multiply(normalize(force), SPEED);
                break;
            
            case 'chat':
                data = data.trim().substring(0, 200);
                app.server?.publish("game", JSON.stringify({ type: 'chat', data: { id: ws.id, message: data } }));
                break;

            case 'name':
                var player = gameState.getPlayer(ws.id);
                if (!player) return;
                player.name = data.trim().substring(0, 50);
                app.server?.publish("game", JSON.stringify({ type: 'update', data: player.serialize()}));
                break;
        }
    },
    close(ws) {
        var body = gameState.getPlayer(ws.id)?.body;
        if (body) {
            world.removeRigidBody(body);
        }
        gameState.removePlayer(ws.id);
        app.server?.publish("game", JSON.stringify({ type: 'leave', data: ws.id }));
    }
})
.listen(PORT);

function normalize(vector2: Rapier.Vector2) {
    const magnitude = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
    if (magnitude === 0) {
        return new Rapier.Vector2(0, 0);
    }
    return new Rapier.Vector2(vector2.x / magnitude, vector2.y / magnitude);
}

function multiply(vector2: Rapier.Vector2, scalar: number) {
    return new Rapier.Vector2(vector2.x * scalar, vector2.y * scalar);
}

setInterval(() => {
    gameState.update();
    app.server?.publish("game", JSON.stringify({ type: 'state', data: gameState.serialize()}));
    gameState.players.forEach(player => {
        app.server?.publish("game", JSON.stringify({ type: 'update', data: player.serialize()}));
    });
}, 1000 / TICK_RATE);

console.log(`Server is running on ${app.server?.url}`);


function step() {
    gameState.players.forEach(player => {
        player.body.addForce(player.force, true);
    });

    let eventQueue = new Rapier.EventQueue(true);
    world.step(eventQueue);

    eventQueue.drainCollisionEvents((handle1, handle2, started) => {

        if (!started){
            return;
        }

        const player1 = world.getCollider(handle1).parent()?.userData as Player;
        const player2 = world.getCollider(handle2).parent()?.userData as Player;
    
        if (player1?.eliminated || player2?.eliminated){
            return;
        }
    
        if (player1 && player2) {
            if (player1.tagger && player1.canTag() && !player2.tagger) {
                player1.tagger = false;
                player2.tagger = true;
            } else if (player2.tagger && player2.canTag() && !player1.tagger) {
                player2.tagger = false;
                player1.tagger = true;
            }
        }
    });
}

setInterval(step, 1000 / 60);});