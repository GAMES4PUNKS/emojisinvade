// Emoji Invaders Game

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

const emojiBonusScores = {};
for (let i = 0; i < emojiBank.length; i++)
  emojiBonusScores[emojiBank[i]] = 1000 + i * 50;

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 400;
canvas.height = 400;

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let score = 0;
let highScore = Number(localStorage.getItem("high_score") || 0);

const player = { x: 10, y: tileCount - 1, speedCounter: 0 };
let playerLives = 3;

let bullets = [];
let bombs = [];
let invaders = [];
let invaderDir = 1;
let invaderSpeed = 40;
let invaderTick = 0;
let bulletCooldown = 0;

const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const overlay = document.getElementById("overlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const radio = document.getElementById("radioStream");

// Load barrier (BASE.png)
const shitImg = new Image();
shitImg.src = 'BASE.png';

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
const BUNKER_W = 3, BUNKER_H = 3;
function makeCells() {
  return Array.from({length: BUNKER_H}, () => Array(BUNKER_W).fill(true));
}
function buildBunkers() {
  const y = getBunkerY();
  const xs = getBunkerXs();
  return [
    { x: xs[0] - 1, y, width: BUNKER_W, height: BUNKER_H, cells: makeCells() },
    { x: xs[1] - 1, y, width: BUNKER_W, height: BUNKER_H, cells: makeCells() },
    { x: xs[2] - 1, y, width: BUNKER_W, height: BUNKER_H, cells: makeCells() }
  ];
}
let bunkers = buildBunkers();

function drawBunker(bunker) {
  for (let row = 0; row < bunker.height; row++) {
    for (let col = 0; col < bunker.width; col++) {
      if (bunker.cells[row][col]) {
        ctx.drawImage(
          shitImg,
          (bunker.x + col) * gridSize,
          (bunker.y + row) * gridSize,
          gridSize, gridSize
        );
      }
    }
  }
}

// Add a phase parameter for independent flicker
function drawEmoji(x, y, emoji, flicker = false, customSize = null, phase = 0) {
  ctx.font = (customSize ? customSize : gridSize) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Noto Emoji','Segoe UI Symbol','Orbitron',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (flicker) ctx.globalAlpha = Math.abs(Math.sin(Date.now() / 150 + phase));
  ctx.fillText(emoji, x * gridSize + gridSize / 2, y * gridSize + gridSize / 2);
  ctx.globalAlpha = 1;
}

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

// Assign a random phase to each invader for independent flicker
function spawnInvaderGrid() {
  invaders = [];
  for (let row = 0; row < 10; row++) {
    const rowEmojis = [];
    while (rowEmojis.length < 5) {
      const emoji = emojiBank[Math.floor(Math.random() * emojiBank.length)];
      if (!rowEmojis.includes(emoji)) rowEmojis.push(emoji);
    }
    for (let col = 0; col < 5; col++) {
      invaders.push({
        x: col * 2 + 2,
        y: row + 1,
        emoji: rowEmojis[col],
        flickerPhase: Math.random() * Math.PI * 2 // random phase
      });
    }
  }
}
spawnInvaderGrid();

let left = false, right = false, shooting = false;

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') right = true;
  if (e.key === ' ' || e.key === 'z' || e.key === 'j') shooting = true;
  if (e.key.toLowerCase() === 'p') togglePause();
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') right = false;
  if (e.key === ' ' || e.key === 'z' || e.key === 'j') shooting = false;
});

function resetBunkers() {
  bunkers = buildBunkers();
}

function resetGame() {
  score = 0;
  bullets = [];
  bombs = [];
  player.x = 10;
  player.y = tileCount - 1;
  player.speedCounter = 0;
  playerLives = 3;
  invaderSpeed = 40; // Reset speed on new game
  spawnInvaderGrid();
  resetBunkers();
  updateHUD();
}

function loseLifeOrGameOver() {
  playerLives--;
  updateHUD();
  if (playerLives <= 0) {
    gameOverOverlay.style.display = 'flex';
    setTimeout(() => {
      gameOverOverlay.style.display = 'none';
      resetGame();
      isPaused = false;
      reqId = requestAnimationFrame(gameLoop);
    }, 1500);
  } else {
    player.x = 10;
    player.y = tileCount - 1;
    player.speedCounter = 0;
    bombs = bombs.filter(b => b.y < player.y);
    bullets = [];
    setTimeout(() => {
      reqId = requestAnimationFrame(gameLoop);
    }, 500);
    isPaused = true;
    overlay.textContent = "💥 Ouch! 💥";
    overlay.style.display = "block";
    setTimeout(() => {
      overlay.style.display = "none";
      isPaused = false;
    }, 400);
  }
}

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

// --- BONUS EMOJI ACROSS TOP LINE (SLOWER, Adaptive Speed) ---
let bonusEmoji = null;
let bonusTimer = 0;
let bonusSpeedupHits = 0;
let firstBonusSpawned = false;

