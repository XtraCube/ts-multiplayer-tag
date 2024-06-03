import { Elysia, t } from 'elysia';
import { Player }  from "./shared/Player.js";
import { GameState } from './GameState.js';
import { Engine, Events, Runner, Bodies, Body, Composite, Vector } from 'matter-js';

// DEFINE SERVER CONSTANTS
const PORT = Number(process.env['PORT'] ?? 3000);

// tick rate doesnt actually seem to affect the amount of times the server sends updates
// no idea why but you can play with this if you want
const TICK_RATE = 60;

// message schema for all websocket messages
const MESSAGE_SCHEMA = t.Object({
    type: t.String(),
    data: t.Any()
});

// define game bound information
const WIDTH = 3840;
const HEIGHT = 2160;

// define player information
const speed = .5;
const radius = 75;
const mass = 50;
const friction = 0.15 * TICK_RATE/60; // friction is affected by tick rate

const Movement = {
    Up: 0,
    Down: 1,
    Left: 2,
    Right: 3
};

const gameState = new GameState();

var engine = Engine.create({
    enableSleeping: true,
    gravity: { x: 0, y: 0 }        
});

var runner = Runner.create({
    delta: 1000 / TICK_RATE,
    isFixed: true,
    enabled: true
});

Events.on(runner, "tick", () => {
    gameState.players.forEach(player => {
        // i have no idea why TICK_RATE/(engine.timing.lastDelta) works, but it does
        // it scales the force to function the same at any tick rate
        // the reason i multiply friction as well is because friction is also affected by tick rate
        // this seemed to be the best way to keep the game consistent at any tick rate
        Body.applyForce(player.body, player.body.position, Vector.mult(player.force, TICK_RATE/(engine.timing.lastDelta)));
    });
});

// this solution is decent, but i'd like to find a better one
Events.on(runner, "afterTick", () => {
    gameState.players.forEach(player => {
        if (player.body.position.x > WIDTH) {
            Body.setPosition(player.body, { x: WIDTH, y: player.body.position.y });
        }
        else if (player.body.position.x < 0) {
            Body.setPosition(player.body, { x: 0, y: player.body.position.y });
        }
        if (player.body.position.y > HEIGHT) {
            Body.setPosition(player.body, { x: player.body.position.x, y: HEIGHT });
        }
        else if (player.body.position.y < 0) {
            Body.setPosition(player.body, { x: player.body.position.x, y: 0 });
        }
        // im not sure if spamming clients with update messages is the best solution but it seems to work
        app.server?.publish("game", JSON.stringify({ type: 'update', data: player.serialize()}));
    });
});

Runner.run(runner, engine);


const app = new Elysia()
.get('/', ( ) =>{
    return Bun.file('src/public/index.html');
})
.get('/game.js', ( ) =>{
    return Bun.file('src/public/game.js');
})
.ws('/ws', {
    body: MESSAGE_SCHEMA,
    open(ws) {
        ws.subscribe("game");

        gameState.players.forEach(player => {
            ws.send({ type: 'join', data: player.serialize() });
        });

        const body = Bodies.circle( Math.random()*WIDTH , Math.random()*HEIGHT , radius, {
            frictionAir: friction,
            mass: mass,
            inverseMass: 1 / mass
        });
        const player = new Player(ws.id, body, false, false);
        gameState.addPlayer(ws.id, player);

        Composite.add(engine.world, body);
        app.server?.publish('game',JSON.stringify({type: 'join', data: player.serialize()}));

    },
    message(ws, { type, data }) {
        switch (type) {
            case 'update':
                var player = gameState.getPlayer(ws.id);
                if (!player) return;

                var xForce = 0;
                var yForce = 0;
                data.forEach((key: number) => {
                    switch (key) {
                        case Movement.Up:
                            yForce -= speed;
                            break;
                        case Movement.Down:
                            yForce += speed;
                            break;
                        case Movement.Left:
                            xForce -= speed;
                            break;
                        case Movement.Right:
                            xForce += speed;
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
    }
})
.listen(PORT);

console.log(`Server is running on ${app.server?.url}`);
