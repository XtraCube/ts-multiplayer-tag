import { Application, BitmapFont, BitmapText, GraphicsContext, Graphics, AlphaFilter } from "./pixi.mjs";
import { GlowFilter } from "./pixi-filters.mjs";

// Dictionary to store players by socket id
const players = new Map();

// send movement per second
const SEND_RATE = 60;

const INTEROPOLATE = false;

// movement "enum"
const Movement = {
    Up: 0,
    Down: 1,
    Left: 2,
    Right: 3
};

const gameState = {
    state: "lobby",
    message: "Waiting for players...",
}

// speed for interpolation and radius for render
// can be overriden by server
let speed = 1.5;
let radius = 75;

// create pixi app for rendering
const app = new Application();
await app.init({ width: 3840, height: 2160, backgroundColor: 0x28323c});
document.body.appendChild(app.canvas);


 // pre install
 BitmapFont.install({
    name: 'myFont',
    style:{
        fontFamily: 'Arial',
        fill: 0xF0F0F0,
        fontSize: 100,
        align: 'center',
    }
 })


const messageText = new BitmapText({
    text: gameState.message,
    style: {
        fontFamily: 'myFont',
        fontSize: 100,
    }
});
messageText.anchor.set(0.5);
messageText.position.set(app.screen.width / 2, 4*app.screen.height / 5);
app.stage.addChild(messageText);


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
        if (player.position && player.sprite) {
            player.previousPosition = player.position;
            var pos = player.position;
            if (INTEROPOLATE) {
                pos = {
                    x: lerp(player.previousPosition.x, player.position.x, player.lastUpdate / 60),
                    y: lerp(player.previousPosition.y, player.position.y, player.lastUpdate / 60)
                }
            }
            player.sprite.position.set(pos.x, pos.y)
        }
        player.lastUpdate += app.ticker.deltaTime;
    });
});

// player template using GraphicsContext for performance
const playerTemplate = new GraphicsContext().circle(0, 0, radius).fill('white').stroke({color:0xAAAAAA,width:radius/5});


// connect via websocket
const socket = new WebSocket(window.location.href+'/ws');

// recieve a message from the server
socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    switch (message.type) {
        case 'state':
            gameState.state = message.data.state;
            gameState.message = message.data.message;
            messageText.text = gameState.message;
            break;
        case 'config':
            speed = message.data.speed;
            radius = message.data.radius;
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
                player.sprite.filters = [ new GlowFilter({ alpha:0, distance: 15, outerStrength: 10, color:0xff0000 }) ];
                players.set(player.id, player);
                app.stage.addChild(player.sprite);
            }
            Object.assign(player, message.data);
            player.lastUpdate = 0;
            player.sprite.visible = !player.eliminated;
            if (player.tagger) {
                player.sprite.filters[0].alpha = player.tagAlpha;
            } else {
                player.sprite.filters[0].alpha = 0;
            }
            
            break;
        default:
            console.error('Unknown message type:', message.type);
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