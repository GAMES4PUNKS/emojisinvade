// === EMOJI INVADERS DELUXE ===
// Big file: all features, enhancements, and polish included. 
// See comments for modular sections and tweak points.

// --- 1. CONFIGURATION & GLOBALS ---
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

// --- Map emoji to individual bonus scores for bonuses ---
const emojiBonusScores = {};
for (let i = 0; i < emojiBank.length; i++) {
  emojiBonusScores[emojiBank[i]] = 1000 + i * 50;
}

// --- Achievements --- 
const ACHIEVEMENTS = [
  { id: "first_bonus", desc: "Hit your first bonus emoji!" },
  { id: "combo_5", desc: "Achieve a 5x combo!" },
  { id: "no_bunker", desc: "Win a wave with no bunkers left!" },
  { id: "perfect_wave", desc: "Win a wave with all bunkers intact!" },
  { id: "high_score", desc: "Beat the high score!" },
  { id: "boss_defeat", desc: "Defeat a mini-boss invader!" }
];

// --- Game settings ---
const MAX_LIVES = 3;
const MAX_BULLETS = 3;
const SMART_BOMB_LIMIT = 1;
const COMBO_TIME = 2000; // ms
const POWERUP_DROP_RATE = 0.07;
const BUNKER_W = 3, BUNKER_H = 3;

// --- Canvas ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 400;
canvas.height = 400;
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// --- Resources ---
const shitImg = new Image();
shitImg.src = 'BASE.png';
const indestructImg = new Image();
indestructImg.src = 'INDESTRUCT.png';
const explosiveImg = new Image();
explosiveImg.src = 'EXPLOSIVE.png';
const shieldImg = new Image();
shieldImg.src = 'SHIELD.png';

// --- Sounds ---
// (Add your own .mp3/.ogg files and load them here for real sound)
const soundFiles = {
  shoot: "shoot.wav",
  explosion: "explosion.wav",
  bonus: "bonus.wav",
  powerup: "powerup.wav",
  lose: "lose.wav",
  combo: "combo.wav",
  boss: "boss.wav"
};
const sounds = {};
for (const k in soundFiles) {
  sounds[k] = new Audio(soundFiles[k]);
}

// --- 2. GAME STATE ---
let score = 0;
let highScore = Number(localStorage.getItem("high_score") || 0);
let lives = MAX_LIVES;
let smartBombs = SMART_BOMB_LIMIT;
let wave = 1;
let difficulty = "Normal"; // Easy, Normal, Hard
let endlessMode = false;
let timedMode = false;
let timer = 0;
let achievements = {};
let unlockedAchievements = [];
let leaderboard = JSON.parse(localStorage.getItem("leaderboard") || "[]");

const player = {
  x: 10, y: tileCount - 1, speedCounter: 0,
  shield: false, rapidFire: false, wideShot: false
};

let bullets = [];
let bombs = [];
let invaders = [];
let invaderDir = 1;
let invaderSpeed = 40;
let invaderTick = 0;
let bulletCooldown = 0;

let bunkers = [];
let bunkerTypes = []; // "normal", "indestruct", "explosive"
let movingBunkerPhase = 0;

let left = false, right = false, shooting = false;
let touchLeft = false, touchRight = false, touchShoot = false;

let combo = 0;
let comboTimer = null;

let overlay = document.getElementById("overlay");
let gameOverOverlay = document.getElementById("gameOverOverlay");
let scoreDisplay = document.getElementById("scoreDisplay");
let highScoreDisplay = document.getElementById("highScoreDisplay");
let livesDisplay = document.getElementById("livesDisplay");
let smartBombDisplay = document.getElementById("smartBombDisplay");
let achievementsDisplay = document.getElementById("achievementsDisplay");
let leaderboardDisplay = document.getElementById("leaderboardDisplay");
let powerupDisplay = document.getElementById("powerupDisplay");
let radio = document.getElementById("radioStream");

// --- 3. UI/Accessibility Controls (remapping, colorblind) ---
// (Add UI for remapping, colorblind toggle, emoji set selection as needed)

