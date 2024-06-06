import { Elysia, t } from 'elysia';
import { staticPlugin } from '@elysiajs/static'
import { Player }  from "./classes/Player.js";
import { MapObject } from './classes/MapObject.js';
import { GameState } from './classes/GameState.js';
import { Engine, Events, Runner, Bodies, Body, Composite, Vector } from 'matter-js';

// DEFINE SERVER CONSTANTS
const PORT = Number(process.env['PORT'] ?? 3000);

// tick rate only affects the update rate of the server
// not the physics engine
const TICK_RATE = 20;

// message schema for all websocket messages
const MESSAGE_SCHEMA = t.Object({
    type: t.String(),
    data: t.Any()
});

// define game bound information
const WIDTH = 1920;
const HEIGHT = 1080;

// define player information
const speed = 1;
const radius = 40;
const mass = 50;
const friction = 0.15;

const Movement = {
    Up: 0,
    Down: 1,
    Left: 2,
    Right: 3
};

const gameState = new GameState();

const mapObjects: MapObject[] = [
    new MapObject('#966446', Bodies.rectangle(400, 400, 100, 100,  { isStatic: true }), '#452f21', 10),
    new MapObject('#966446', Bodies.rectangle(1770, 640, 120, 120,  { isStatic: true }), '#452f21', 10),
    new MapObject('#966446', Bodies.rectangle(1300, 350, 150, 150,  { isStatic: true }), '#452f21', 10),
    new MapObject('gray', Bodies.rectangle(1600, 540, 30, 700, { isStatic: true })),
    new MapObject('gray', Bodies.rectangle(850, 300, 30, 300, { isStatic: true })),
    new MapObject('gray', Bodies.rectangle(900, 900, 700, 30, { isStatic: true })),
    new MapObject('gray', Bodies.rectangle(400, 600, 800, 30, { isStatic: true })),
]

const engine = Engine.create({
    enableSleeping: false,
    gravity: { x: 0, y: 0 }        
});

const runner = Runner.create({
    delta: 1000 / 60,
    isFixed: true,
});

Composite.add(engine.world, mapObjects.map(obj => obj.body));

Events.on(engine, "collisionStart", (event) => {
    var pairs = event.pairs;
    pairs.forEach(pair => {
        var player1 = gameState.getPlayerByBody(pair.bodyA.id);
        var player2 = gameState.getPlayerByBody(pair.bodyB.id);
        if (player1?.eliminated || player2?.eliminated) return;

        if (player1 && player2){
            if ( (player1.tagger && player1.canTag()) && !player2.tagger ) {
                player1.tagger = false;
                player2.tagger = true;
            }
            else if ( (player2.tagger && player2.canTag()) && !player1.tagger ) {
                player2.tagger = false;
                player1.tagger = true;
            }
        }
    })    
});

Events.on(runner, "tick", () => {
    gameState.players.forEach(player => {
        Body.applyForce(player.body, player.body.position, player.force);
    });
});

// this solution is decent, but i'd like to find a better one
Events.on(runner, "afterTick", () => {
    gameState.update();
    gameState.players.forEach(player => {
        if (player.body.position.x > WIDTH - radius) {
            Body.setPosition(player.body, { x: WIDTH-radius, y: player.body.position.y });
        }
        else if (player.body.position.x < radius) {
            Body.setPosition(player.body, { x: radius, y: player.body.position.y });
        }
        if (player.body.position.y > HEIGHT - radius) {
            Body.setPosition(player.body, { x: player.body.position.x, y: HEIGHT-radius });
        }
        else if (player.body.position.y < radius) {
            Body.setPosition(player.body, { x: player.body.position.x, y: radius });
        }
    });
});

Runner.run(runner, engine);

const app = new Elysia()
.use(staticPlugin({assets: 'src/public', prefix:'', noCache: true}))
.ws('/ws', {
    body: MESSAGE_SCHEMA,
    open(ws) {
        ws.subscribe("game");
        ws.send({ type: 'config', data: { tickRate: TICK_RATE, radius: radius } });
        ws.send({ type: 'map', data: mapObjects.map(obj => obj.serialize()) })
        const body = Bodies.circle( Math.random()*WIDTH , Math.random()*HEIGHT , radius, {
            frictionAir: friction,
            mass: mass,
            inverseMass: 1 / mass
        });
        const player = new Player(ws.id, body);
        gameState.addPlayer(ws.id, player);

        Composite.add(engine.world, body);
    },
    message(ws, { type, data }) {
        switch (type) {
            case 'ping':
                ws.send({ type: 'pong', data: data });
                break;

            case 'update':
                var player = gameState.getPlayer(ws.id);
                if (!player) return;

                var xForce = 0;
                var yForce = 0;
                data.forEach((key: number) => {
                    switch (key) {
                        case Movement.Up:
                            yForce -= 1;
                            break;
                        case Movement.Down:
                            yForce += 1;
                            break;
                        case Movement.Left:
                            xForce -= 1;
                            break;
                        case Movement.Right:
                            xForce += 1;
                            break;
                    }
                });
                player.force = Vector.mult(Vector.normalise(Vector.create(xForce, yForce)), speed);

                break;
        }
    },
    close(ws) {
        var body = gameState.getPlayer(ws.id)?.body;
        if (body) {
            Composite.remove(engine.world, body);
        }
        gameState.removePlayer(ws.id);
        app.server?.publish("game", JSON.stringify({ type: 'leave', data: ws.id }));
    }
})
.listen(PORT);

setInterval(() => {
    app.server?.publish("game", JSON.stringify({ type: 'state', data: gameState.serialize()}));
    gameState.players.forEach(player => {
        app.server?.publish("game", JSON.stringify({ type: 'update', data: player.serialize()}));
    });
}, 1000 / TICK_RATE);

console.log(`Server is running on ${app.server?.url}`);
