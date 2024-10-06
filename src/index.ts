import { Elysia, t } from 'elysia';
import { staticPlugin } from '@elysiajs/static'
import { Player }  from "./classes/Player";
import { GameState } from './classes/GameState';
import { World, Vec2, Circle, } from 'planck';
import { MapLoader } from './classes/Maps/MapLoader.ts';
import nanotimer from 'nanotimer';

// DEFINE SERVER CONSTANTS
const PORT = Number(process.env['PORT'] ?? 3001);

// tick rate only affects the update rate of the server
// not the physics engine
const TICK_RATE = 60;

// define game bound information
const WIDTH = 10;
const HEIGHT = WIDTH * 9 / 16;

// define player information
const SPEED = 75;
const RADIUS = 2*WIDTH/100;
const MASS = 1;
const FRICTION = 0.15;
const DAMPING = 8;

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

let map = MapLoader.loadMapFromJson(require('./maps/gray.json'), new Vec2(WIDTH, HEIGHT), world);


world.on('begin-contact', (contact) => {
    let fixtureA = contact.getFixtureA();
    let fixtureB = contact.getFixtureB();
    let bodyA = fixtureA.getBody();
    let bodyB = fixtureB.getBody();

    let player1 = bodyA.getUserData() as Player;
    let player2 = bodyB.getUserData() as Player;

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
        var mapDimensions = map.getDimensions();
        ws.send({ type: 'config', data: { radius: RADIUS, tickRate: TICK_RATE, width: mapDimensions.width, height: mapDimensions.height } });
        ws.send({ type: 'map', data: map.getObjects().map(obj => obj.serialize()) })
        let body = world.createBody({
            type: 'dynamic',
            position: Vec2(Math.random()*WIDTH, Math.random()*HEIGHT),
            fixedRotation: true,
            linearDamping: DAMPING,
            allowSleep: false
        });
        body.createFixture({
            shape: new Circle(RADIUS),
            friction: FRICTION,
            restitution: 0,
        });
        body.setMassData({
            mass: MASS,
            center: Vec2(0, 0),
            I: 1
        });

        let scale = Vec2(mapDimensions.width/WIDTH, mapDimensions.height/HEIGHT)
        const player = new Player(ws.id, body, scale);
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
        player.body.applyForceToCenter(player.force, true);
    });
    world.step(1 / 60, 10, 8);
}

var timer = new nanotimer();
timer.setInterval(step, '', '16.66667m');