// --- 4. BUNKER LOGIC ---
// Types: "normal" (breaks), "indestruct" (never breaks), "explosive" (destroys 3x3 on hit)
function getBunkerY() {
  const previousY = tileCount - 5;
  const bottomY = tileCount - 2;
  return Math.round(previousY + 0.4 * (bottomY - previousY));
}
function getBunkerXs() {
  return [
    Math.round(tileCount * 1 / 6),
    Math.round(tileCount * 1 / 2),
    Math.round(tileCount * 5 / 6)
  ];
}
function makeCells(type = "normal") {
  return Array.from({length: BUNKER_H}, () => Array(BUNKER_W).fill(type));
}
function buildBunkers() {
  const y = getBunkerY();
  const xs = getBunkerXs();
  // Example: center is explosive, left is indestruct, right is normal
  bunkerTypes = ["indestruct", "explosive", "normal"];
  return [
    { x: xs[0] - 1, y, width: BUNKER_W, height: BUNKER_H, cells: makeCells(bunkerTypes[0]), type: bunkerTypes[0], moving: false },
    { x: xs[1] - 1, y, width: BUNKER_W, height: BUNKER_H, cells: makeCells(bunkerTypes[1]), type: bunkerTypes[1], moving: true },
    { x: xs[2] - 1, y, width: BUNKER_W, height: BUNKER_H, cells: makeCells(bunkerTypes[2]), type: bunkerTypes[2], moving: false }
  ];
}
function drawBunker(bunker) {
  for (let row = 0; row < bunker.height; row++) {
    for (let col = 0; col < bunker.width; col++) {
      let cellType = bunker.cells[row][col];
      if (cellType) {
        let img = shitImg;
        if (cellType === "indestruct") img = indestructImg;
        if (cellType === "explosive") img = explosiveImg;
        ctx.drawImage(
          img,
          (bunker.x + col) * gridSize,
          (bunker.y + row) * gridSize,
          gridSize, gridSize
        );
      }
    }
  }
}
function allBunkerCellsMissing() {
  return bunkers.every(bunker =>
    bunker.cells.every(row => row.every(cell => !cell || cell === "indestruct"))
  );
}

// --- 5. INVADER LOGIC & WAVES ---
function spawnInvaderGrid() {
  invaders = [];
  for (let row = 0; row < 10; row++) {
    const rowEmojis = [];
    while (rowEmojis.length < 5) {
      const emoji = emojiBank[Math.floor(Math.random() * emojiBank.length)];
      if (!rowEmojis.includes(emoji)) rowEmojis.push(emoji);
    }
    for (let col = 0; col < 5; col++) {
      let type = "normal";
      let health = 1;
      let speed = 1;
      if (Math.random() < 0.09) {
        type = "boss";
        health = 5 + Math.floor(wave / 2);
        speed = 0.5 + wave * 0.05;
      } else if (Math.random() < 0.15) {
        // Faster or double-health
        type = "fast";
        speed = 2 + wave * 0.1;
      } else if (Math.random() < 0.15) {
        type = "strong";
        health = 2 + Math.floor(wave / 3);
      }
      invaders.push({
        x: col * 2 + 2,
        y: row + 1,
        emoji: rowEmojis[col],
        type: type,
        health: health,
        speed: speed
      });
    }
  }
}

// --- 6. POWERUPS ---
const POWERUPS = [
  { id: "life", emoji: "💚", desc: "Extra Life" },
  { id: "rapid", emoji: "🚀", desc: "Rapid Fire" },
  { id: "shield", emoji: "🛡️", desc: "Shield" },
  { id: "wide", emoji: "🔥", desc: "Wide Shot" },
  { id: "smart", emoji: "💣", desc: "Smart Bomb" }
];
let powerups = [];

