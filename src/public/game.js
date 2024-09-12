import { Application, Assets, BitmapFont, BitmapText, Container, GraphicsContext, Graphics, TilingSprite, Rectangle } from "./pixi.mjs";
import { OutlineFilter } from "./pixi-filters.mjs";

// Dictionary to store players by socket id
const players = new Map();

const mapObjects = [];

// movement "enum"
const Movement = {
    Up: -1,
    Down: 1,
    Left: -1,
    Right: 1
};

var gameState = {
    state: "lobby",
    message: "Waiting for players...",
    winner: undefined
}

// can be overriden by server
var radius = 40;
var tickRate = 30;

var PING_INTERVAL = 500;
var latency = 0;

var slider = document.getElementById("res");
var span = document.getElementById("resVal");

slider.oninput = function() {
    span.innerHTML = this.value;
    app.renderer.resolution = this.value/100;
    app.stage.position.set(0,0);
    setCookie("res", this.value, 365);
}

const width = 1920;
const height = 1080;

// create pixi app for rendering
const app = new Application();
await app.init({ 
    width: width, 
    height: height, 
    antialias: false,
    powerPreference:'low-power',
    backgroundColor: 0x28323c,
    resolution: 0.75,
});

if (getCookie("res")) {
    slider.value = getCookie("res");
} else {
    slider.value = 80;
}

app.renderer.resolution = slider.value/100;
span.innerHTML = slider.value;

function resize() {
    if (window.innerWidth / width < window.innerHeight / height){
        app.canvas.style.width = "80%"
        app.canvas.style.height = "auto"
    } else {
        app.canvas.style.height = "80%"
        app.canvas.style.width = "auto"
    }    
}

addEventListener("resize", resize);
resize();

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
pingText.position.set(app.screen.width-30, 60);
app.stage.addChild(pingText);

const fpsText = new BitmapText({
    text: "FPS",
    zIndex: 1,
    style: {
        align: 'left',
        fontFamily: 'myFont',
        fontSize: 30,
    }
});
fpsText.position.set(30, 30);
app.stage.addChild(fpsText);


function lerp(start, end, time) {
    return start * (1 - time) + end * time;
}

const INTEROPOLATE = true;

var socketId = "";

// "game loop" to update player positions from network
app.ticker.add(() => {
    var time = Date.now();
    // Update player positions
    players.forEach(player => {
        player.lastUpdate += app.ticker.deltaMS;
        var deltaTime = (player.lastUpdate / tickRate);
        if (player.container) {

            //player.sprite.visible = !player.eliminated;

            if (player.position) {
                var pos = player.position;
                if (INTEROPOLATE) {
                    pos = {
                        x: player.position.x + player.velocity.x * deltaTime,
                        y: player.position.y + player.velocity.y * deltaTime
                    }
                }
                player.container.position.set(pos.x, pos.y)
            }
        }      
        if (player.sprite && !(gameState.winner && player.id === gameState.winner) && player.tagger) {
            player.sprite.filters[0].alpha = Math.min((time - player.tagStart) / 1000, 1);
        } 
    });
});

// player template using GraphicsContext for performance
const playerTemplate = new GraphicsContext().circle(0, 0, radius).fill('white').stroke({color:0xAAAAAA,width:radius/5});
// connect via websocket

var wsUrl;

switch (window.location.protocol) {
    case 'http:':
        wsUrl = 'ws://' + window.location.host + '/ws';
        break;
    case 'https:':
        wsUrl = 'wss://' + window.location.host + '/ws';
        break;
    default:
        console.error('Unknown protocol:', window.location.protocol);
        break;
}

const socket = new WebSocket(wsUrl);

// ping server every second
setInterval(() => {
    if (socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: 'ping', data: Date.now() }));
}, PING_INTERVAL);


