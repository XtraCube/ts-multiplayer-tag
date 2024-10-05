import { Elysia, t } from 'elysia';
import { staticPlugin } from '@elysiajs/static'
import { Player }  from "./classes/Player";
import { MapObject } from './classes/MapObject';
import { RectangleMapObject } from './classes/RectangleMapObject.ts';
import { GameState } from './classes/GameState';
import { World, Vec2, Circle, } from 'planck';

// DEFINE SERVER CONSTANTS
const PORT = Number(process.env['PORT'] ?? 3000);

// tick rate only affects the update rate of the server
// not the physics engine
const TICK_RATE = 30;

// define game bound information
const WIDTH = 16;
const HEIGHT = 9;

// define player information
const SPEED = 150;
const RADIUS = .3;
const MASS = 1;
const FRICTION = 0.15;

// define server config to network to clients
const SERVER_CONFIG = {
    tickRate: TICK_RATE,
    speed: SPEED,
    radius: RADIUS,
    mass: MASS,
    friction: FRICTION,
}


// message schema for all websocket messages
const MESSAGE_SCHEMA = t.Object({
    type: t.String(),
    data: t.Any()
});

const gameState = new GameState();

const world = new World({
    gravity: Vec2(0, 0),
    allowSleep: false,

});

const mapObjects: MapObject[] = [
    // outer walls
    new RectangleMapObject(world, WIDTH, .3, new Vec2(WIDTH/2, 0), 0, 'gray'), // top
    new RectangleMapObject(world, WIDTH, .3, new Vec2(WIDTH/2, HEIGHT), 0, 'gray'), // bottom
    new RectangleMapObject(world, .3, HEIGHT, new Vec2(0, HEIGHT/2), 0, 'gray'), // left
    new RectangleMapObject(world, .3, HEIGHT, new Vec2(WIDTH, HEIGHT/2), 0, 'gray'), // right

    
];

mapObjects.forEach(obj => {
    obj.body.getFixtureList()?.setFilterGroupIndex(1);
});

world.on('begin-contact', (contact) => {
    const fixtureA = contact.getFixtureA();
    const fixtureB = contact.getFixtureB();
    const bodyA = fixtureA.getBody();
    const bodyB = fixtureB.getBody();

    const player1 = bodyA.getUserData() as Player;
    const player2 = bodyB.getUserData() as Player;

    if (player1?.eliminated || player2?.eliminated) return;

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

const app = new Elysia()
.use(staticPlugin({assets: 'src/public', prefix:'', noCache: true}))
.ws('/ws', {
    body: MESSAGE_SCHEMA,
    open(ws) {
        ws.subscribe("game");
        ws.send({ type: 'init', data: ws.id });
        ws.send({ type: 'config', data: SERVER_CONFIG });
        ws.send({ type: 'map', data: mapObjects.map(obj => obj.serialize()) })
        const body = world.createBody({
            type: 'dynamic',
            position: Vec2(Math.random()*WIDTH, Math.random()*HEIGHT),
            fixedRotation: true,
            linearDamping: 7,
            angularDamping: 0.1,
            allowSleep: false
        });
        body.createFixture({
            shape: new Circle(RADIUS),
            friction: FRICTION,
            density: 1,
            restitution: 0,
        });
        body.setMassData({
            mass: MASS,
            center: Vec2(0, 0),
            I: 1
        });

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
                var force = Vec2(data.x, data.y);
                force.normalize();
                force.mul(SPEED);
                player.force = force;
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
            world.destroyBody(body);
        }
        gameState.removePlayer(ws.id);
        app.server?.publish("game", JSON.stringify({ type: 'leave', data: ws.id }));
    }
})
.listen(PORT);

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
        player.body.applyForce(player.force, player.body.getWorldCenter(), true);
    });

    world.step(1 / 60, 10, 8);
}

setInterval(step, 1000 / 60);