// --- 7. DRAW LOGIC ---
function drawEmoji(x, y, emoji, flicker = false, customSize = null, color = null) {
  ctx.save();
  ctx.font = (customSize ? customSize : gridSize) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Noto Emoji','Segoe UI Symbol','Orbitron',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (flicker) ctx.globalAlpha = Math.abs(Math.sin(Date.now() / 150));
  if (color) ctx.fillStyle = color;
  ctx.fillText(emoji, x * gridSize + gridSize / 2, y * gridSize + gridSize / 2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// --- 8. GAME STATE RESET ---
function resetBunkers() { bunkers = buildBunkers(); }
function resetGame() {
  score = 0;
  lives = MAX_LIVES;
  smartBombs = SMART_BOMB_LIMIT;
  wave = 1;
  unlockedAchievements = [];
  player.x = 10; player.y = tileCount - 1; player.speedCounter = 0;
  player.shield = false; player.rapidFire = false; player.wideShot = false;
  bullets = []; bombs = []; powerups = [];
  spawnInvaderGrid(); resetBunkers();
  combo = 0; comboTimer = null;
  timer = timedMode ? 120 : 0; // 2 min if timed
  updateHUD();
}

// --- 9. GAME OVER, LIVES, LEADERBOARD, ACHIEVEMENTS ---
function unlockAchievement(id) {
  if (!unlockedAchievements.includes(id)) {
    unlockedAchievements.push(id);
    achievementsDisplay.innerHTML += `<div class="achievement">🏆 ${ACHIEVEMENTS.find(a => a.id === id).desc}</div>`;
  }
}
function updateHUD() {
  scoreDisplay.textContent = `Score: ${score}`;
  highScoreDisplay.textContent = `High Score: ${highScore}`;
  livesDisplay.textContent = `Lives: ${lives}`;
  smartBombDisplay.textContent = `${"💣".repeat(smartBombs)}`;
  powerupDisplay.textContent = [
    player.rapidFire ? "🚀" : "",
    player.shield ? "🛡️" : "",
    player.wideShot ? "🔥" : ""
  ].join(" ");
}
function updateLeaderboard() {
  leaderboardDisplay.innerHTML = "<h3>TOP 5</h3>";
  leaderboard.slice(0,5).forEach((entry,i) => {
    leaderboardDisplay.innerHTML += `<div>${i+1}. ${entry.name||"YOU"}: ${entry.score}</div>`;
  });
}
function saveLeaderboard(name = "YOU") {
  leaderboard.push({ name, score });
  leaderboard.sort((a,b) => b.score - a.score);
  leaderboard = leaderboard.slice(0,5);
  localStorage.setItem("leaderboard", JSON.stringify(leaderboard));
  updateLeaderboard();
}
function nextWave() {
  wave++;
  invaderSpeed = Math.max(10, 40 - wave*2);
  smartBombs = Math.min(SMART_BOMB_LIMIT, smartBombs+1);
  spawnInvaderGrid();
  let perfect = !bunkers.some(b=>b.cells.some(row=>row.some(cell=>cell!=="indestruct" && !cell)));
  if (perfect) unlockAchievement("perfect_wave");
  resetBunkers();
  combo = 0;
  updateHUD();
}
function gameOver(win = false) {
  if (!win) lives--;
  if (lives > 0 && !win) {
    overlay.textContent = `Life Lost! ${lives} remaining`;
    overlay.style.display = "block";
    setTimeout(() => {
      overlay.style.display = "none";
      isPaused = false;
      reqId = requestAnimationFrame(gameLoop);
    }, 1000);
    bullets = []; bombs = [];
    player.x = 10; player.y = tileCount - 1;
    return;
  }
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("high_score", highScore);
    unlockAchievement("high_score");
  }
  saveLeaderboard();
  updateLeaderboard();
  gameOverOverlay.innerHTML = win
    ? `<h2>YOU WIN!</h2><div>Score: ${score}</div><div>Wave: ${wave}</div>`
    : `<h2>GAME OVER</h2><div>Score: ${score}</div><div>Wave: ${wave}</div>`;
  gameOverOverlay.style.display = 'flex';
  setTimeout(() => {
    gameOverOverlay.style.display = 'none';
    resetGame();
    isPaused = false;
    reqId = requestAnimationFrame(gameLoop);
  }, 2000);
}

// --- 10. KEYBOARD, TOUCH, & MOBILE CONTROLS ---
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') right = true;
  if (e.key === ' ' || e.key === 'z' || e.key === 'j') shooting = true;
  if (e.key.toLowerCase() === 'p') togglePause();
  if (e.key.toLowerCase() === 'b' && smartBombs > 0) useSmartBomb();
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') right = false;
  if (e.key === ' ' || e.key === 'z' || e.key === 'j') shooting = false;
});
canvas.addEventListener('touchstart', e => {
  let x = e.touches[0].clientX - canvas.getBoundingClientRect().left;
  if (x < canvas.width/3) touchLeft = true;
  else if (x > 2*canvas.width/3) touchRight = true;
  else touchShoot = true;
});
canvas.addEventListener('touchend', e => {
  touchLeft = touchRight = touchShoot = false;
});