// recieve a message from the server
socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    switch (message.type) {
        case 'init':
            socketId = message.data;
            break;
        case 'pong':
            latency = Date.now() - message.data;
            pingText.text = `Ping: ${latency} ms`;
            pingText.tint = latency < 50 ? 0x60FF60 : latency < 100 ? 0xFFFF60 : 0xFF6060;
            fpsText.text = `${Math.round(app.ticker.FPS)} FPS`;
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
            break;
        case 'leave':
            var player = players.get(message.data);
            if (!player) return;
            player.container.destroy();
            players.delete(message.data);
            break;
        case 'chat':
            var player = players.get(message.data.id);
            if (!player) return;
            var chatText = new BitmapText({
                text: message.data.message,
                zIndex: 1,
                style: {
                    fontFamily: 'myFont',
                    fontSize: 30,
                }
            });
            chatText.anchor.set(0.5);
            chatText.position.set(0, -radius-20);
            player.container.addChild(chatText);
            setTimeout(() => chatText.destroy(), 5000);
            break;
        case 'update':
            var player = players.get(message.data.id);
            if (!player) {
                player = message.data;
                player.container = new Container();
                player.sprite = new Graphics(playerTemplate);
                player.sprite.tint = parseInt(player.color, 16);
                player.sprite.filters = [ 
                    new OutlineFilter({ 
                        alpha:0,
                        color:0xff6060,
                        thickness: 5,
                    })
                ];
                player.nameText = new BitmapText({
                    text: player.name,
                    zIndex: 1,
                    style: {
                        fontFamily: 'myFont',
                        fontSize: 30,
                    }
                });
                player.nameText.anchor.set(0.5);
                player.nameText.position.set(0, radius+20);
    
                players.set(player.id, player);
                player.container.addChild(player.nameText);
                player.container.addChild(player.sprite);
                app.stage.addChild(player.container);
            }
            if (!player.tagStart || (player.tagger != message.data.tagger)) {
                player.tagStart = Date.now();
            }

            Object.assign(player, message.data);
            player.nameText.text = player.name;
            player.lastUpdate = 0;

            if (player.eliminated) {
                if (!socketId){
                    player.container.visible = false;
                    return;
                }

                if (players.get(socketId)?.eliminated) {
                    player.container.visible = true;
                    player.container.alpha = 0.5;
                } else {
                    player.container.visible = false;
                }
            } else {
                player.container.alpha = 1;
                player.container.visible = true;
            }

            if (gameState.winner && player.id === gameState.winner) {
                player.sprite.filters[0].color = 0x60FF60;
                player.sprite.filters[0].alpha = 1;
            } else if (player.tagger) {
                player.sprite.filters[0].color = 0xff6060;
            } else {
                player.sprite.filters[0].alpha = 0;
            }
            
            
            break;
        default:
            console.error('Unknown message type:', message.type, "data:", message.data);
    }
});

function sendChat() {
    var chatInput = document.getElementById("chatInput");
    if (chatInput.value) {
        socket.send(JSON.stringify({ type: 'chat', data: chatInput.value }));
        chatInput.value = "";
    }
}

function setName() {
    var nameInput = document.getElementById("nameInput");
    if (nameInput.value) {
        socket.send(JSON.stringify({ type: 'name', data: nameInput.value }));
    }
}

document.getElementById("sendButton").addEventListener("click", sendChat);
document.getElementById("chatInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendChat();
});

document.getElementById("nameButton").addEventListener("click", setName);
document.getElementById("nameInput").addEventListener("keydown", function (e) {
    if (e.key === "Enter") setName();
});

// input setup
const xKeys = window.xKeys = new Set();
const yKeys = window.yKeys = new Set();

window.pXKeys = new Set();
window.pYKeys = new Set();


const eqSet = (xs, ys) =>
    xs.size === ys.size &&
    [...xs].every((x) => ys.has(x));

function sendInput() {
    if (!eqSet(window.xKeys, window.pXKeys) || !eqSet(window.yKeys, window.pYKeys)) {
        window.pXKeys = new Set(window.xKeys);
        window.pYKeys = new Set(window.yKeys);
        socket.send(JSON.stringify({
            type: 'update',
            data: { 
                x: Array.from(xKeys).reduce((partialSum, a) => partialSum + a, 0), 
                y: Array.from(yKeys).reduce((partialSum, a) => partialSum + a, 0)
            }
        }));
    }
}

// input handling
document.addEventListener("keydown", function ({ key, code }) {
    switch (key) {
        case "ArrowUp":
            yKeys.add(Movement.Up);
            break;
        case "ArrowDown":
            yKeys.add(Movement.Down);
            break;
        case "ArrowLeft":
            xKeys.add(Movement.Left);
            break;
        case "ArrowRight":
            xKeys.add(Movement.Right);
            break;
    }
    switch (code) {
        case "KeyW":
            yKeys.add(Movement.Up);
            break;
        case "KeyS":
            yKeys.add(Movement.Down);
            break;
        case "KeyA":
            xKeys.add(Movement.Left);
            break;
        case "KeyD":
            xKeys.add(Movement.Right);
            break;
    }
    sendInput();
});
document.addEventListener("keyup", function ({ key, code }) {
    switch (key) {
        case "ArrowUp":
            yKeys.delete(Movement.Up);
            break;
        case "ArrowDown":
            yKeys.delete(Movement.Down);
            break;
        case "ArrowLeft":
            xKeys.delete(Movement.Left);
            break;
        case "ArrowRight":
            xKeys.delete(Movement.Right);
            break;
    }
    switch (code) {
        case "KeyW":
            yKeys.delete(Movement.Up);
            break;
        case "KeyS":
            yKeys.delete(Movement.Down);
            break;
        case "KeyA":
            xKeys.delete(Movement.Left);
            break;
        case "KeyD":
            xKeys.delete(Movement.Right);
            break;
    }
    sendInput();
});

function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for(var i=0;i < ca.length;i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}
function eraseCookie(name) {   
    document.cookie = name +'=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}