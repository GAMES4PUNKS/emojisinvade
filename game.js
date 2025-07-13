// Emoji Invaders Game - 21 wide grid, centered player, UFO, mp3 sound, working collisions

const tileCount = 21;
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const canvasSize = Math.min(900, window.innerWidth * 0.92, window.innerHeight * 0.92);
canvas.width = canvasSize;
canvas.height = canvasSize;
const cellSize = canvas.width / tileCount;

// --- Sounds ---
const soundMap = {
  fire: ['fire.mp3','fire2.mp3'],
  invader: 'invaderdown.mp3',
  ufo: 'ufo.mp3',
  ufoHit: 'ufo2.mp3',
  ufoMiss: ['ufomiss.mp3','ufomiss2.mp3'],
  lifeLost: 'lifelost.mp3',
  gameOver: 'gameover.mp3',
  bomb: 'ufobomb1.mp3'
};
function playSound(name) {
  try {
    if(Array.isArray(soundMap[name])) {
      const src = soundMap[name][Math.floor(Math.random()*soundMap[name].length)];
      const a = new Audio(src); a.volume=1; a.play();
    } else {
      const a = new Audio(soundMap[name]); a.volume=1; a.play();
    }
  } catch(e){}
}

// --- Game State ---
let score = 0;
let highScore = Number(localStorage.getItem("high_score") || 0);
let playerLives = 3;
let bullets = [];
let bombs = [];
let invaders = [];
let invaderDir = 1;
let invaderSpeed = 40;
let invaderTick = 0;

// --- Player ---
let player = { x: Math.floor(tileCount / 2), y: tileCount - 2, alive: true };

// --- UFO ---
let ufo = null;
let ufoTimer = 0;
let ufoReward = 0;
let ufoActive = false;

// --- Invaders ---
function spawnInvaders() {
  invaders = [];
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < tileCount; col++) {
      invaders.push({ x: col, y: row+1, alive: true });
    }
  }
}
spawnInvaders();

// --- Controls ---
document.addEventListener('keydown', function(e) {
  if (!player.alive) return;
  if (e.key === 'ArrowLeft' && player.x > 0) player.x--;
  if (e.key === 'ArrowRight' && player.x < tileCount - 1) player.x++;
  if (e.key === ' ' && bullets.length < 1) {
    bullets.push({ x: player.x, y: player.y - 1 });
    playSound('fire');
  }
});

// --- UFO Logic ---
function spawnUFO() {
  if (!ufoActive && Math.random() < 0.002) {
    ufoActive = true;
    ufo = {
      x: 0,
      y: 0,
      dir: 1,
      emoji: "👾",
      reward: 2000 + Math.floor(Math.random() * 5000)
    };
    playSound('ufo');
  }
}
function moveUFO() {
  if (ufoActive && ufo) {
    ufo.x += ufo.dir * 0.33; // UFO speed
    if (ufo.x > tileCount-1 || ufo.x < 0) {
      ufoActive = false;
      ufo = null;
      playSound('ufoMiss');
    }
  }
}

// --- Bombs (from invaders and ufo) ---
function dropBombs() {
  if (Math.random() < 0.03) {
    let shooters = invaders.filter(i => i.alive);
    if (shooters.length) {
      let shooter = shooters[Math.floor(Math.random() * shooters.length)];
      bombs.push({ x: shooter.x, y: shooter.y+1 });
    }
  }
  if (ufoActive && Math.random() < 0.01) {
    bombs.push({ x: Math.round(ufo.x), y: ufo.y+1 });
    playSound('bomb');
  }
}

// --- Game Logic ---
function updateGame() {
  // Move bullets
  for (let b of bullets) b.y--;
  bullets = bullets.filter(b => b.y >= 0);

  // Move bombs
  for (let bomb of bombs) bomb.y++;
  bombs = bombs.filter(b => b.y < tileCount);

  // Move UFO
  spawnUFO();
  moveUFO();

  // Invaders move
  invaderTick++;
  if (invaderTick >= invaderSpeed) {
    let edge = false;
    for (let inv of invaders) {
      if (!inv.alive) continue;
      inv.x += invaderDir;
      if (inv.x <= 0 || inv.x >= tileCount-1) edge = true;
    }
    if (edge) {
      invaderDir *= -1;
      for (let inv of invaders) if(inv.alive) inv.y++;
      playSound('invader');
    }
    invaderTick = 0;
  }

  // Bullets vs Invaders
  for (let b of bullets) {
    for (let inv of invaders) {
      if (inv.alive && Math.abs(inv.x - b.x) < 0.5 && Math.abs(inv.y - b.y) < 0.5) {
        inv.alive = false;
        score += 10;
        playSound('invader');
        b.y = -99;
      }
    }
  }
  bullets = bullets.filter(b => b.y >= 0);

  // Bullets vs UFO
  if (ufoActive && ufo) {
    for (let b of bullets) {
      if (Math.abs(ufo.x - b.x) < 0.5 && Math.abs(ufo.y - b.y) < 0.5) {
        score += ufo.reward;
        playSound('ufoHit');
        ufoActive = false;
        ufo = null;
        b.y = -99;
        // If top reward, refresh invaders
        if (ufoReward >= 7000) spawnInvaders();
      }
    }
  }
  bullets = bullets.filter(b => b.y >= 0);

  // Bombs vs Player
  for (let bomb of bombs) {
    if (player.alive && Math.abs(bomb.x - player.x) < 0.5 && Math.abs(bomb.y - player.y) < 0.5) {
      playerLives--;
      playSound('lifeLost');
      player.alive = false;
      setTimeout(() => { player.alive = true; player.x = Math.floor(tileCount/2); }, 900);
      if (playerLives <= 0) {
        playSound('gameOver');
        player.alive = false;
      }
      bomb.y = tileCount+99;
    }
  }
  bombs = bombs.filter(b => b.y < tileCount);

  // Drop bombs
  dropBombs();

  // Win condition
  if (invaders.filter(i => i.alive).length === 0) {
    spawnInvaders();
  }
}

// --- Draw ---
function drawGame() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.font = cellSize * 0.8 + "px Segoe UI Emoji";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  // Invaders
  for (let inv of invaders) {
    if (inv.alive) ctx.fillText("👾", inv.x * cellSize + cellSize/2, inv.y * cellSize + cellSize/2);
  }
  // UFO
  if (ufoActive && ufo) {
    ctx.fillStyle = "yellow";
    ctx.fillText(ufo.emoji, ufo.x * cellSize + cellSize/2, ufo.y * cellSize + cellSize/2);
    ctx.fillStyle = "black";
  }
  // Bombs
  for (let bomb of bombs) {
    ctx.fillText("💣", bomb.x * cellSize + cellSize/2, bomb.y * cellSize + cellSize/2);
  }
  // Bullets
  for (let b of bullets) {
    ctx.fillText("💥", b.x * cellSize + cellSize/2, b.y * cellSize + cellSize/2);
  }
  // Player
  if (player.alive) ctx.fillText("🙂", player.x * cellSize + cellSize/2, player.y * cellSize + cellSize/2);

  // Score
  ctx.font = "24px Arial";
  ctx.fillText("Score: "+score, canvas.width/2, 24);
  ctx.fillText("Lives: "+playerLives, canvas.width/2, 48);
}

// --- Main Loop ---
function gameLoop() {
  updateGame();
  drawGame();
  requestAnimationFrame(gameLoop);
}
gameLoop();