// --- 11. BONUS EMOJI ACROSS TOP LINE (200% SLOWER) ---
let bonusEmoji = null;
let bonusTimer = 0;
function maybeSpawnBonusEmoji() {
  if (bonusEmoji !== null) return;
  if (Math.random() < 1/240) {
    const fromLeft = Math.random() < 0.5;
    const idx = Math.floor(Math.random() * emojiBank.length);
    bonusEmoji = {
      emoji: emojiBank[idx],
      x: fromLeft ? 0 : tileCount - 1,
      y: 0,
      dir: fromLeft ? 1 : -1,
      speed: (0.5 + Math.random()) / 3,
      progress: 0,
      bankIndex: idx
    };
  }
}
function updateBonusEmoji() {
  if (!bonusEmoji) return;
  bonusEmoji.progress += bonusEmoji.speed;
  if (bonusEmoji.progress >= 1) {
    bonusEmoji.x += bonusEmoji.dir;
    bonusEmoji.progress = 0;
  }
  if (bonusEmoji.x < 0 || bonusEmoji.x >= tileCount) {
    bonusEmoji = null;
  }
}
function drawBonusEmoji() {
  if (!bonusEmoji) return;
  let drawX = bonusEmoji.x + bonusEmoji.dir * bonusEmoji.progress;
  drawEmoji(drawX, bonusEmoji.y, bonusEmoji.emoji, true, gridSize + 8);
}
function handleBulletBonusCollision() {
  if (!bonusEmoji) return;
  let hit = false;
  bullets = bullets.filter(b => {
    if (
      Math.round(b.x) === Math.round(bonusEmoji.x) &&
      b.y === bonusEmoji.y
    ) {
      let pts = emojiBonusScores[bonusEmoji.emoji] || 1000;
      score += pts;
      unlockAchievement("first_bonus");
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("high_score", highScore);
      }
      bonusTimer = 30;
      bonusEmoji.showScore = pts;
      hit = true;
      return false;
    }
    return true;
  });
  if (hit) {
    setTimeout(() => {
      bonusEmoji = null;
    }, 300);
  }
}
function drawBonusScore() {
  if (bonusEmoji && bonusEmoji.showScore && bonusTimer > 0) {
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "yellow";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    let drawX = (bonusEmoji.x + bonusEmoji.dir * bonusEmoji.progress) * gridSize + gridSize / 2;
    ctx.fillText("+" + bonusEmoji.showScore, drawX, (bonusEmoji.y + 1) * gridSize - 2);
    bonusTimer--;
    if (bonusTimer <= 0) {
      bonusEmoji.showScore = null;
    }
  }
}

// --- 12. SMART BOMB ---
function useSmartBomb() {
  if (smartBombs <= 0) return;
  smartBombs--;
  bombs = [];
  invaders = invaders.filter(i => i.type === "boss");
  // Play sound, flash, or add particles here!
  updateHUD();
}

