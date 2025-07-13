// Emoji Invaders Game - 21x21 grid, invaders 10 wide x 8 deep, bunkers made of shit emoji

const emojiBank = [
  "😀","😃","😄","😁","😆","😅","😂","😊","😇","😉","🙂","🙃","😋","😎",
  "😍","🥰","😘","😗","😙","😚","😐","😑","😶","🙄","😏","😣","😥","😮",
  "🤐","😯","😪","😫","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕",
  "🤑","😲","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯",
  "😬","😰","😱","😳","🤪","😵","😡","😠","🤬","😷","🤒","🤕","🤢","🤮",
  "🤧","🥵","🥶","🥴","🤠","🥳","🥺","🤓","🧐","😈","👿","👹","👺","👻",
  "💀","☠️","👽","👾","🤖","👄","🦷","👀",
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸",
  "🐵","🦍","🦄","🐞","🐍",
  "🍏","🍎","🍐","🍊","🍋","🍇","🍓","🍒","🍑","🥭","🍍",
  "🧁","🍰","🍔","🍟","🍕","🌭","🍩","🍪",
  "⚽️","🏀","🏈","⚾️","🥎","🏐","🎱","🎲","🎯","🎳",
  "🌦️","🌧️","⛈️","🌩️","🌨️","❄️","☃️","⛄️","🌈",
  "❤️","🧡","💛","💚","💙","💜","🤍","🤎","💔"
];

// === GRID SETUP ===
const tileCount = 21;
const gridSize = 20;
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = tileCount * gridSize;
canvas.height = tileCount * gridSize;

let score = 0;
let highScore = Number(localStorage.getItem("high_score") || 0);
const player = { x: Math.floor(tileCount / 2), y: tileCount - 1, speedCounter: 0 };
let playerLives = 3;
let bullets = [];
let bombs = [];
let invaders = [];
let invaderDir = 1;
let invaderSpeed = 40;
let invaderTick = 0;
let bulletCooldown = 0;
let bombDropSpeed = 0.33;
let bulletTravelSpeed = 0.33;

const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const overlay = document.getElementById("overlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const pauseBtn = document.getElementById("pauseBtn");

// === INVADER GRID - 10 wide, 8 deep, packed ===
function spawnInvaderGrid() {
  invaders = [];
  const invaderCols = 10;
  const invaderRows = 8;
  const startX = Math.floor((tileCount - invaderCols) / 2); // center
  for (let row = 0; row < invaderRows; row++) {
    for (let col = 0; col < invaderCols; col++) {
      invaders.push({
        x: startX + col,
        y: row + 1,
        emoji: emojiBank[(row * invaderCols + col) % emojiBank.length],
        flickerPhase: Math.random() * Math.PI * 2
      });
    }
  }
}

// === CUSTOM BUNKERS - shit emoji ===
// Middle bunker: centered, 5 cells wide
// Left & right bunkers: 3 wide, 1 cell from wall, all bunkers 3 high
const BUNKER_H = 3;
const shitEmoji = "💩";
const BUNKER_CELL_HP = 3;
function makeCells(w) { return Array.from({length: BUNKER_H}, () => Array.from({length: w}, () => ({ hp: BUNKER_CELL_HP }))); }
function buildBunkers() {
  const y = tileCount - 6;
  const middleX = Math.floor((tileCount - 5) / 2);
  return [
    { x: 1, y, width: 3, height: BUNKER_H, cells: makeCells(3) }, // left bunker
    { x: middleX, y, width: 5, height: BUNKER_H, cells: makeCells(5) }, // middle
    { x: tileCount - 4, y, width: 3, height: BUNKER_H, cells: makeCells(3) } // right bunker
  ];
}
let bunkers = buildBunkers();
function drawBunker(bunker) {
  ctx.font = gridSize + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Noto Emoji','Segoe UI Symbol','Orbitron',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let row = 0; row < bunker.height; row++)
    for (let col = 0; col < bunker.width; col++) {
      const cell = bunker.cells[row][col];
      if (cell && cell.hp > 0) {
        ctx.globalAlpha = Math.max(0.25, cell.hp / BUNKER_CELL_HP);
        ctx.fillText(shitEmoji, (bunker.x + col) * gridSize + gridSize / 2, (bunker.y + row) * gridSize + gridSize / 2);
        ctx.globalAlpha = 1;
      }
    }
}
function resetBunkers() { bunkers = buildBunkers(); }

function updateHUD() {
  scoreDisplay.textContent = `Score: ${score}`;
  highScoreDisplay.textContent = `High Score: ${highScore}`;
  let livesDisplay = document.getElementById("livesDisplay");
  if (!livesDisplay) {
    livesDisplay = document.createElement("span");
    livesDisplay.id = "livesDisplay";
    highScoreDisplay.parentNode.insertBefore(livesDisplay, highScoreDisplay.nextSibling);
  }
  livesDisplay.textContent = ` Lives: ${playerLives}`;
}

// === CONTROLS ===
let left = false, right = false, shooting = false;
let firePressed = false;
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') right = true;
  if ((e.key === ' ' || e.key === 'z' || e.key === 'j') && !firePressed) { shooting = true; firePressed = true; }
  if (e.key.toLowerCase() === 'p') pauseBtn.click();
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') right = false;
  if (e.key === ' ' || e.key === 'z' || e.key === 'j') { shooting = false; firePressed = false; }
});