function maybeSpawnBonusEmoji() {
  if (bonusEmoji !== null) return;
  if (Math.random() < 1/240) {
    const fromLeft = Math.random() < 0.5;
    const idx = Math.floor(Math.random() * emojiBank.length);
    let speed;
    if (!firstBonusSpawned) {
      speed = 0.05;
      firstBonusSpawned = true;
    } else {
      speed = 0.15;
      if (bonusSpeedupHits > 5) {
        speed = 0.15 * Math.pow(1.1, bonusSpeedupHits - 5);
      }
    }
    bonusEmoji = {
      emoji: emojiBank[idx],
      x: fromLeft ? 0 : tileCount - 1,
      y: 0,
      dir: fromLeft ? 1 : -1,
      speed: speed,
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
    bonusSpeedupHits++;
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

function gameLoop() {
  if (isPaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  bunkers.forEach(drawBunker);

  player.speedCounter++;
  if (player.speedCounter >= 4) {
    if (left && player.x > 0) player.x--;
    if (right && player.x < tileCount - 1) player.x++;
    player.speedCounter = 0;
  }

  if (bulletCooldown > 0) bulletCooldown--;
  if (shooting && bulletCooldown === 0 && bullets.length < 3) {
    bullets.push({ x: player.x, y: player.y - 1 });
    bulletCooldown = 15;
  }

  // --- Bullet-bunker collision before moving bullets ---
  let bulletsAfter = [];
  for (let b of bullets) {
    let hit = false;
    for (const bunker of bunkers) {
      for (let row = 0; row < bunker.height; row++) {
        for (let col = 0; col < bunker.width; col++) {
          if (
            bunker.cells[row][col] &&
            b.x === bunker.x + col && b.y === bunker.y + row
          ) {
            bunker.cells[row][col] = false;
            hit = true;
          }
        }
      }
    }
    if (!hit) bulletsAfter.push(b);
  }
  bullets = bulletsAfter;

  // Now move bullets up
  bullets = bullets.map(b => ({ x: b.x, y: b.y - 1 })).filter(b => b.y >= 0);

  // Bombs: 200% slower, always "✨"
  if (!window.bombFrame) window.bombFrame = 0;
  window.bombFrame = (window.bombFrame + 1) % 2;
  if (window.bombFrame === 0) {
    bombs = bombs.map(b => ({ x: b.x, y: b.y + 1 })).filter(b => b.y < tileCount);
  }

  invaderTick++;
  if (invaderTick >= invaderSpeed) {
    let hitEdge = false;
    for (let i = 0; i < invaders.length; i++) {
      invaders[i].x += invaderDir;
      if (invaders[i].x <= 0 || invaders[i].x >= tileCount - 1) hitEdge = true;
      // Bombs always "✨"
      if (Math.random() < 0.004) {
        bombs.push({ x: invaders[i].x, y: invaders[i].y, emoji: "✨" });
      }
    }
    if (hitEdge) {
      invaderDir *= -1;
      for (let i = 0; i < invaders.length; i++) {
        invaders[i].y += 1;
      }
    }
    invaderTick = 0;
  }

  // --- GAME OVER if any invader lands on the same line as player or any bunker cell still alive ---
  let bunkerRows = new Set();
  for (const bunker of bunkers) {
    for (let row = 0; row < bunker.height; row++) {
      for (let col = 0; col < bunker.width; col++) {
        if (bunker.cells[row][col]) {
          bunkerRows.add(bunker.y + row);
        }
      }
    }
  }
  for (let i = 0; i < invaders.length; i++) {
    if (
      invaders[i].y === player.y ||
      bunkerRows.has(invaders[i].y)
    ) {
      gameOverOverlay.style.display = 'flex';
      setTimeout(() => {
        gameOverOverlay.style.display = 'none';
        resetGame();
        isPaused = false;
        reqId = requestAnimationFrame(gameLoop);
      }, 1500);
      return;
    }
  }

  bullets = bullets.filter((b, i) => {
    for (let j = 0; j < invaders.length; j++) {
      const inv = invaders[j];
      if (b.x === inv.x && b.y === inv.y) {
        invaders.splice(j, 1);
        score += 10;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("high_score", highScore);
        }
        return false;
      }
    }
    return true;
  });

  let bombsAfter = [];
  for (let b of bombs) {
    let hit = false;
    for (const bunker of bunkers) {
      for (let row = 0; row < bunker.height; row++) {
        for (let col = 0; col < bunker.width; col++) {
          if (
            bunker.cells[row][col] &&
            b.x === bunker.x + col && b.y === bunker.y + row
          ) {
            bunker.cells[row][col] = false;
            hit = true;
          }
        }
      }
    }
    if (hit) continue;
    if (b.x === player.x && b.y === player.y) {
      loseLifeOrGameOver();
      return;
    }
    bombsAfter.push(b);
  }
  bombs = bombsAfter;

  maybeSpawnBonusEmoji();
  updateBonusEmoji();
  drawBonusEmoji();
  handleBulletBonusCollision();
  drawBonusScore();

  drawEmoji(player.x, player.y, "💩");
  bullets.forEach(b => drawEmoji(b.x, b.y, "💥"));
  bombs.forEach(b => drawEmoji(b.x, b.y, "✨", true));
  // Draw each invader with its independent flicker phase
  invaders.forEach(inv => drawEmoji(inv.x, inv.y, inv.emoji, true, null, inv.flickerPhase));

  // Speed up invaders after each wave cleared
  if (invaders.length === 0) {
    invaderSpeed = Math.max(1, invaderSpeed - 0.5);
    spawnInvaderGrid();
  }

  updateHUD();
  reqId = requestAnimationFrame(gameLoop);
}

updateHUD();
gameLoop();

// --- UI Buttons etc ---
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