// --- 13. POWERUP LOGIC ---
function spawnPowerup(x, y) {
  // Choose at random from POWERUPS
  let idx = Math.floor(Math.random() * POWERUPS.length);
  powerups.push({ ...POWERUPS[idx], x, y, vy: 0.2 + Math.random()*0.3 });
}
function drawPowerups() {
  for (const p of powerups) {
    drawEmoji(p.x, p.y, p.emoji, false, gridSize+2);
  }
}
function updatePowerups() {
  for (let p of powerups) {
    p.y += p.vy;
  }
  // Remove if off screen
  powerups = powerups.filter(p => p.y < tileCount);
}
function checkPowerupPickup() {
  powerups = powerups.filter(p => {
    if (Math.round(p.x) === player.x && Math.round(p.y) === player.y) {
      activatePowerup(p.id);
      return false;
    }
    return true;
  });
}
function activatePowerup(id) {
  if (id === "life" && lives < MAX_LIVES) lives++;
  if (id === "rapid") {
    player.rapidFire = true;
    setTimeout(() => player.rapidFire = false, 7000);
  }
  if (id === "shield") {
    player.shield = true;
    setTimeout(() => player.shield = false, 7000);
  }
  if (id === "wide") {
    player.wideShot = true;
    setTimeout(() => player.wideShot = false, 7000);
  }
  if (id === "smart") smartBombs++;
  updateHUD();
}

// --- 14. PARTICLE EFFECTS ---
let particles = [];
function addExplosion(x, y, color = "orange", count = 10) {
  for (let i=0; i<count; i++) {
    particles.push({
      x: x*gridSize+gridSize/2,
      y: y*gridSize+gridSize/2,
      dx: (Math.random()-0.5)*2,
      dy: (Math.random()-0.5)*2,
      color: color,
      life: 20+Math.random()*10
    });
  }
}
function drawParticles() {
  for (let p of particles) {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, p.life/25);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  particles = particles.filter(p => {
    p.x += p.dx;
    p.y += p.dy;
    p.dy += 0.06;
    p.life--;
    return p.life > 0;
  });
}

// --- 15. MAIN GAME LOOP ---
let isPaused = false;
let reqId = null;
function togglePause() {
  if (isPaused) {
    isPaused = false;
    overlay.style.display = "none";
    reqId = requestAnimationFrame(gameLoop);
  } else {
    isPaused = true;
    overlay.textContent = "PAUSED";
    overlay.style.display = "block";
    if (reqId) cancelAnimationFrame(reqId);
  }
}

