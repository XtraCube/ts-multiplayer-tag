import { Application, Assets, BitmapFont, BitmapText, GraphicsContext, Graphics, TilingSprite } from "./pixi.mjs";
import { GlowFilter } from "./pixi-filters.mjs";

// Dictionary to store players by socket id
const players = new Map();

const mapObjects = [];

// movement "enum"
const Movement = {
    Up: 0,
    Down: 1,
    Left: 2,
    Right: 3
};

var gameState = {
    state: "lobby",
    message: "Waiting for players...",
    winner: undefined
}

const INTEROPOLATE = true;

// can be overriden by server
var radius = 40;
var tickRate = 30;
var interpRate = 60/tickRate;

// create pixi app for rendering
const app = new Application();
await app.init({ width: 1920, height: 1080, antialias: false, powerPreference:'low-power', backgroundColor: 0x28323c});

const texture = await Assets.load('grid.png');

const tilingSprite = new TilingSprite({
    texture,
    width: app.screen.width,
    height: app.screen.height,
});

app.stage.addChild(tilingSprite);

document.body.appendChild(app.canvas);

 // pre install
BitmapFont.install({
    name: 'myFont',
    style:{
        fontFamily: 'Arial',
        fill: 0xF0F0F0,
        fontSize: 50,
        align: 'center',
    }
 })

const messageText = new BitmapText({
    text: gameState.message,
    zIndex: 1,
    style: {
        fontFamily: 'myFont',
        fontSize: 50,
    }
});
messageText.anchor.set(0.5);
messageText.position.set(app.screen.width / 2, 50);
app.stage.addChild(messageText);

const pingText = new BitmapText({
    text: "Ping: 0 ms",
    zIndex: 1,
    style: {
        align: 'right',
        fontFamily: 'myFont',
        fontSize: 30,
    }
});
pingText.anchor.set(1);
pingText.position.set(app.screen.width-15, 50);
app.stage.addChild(pingText);

function resize() {
    if (window.innerWidth / 3840 < window.innerHeight / 2160){
        app.canvas.style.width = "80%"
        app.canvas.style.height = "auto"
    } else {
        app.canvas.style.height = "80%"
        app.canvas.style.width = "auto"
    }    
}

addEventListener("resize", resize);
resize();


function lerp(start, end, time) {
    return start * (1 - time) + end * time;
}

// "game loop" to update player positions from network
app.ticker.add(() => {

    // Update player positions
    players.forEach(player => {
        player.lastUpdate += app.ticker.deltaTime;

        if (player.sprite) {
            player.sprite.visible = !player.eliminated;

            if (player.position) {
                var pos = player.position;
                if (INTEROPOLATE) {
                    pos = {
                        x: lerp(player.previousPosition.x, player.position.x, player.lastUpdate / interpRate),
                        y: lerp(player.previousPosition.y, player.position.y, player.lastUpdate / interpRate)
                    }
                }
                player.sprite.position.set(pos.x, pos.y)
            }
            if (gameState.winner && player.id === gameState.winner) {
                player.sprite.filters[0].color = 0x60FF60;
                player.sprite.filters[0].alpha = 1;
            } else {
                player.sprite.filters[0].color = 0xff6060;
                player.sprite.filters[0].alpha = player.tagAlpha;
            }
        }        
    });
});

// player template using GraphicsContext for performance
const playerTemplate = new GraphicsContext().circle(0, 0, radius).fill('white').stroke({color:0xAAAAAA,width:radius/5});

// connect via websocket
const socket = new WebSocket(`ws://${window.location.host}/ws`);

// ping server every second
setInterval(() => {
    socket.send({ type: 'ping', data: Date.now() });
}, 1000);


// recieve a message from the server
socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    switch (message.type) {
        case 'pong':
            console.log('Ping:', Date.now(), message.data, 'ms');
            let latency = Date.now() - message.data;
            pingText.text = `Ping: ${latency} ms`;
            break;
        case 'map':
            mapObjects.forEach(obj => obj.destroy());
            mapObjects.length = 0;
            mapObjects.push(...message.data);
            mapObjects.forEach(obj => {
                var graphics = new Graphics()
                .rect(obj.x, obj.y, obj.width, obj.height)
                .fill(obj.color)
                .stroke({color:obj.strokeColor,width:obj.strokeWidth});
                graphics.pivot.set(obj.width/2, obj.height/2);
                app.stage.addChild(graphics);
                mapObjects.push(graphics);
            });
            break;
        case 'state':
            gameState = message.data;
            messageText.text = gameState.message;
            break;
        case 'config':
            radius = message.data.radius;
            tickRate = message.data.tickRate;
            interpRate = 65 / tickRate;
            break;
        case 'leave':
            var player = players.get(message.data);
            if (!player) return;
            player.sprite.destroy();
            players.delete(message.data);
            break;
        case 'update':
            var player = players.get(message.data.id);
            if (!player) {
                player = message.data;
                player.sprite = new Graphics(playerTemplate);
                player.sprite.tint = parseInt(player.color, 16);
                player.sprite.filters = [ new GlowFilter({ alpha:0, distance: 50, outerStrength: 2, color:0xff6060 }) ];
                players.set(player.id, player);
                app.stage.addChild(player.sprite);
            }
            player.previousPosition = player.position;
            Object.assign(player, message.data);
            player.lastUpdate = 0;
            
            break;
        default:
            console.error('Unknown message type:', message.type, "data:", message.data);
    }
});

// input setup
const keys = window.keys = new Set();
window.prevKeys = new Set();

const eqSet = (xs, ys) =>
    xs.size === ys.size &&
    [...xs].every((x) => ys.has(x));


// input handling
document.addEventListener("keydown", function ({ key, code }) {
    switch (key) {
        case "ArrowUp":
            keys.add(Movement.Up);
            break;
        case "ArrowDown":
            keys.add(Movement.Down);
            break;
        case "ArrowLeft":
            keys.add(Movement.Left);
            break;
        case "ArrowRight":
            keys.add(Movement.Right);
            break;
    }
    switch (code) {
        case "KeyW":
            keys.add(Movement.Up);
            break;
        case "KeyS":
            keys.add(Movement.Down);
            break;
        case "KeyA":
            keys.add(Movement.Left);
            break;
        case "KeyD":
            keys.add(Movement.Right);
            break;
    }
    if (window.keys && window.prevKeys && !eqSet(window.keys, window.prevKeys)){
        window.prevKeys = new Set(window.keys);
        socket.send(JSON.stringify({
            type: 'update',
            data: Array.from(keys)
        }));
    }
});
document.addEventListener("keyup", function ({ key, code }) {
    switch (key) {
        case "ArrowUp":
            keys.delete(Movement.Up);
            break;
        case "ArrowDown":
            keys.delete(Movement.Down);
            break;
        case "ArrowLeft":
            keys.delete(Movement.Left);
            break;
        case "ArrowRight":
            keys.delete(Movement.Right);
            break;
    }
    switch (code) {
        case "KeyW":
            keys.delete(Movement.Up);
            break;
        case "KeyS":
            keys.delete(Movement.Down);
            break;
        case "KeyA":
            keys.delete(Movement.Left);
            break;
        case "KeyD":
            keys.delete(Movement.Right);
            break;
    }
    if (window.keys && window.prevKeys && !eqSet(window.keys, window.prevKeys)){
        window.prevKeys = new Set(window.keys);
        socket.send(JSON.stringify({
            type: 'update',
            data: Array.from(keys)
        }));
    }
});