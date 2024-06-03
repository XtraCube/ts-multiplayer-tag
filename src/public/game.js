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

// speed for interpolation and radius for render
// can be overriden by server
let speed = 1.5;
let radius = 75;

// create pixi app for rendering
const app = new PIXI.Application();
await app.init({ width: 3840, height: 2160, backgroundColor: 0x28323c});
document.body.appendChild(app.canvas);

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
const playerTemplate = new PIXI.GraphicsContext().circle(0, 0, radius).fill('white').stroke({color:0xAAAAAA,width:radius/5});


// connect via websocket
const socket = new WebSocket('ws://localhost:3000/ws');

// recieve a message from the server
socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    switch (message.type) {
        case 'config':
            speed = message.data.speed;
            radius = message.data.radius;
            break;

        case 'join':
            var player = message.data;
            players.set(player.id, player);
            player.sprite = new PIXI.Graphics(playerTemplate);
            player.sprite.tint = parseInt(player.color, 16);
            app.stage.addChild(player.sprite);
            break;
        case 'leave':
            player.sprite.delete();
            players.delete(message.id);
            break;
        case 'update':
            var player = players.get(message.data.id);
            if (player) {
                Object.assign(player, message.data);
                console.log(player.lastUpdate)
                player.lastUpdate = 0;
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