function resetGame() {
  score = 0;
  bullets = [];
  bombs = [];
  player.x = Math.floor(tileCount / 2);
  player.y = tileCount - 1;
  player.speedCounter = 0;
  playerLives = 3;
  invaderSpeed = 40;
  bombDropSpeed = 0.33;
  bulletTravelSpeed = 0.33;
  resetBunkers();
  spawnInvaderGrid();
  updateHUD();
}

let isPaused = true;
let reqId = null;
let gameOverState = false;

function drawEmoji(x, y, emoji, flicker = false, customSize = null, phase = 0) {
  ctx.font = (customSize ? customSize : gridSize) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Noto Emoji','Segoe UI Symbol','Orbitron',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (flicker) ctx.globalAlpha = Math.abs(Math.sin(Date.now() / 150 + phase));
  ctx.fillText(emoji, x * gridSize + gridSize / 2, y * gridSize + gridSize / 2);
  ctx.globalAlpha = 1;
}

function gameLoop() {
  if (isPaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Border
  ctx.save();
  ctx.shadowColor = "#a020f0";
  ctx.shadowBlur = 30;
  ctx.strokeStyle = "#a020f0";
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  bunkers.forEach(drawBunker);

  player.speedCounter++;
  if (player.speedCounter >= 4) {
    if (left && player.x > 0) player.x--;
    if (right && player.x < tileCount - 1) player.x++;
    player.speedCounter = 0;
  }

  if (shooting && bullets.length === 0) {
    bullets.push({ x: player.x, y: player.y - 1, vy: 0 });
    shooting = false;
  }

  bullets.forEach(b => { b.vy = (b.vy || 0) + bulletTravelSpeed; if (b.vy >= 1) { b.y -= Math.floor(b.vy); b.vy = b.vy % 1; } });
  bullets = bullets.filter(b => b.y >= 0);

  bombs.forEach(b => { b.vy = (b.vy || 0) + bombDropSpeed; if (b.vy >= 1) { b.y += Math.floor(b.vy); b.vy = b.vy % 1; } });
  bombs = bombs.filter(b => b.y < tileCount);

  invaderTick++;
  if (invaderTick >= invaderSpeed) {
    let hitEdge = false;
    for (let i = 0; i < invaders.length; i++) {
      invaders[i].x += invaderDir;
      if (invaders[i].x <= 0 || invaders[i].x >= tileCount - 1) hitEdge = true;
      if (Math.random() < 0.004) bombs.push({ x: invaders[i].x, y: invaders[i].y, emoji: "✨", vy: 0 });
    }
    if (hitEdge) { invaderDir *= -1; for (let i = 0; i < invaders.length; i++) { invaders[i].y += 1; } }
    invaderTick = 0;
  }

  drawEmoji(player.x, player.y, shitEmoji);
  bullets.forEach(b => drawEmoji(b.x, Math.round(b.y), "💥"));
  bombs.forEach(b => drawEmoji(b.x, Math.round(b.y), b.emoji, true));
  invaders.forEach(inv => drawEmoji(inv.x, inv.y, inv.emoji, true, null, inv.flickerPhase));

  if (invaders.length === 0) {
    invaderSpeed = Math.max(1, invaderSpeed - 0.5);
    bombDropSpeed = Math.min(2, bombDropSpeed + 0.2);
    bulletTravelSpeed = Math.min(2, bulletTravelSpeed + 0.2);
    spawnInvaderGrid();
    resetBunkers();
  }

  updateHUD();
  reqId = requestAnimationFrame(gameLoop);
}

// --- Overlay, pause, restart logic ---

pauseBtn.onclick = () => {
  if (!initialGameStarted) {
    startMainGame();
  } else {
    isPaused = !isPaused;
    overlay.textContent = isPaused ? "PAUSED" : "";
    overlay.style.display = isPaused ? "block" : "none";
    if (!isPaused) reqId = requestAnimationFrame(gameLoop);
  }
};

overlay.onclick = () => {
  if (!initialGameStarted && overlay.style.display === "block") {
    startMainGame();
  }
};

gameOverOverlay.onclick = () => {
  gameOverOverlay.style.display = 'none';
  gameOverState = false;
  isPaused = false;
  resetGame();
  reqId = requestAnimationFrame(gameLoop);
};

window.addEventListener('keydown', function(e) {
  if (!initialGameStarted && overlay.style.display === "block" && (e.key === "Enter" || e.key === " ")) {
    startMainGame();
  }
  if (gameOverState && (e.key === "Enter" || e.key === " ")) {
    gameOverOverlay.style.display = 'none';
    gameOverState = false;
    isPaused = false;
    resetGame();
    reqId = requestAnimationFrame(gameLoop);
  }
});

window.addEventListener('DOMContentLoaded', () => {
  overlay.textContent = "▶ PLAY";
  overlay.style.display = "block";
  overlay.style.cursor = "pointer";
  isPaused = true;
  gameOverState = false;
  if (reqId) cancelAnimationFrame(reqId);
});

updateHUD();

let initialGameStarted = false;
function startMainGame() {
  if (!initialGameStarted) {
    initialGameStarted = true;
    overlay.style.display = "none";
    overlay.style.cursor = "";
    isPaused = false;
    reqId = requestAnimationFrame(gameLoop);
    canvas.focus();
  }
}