function gameLoop() {
  if (isPaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- BUNKERS (moving) ---
  movingBunkerPhase += 0.01;
  for (let bunker of bunkers) {
    if (bunker.moving) bunker.x += Math.sin(movingBunkerPhase)/40;
    drawBunker(bunker);
    if (bunker.moving) bunker.x -= Math.sin(movingBunkerPhase)/40;
  }

  // --- Player movement (slowed) ---
  player.speedCounter++;
  let move = left || touchLeft ? -1 : right || touchRight ? 1 : 0;
  if (player.speedCounter >= 4) {
    if (move && player.x+move >= 0 && player.x+move < tileCount) player.x += move;
    player.speedCounter = 0;
  }

  // --- Firing (powerups) ---
  if (bulletCooldown > 0) bulletCooldown--;
  let maxBullets = MAX_BULLETS + (player.rapidFire ? 2 : 0);
  if ((shooting || touchShoot) && bulletCooldown === 0 && bullets.length < maxBullets) {
    bullets.push({ x: player.x, y: player.y - 1, dx: 0 });
    if (player.wideShot) {
      bullets.push({ x: player.x-1, y: player.y-1, dx: -0.3 });
      bullets.push({ x: player.x+1, y: player.y-1, dx: 0.3 });
    }
    bulletCooldown = player.rapidFire ? 4 : 15;
    sounds.shoot && sounds.shoot.play();
  }

  // --- Bullets movement ---
  bullets = bullets.map(b => ({ x: b.x+b.dx, y: b.y-1, dx: b.dx })).filter(b => b.y >= 0);

  // --- Bombs movement ---
  bombs = bombs.map(b => ({ x: b.x, y: b.y + 1, emoji: b.emoji })).filter(b => b.y < tileCount);

  // --- Invader movement ---
  invaderTick++;
  if (invaderTick >= invaderSpeed) {
    let hitEdge = false;
    for (let i = 0; i < invaders.length; i++) {
      let inv = invaders[i];
      inv.x += invaderDir * (inv.speed || 1);
      if (inv.x <= 0 || inv.x >= tileCount - 1) hitEdge = true;
      // Bombs drop randomly
      if (Math.random() < 0.004 * (inv.type==="fast"?2:(inv.type==="boss"?0.5:1))) {
        const bombEmoji = emojiBank[Math.floor(Math.random() * emojiBank.length)];
        bombs.push({ x: Math.round(inv.x), y: Math.round(inv.y), emoji: bombEmoji });
      }
    }
    if (hitEdge) {
      invaderDir *= -1;
      for (let i = 0; i < invaders.length; i++) invaders[i].y += 1;
    }
    invaderTick = 0;
  }

  // --- Invader/Player collision (loss) ---
  if (invaders.some(inv => Math.round(inv.y) >= player.y)) {
    gameOver(false);
    return;
  }

  // --- Bullet/Invader collision ---
  bullets = bullets.filter((b, i) => {
    for (let j = 0; j < invaders.length; j++) {
      const inv = invaders[j];
      if (Math.round(b.x) == Math.round(inv.x) && Math.round(b.y) == Math.round(inv.y)) {
        inv.health--;
        if (inv.health <= 0) {
          // Boss defeat achievement
          if (inv.type === "boss") unlockAchievement("boss_defeat");
          addExplosion(inv.x, inv.y, inv.type==="boss"?"purple":"orange", inv.type==="boss"?30:10);
          score += inv.type === "boss" ? 250 : inv.type === "fast" ? 30 : inv.type === "strong" ? 50 : 10;
          // Powerup drop
          if (Math.random() < POWERUP_DROP_RATE) spawnPowerup(inv.x, inv.y);
          invaders.splice(j, 1);
          // Combo logic
          combo++;
          if (combo === 5) unlockAchievement("combo_5");
          if (comboTimer) clearTimeout(comboTimer);
          comboTimer = setTimeout(() => combo = 0, COMBO_TIME);
          if (score > highScore) {
            highScore = score;
            localStorage.setItem("high_score", highScore);
          }
        }
        return false;
      }
    }
    return true;
  });

  // --- Bomb/Bunker/Player collision ---
  let bombsAfter = [];
  let bunkerCellHit = false;
  for (let b of bombs) {
    let hit = false;
    for (const bunker of bunkers) {
      for (let row = 0; row < bunker.height; row++) {
        for (let col = 0; col < bunker.width; col++) {
          if (
            bunker.cells[row][col] &&
            b.x >= bunker.x + col - 0.2 && b.x <= bunker.x + col + 0.2 &&
            b.y === bunker.y + row
          ) {
            let type = bunker.cells[row][col];
            if (type === "indestruct") {
              // Indestructible: do nothing
              hit = true;
            } else if (type === "explosive") {
              // Explosive: break all 3x3 around
              for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
                let rr=row+dr, cc=col+dc;
                if (rr>=0 && rr<BUNKER_H && cc>=0 && cc<BUNKER_W) bunker.cells[rr][cc] = false;
              }
              addExplosion(bunker.x+col, bunker.y+row, "red", 18);
              hit = true;
              bunkerCellHit = true;
            } else {
              bunker.cells[row][col] = false;
              addExplosion(bunker.x+col, bunker.y+row, "gray", 6);
              hit = true;
              bunkerCellHit = true;
            }
          }
        }
      }
    }
    if (hit) continue;
    if (b.x === player.x && b.y === player.y) {
      if (player.shield) {
        player.shield = false;
        addExplosion(player.x, player.y, "blue", 12);
        updateHUD();
        continue;
      }
      gameOver(false);
      return;
    }
    bombsAfter.push(b);
  }
  bombs = bombsAfter;
  if (bunkerCellHit) {
    gameOver(false);
    return;
  }

  // --- Bullets/Bunker collision ---
  let bulletsAfter = [];
  for (let b of bullets) {
    let hit = false;
    for (const bunker of bunkers) {
      for (let row = 0; row < bunker.height; row++) {
        for (let col = 0; col < bunker.width; col++) {
          if (
            bunker.cells[row][col] &&
            Math.round(b.x) === bunker.x + col && Math.round(b.y) === bunker.y + row
          ) {
            if (bunker.cells[row][col] === "indestruct") {
              // Do nothing
            } else if (bunker.cells[row][col] === "explosive") {
              for (let dr=-1; dr<=1; dr++) for (let dc=-1; dc<=1; dc++) {
                let rr=row+dr, cc=col+dc;
                if (rr>=0 && rr<BUNKER_H && cc>=0 && cc<BUNKER_W) bunker.cells[rr][cc] = false;
              }
              addExplosion(bunker.x+col, bunker.y+row, "red", 18);
            } else {
              bunker.cells[row][col] = false;
              addExplosion(bunker.x+col, bunker.y+row, "gray", 6);
            }
            hit = true;
          }
        }
      }
    }
    if (!hit) bulletsAfter.push(b);
  }
  bullets = bulletsAfter;

  // --- Bonus emoji logic ---
  maybeSpawnBonusEmoji();
  updateBonusEmoji();
  drawBonusEmoji();
  handleBulletBonusCollision();
  drawBonusScore();

  // --- Powerups ---
  drawPowerups();
  updatePowerups();
  checkPowerupPickup();

  // --- Particles ---
  drawParticles();

  // --- Draw player ---
  drawEmoji(player.x, player.y, "💩", false, gridSize+2, player.shield?"#55f":"#fff");

  // --- Draw bullets ---
  bullets.forEach(b => drawEmoji(b.x, b.y, "💥", false, gridSize-4));

  // --- Draw bombs ---
  bombs.forEach(b => drawEmoji(b.x, b.y, b.emoji, true));

  // --- Draw invaders ---
  invaders.forEach(inv => drawEmoji(inv.x, inv.y, inv.emoji, inv.type === "boss", inv.type === "boss"?gridSize+6:gridSize, inv.type === "boss"?"purple":inv.type==="fast"?"lime":inv.type==="strong"?"red":undefined));

  // --- Combo display ---
  if (combo > 1) {
    ctx.font = "bold 18px Arial";
    ctx.fillStyle = "gold";
    ctx.textAlign = "left";
    ctx.fillText(`COMBO x${combo}`, 10, 24);
  }

  // --- Win/next wave ---
  if (invaders.length === 0) {
    if (endlessMode || timedMode) nextWave();
    else gameOver(true);
    return;
  }

  // --- Game Over if all bunkers gone and a bomb reaches player ---
  if (allBunkerCellsMissing()) {
    for (let b of bombs) {
      if (Math.round(b.x) === player.x && b.y === player.y) {
        unlockAchievement("no_bunker");
        gameOver(false);
        return;
      }
    }
  }

  updateHUD();
  reqId = requestAnimationFrame(gameLoop);
}

// --- 16. INIT ---
updateHUD();
updateLeaderboard();
resetGame();
gameLoop();

// --- 17. UI BUTTONS & EVENTS ---
document.getElementById("pauseBtn").onclick = togglePause;
document.getElementById("muteBtn").onclick = () => {
  radio.muted = !radio.muted;
  document.getElementById("muteBtn").textContent = radio.muted ? "🔇" : "🔊";
};
document.getElementById("toggleRadio").onclick = () => {
  if (radio.paused) {
    radio.play();
    document.getElementById("toggleRadio").textContent = "Radio OFF";
  } else {
    radio.pause();
    document.getElementById("toggleRadio").textContent = "Radio ON";
  }
};
document.getElementById("loginBtn").onclick = () => {
  document.getElementById("loginPopup").style.display = "block";
};
document.getElementById("closeLoginPopup").onclick = () => {
  document.getElementById("loginPopup").style.display = "none";
};
window.addEventListener('keydown', function(e) {
  if (e.key === "Escape") {
    const popup = document.getElementById("loginPopup");
    if (popup && popup.style.display === "block") {
      popup.style.display = "none";
    }
  }
});
document.getElementById("speedSelect").onchange = (e) => {
  invaderSpeed = Number(e.target.value);
};
