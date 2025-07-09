// === Classic Emoji Invaders ===
// Core logic, no advanced features.

const emojiBank = [
  "😀","😃","😄","😁","😆","😅","😂","😊","😇","😉","🙂","🙃","😋","😎",
  "😍","🥰","😘","😗","😙","😚","🤑","😐","😑","😶","🙄","😏","🤓",
  "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸",
  "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚚","🚛","🚜",
  "🍏","🍎","🍐","🍊","🍋","🍉","🍇","🍓","🍒","🍑","🥭","🍍",
  "🧁","🍰","🍔","🍟","🍕","🌭","🍩","🍪",
  "⚽️","🏀","🏈","⚾️","🥎","🏐","🎱","🎲",
  "❤️","🧡","💛","💚","💙","💜","🤍","🤎","💔"
];

// --- Canvas setup ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 400;
canvas.height = 400;
const gridSize = 20;
const tileCount = canvas.width / gridSize;

// --- UI Elements ---
const overlay = document.getElementById("overlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");

// --- Game state ---
let score = 0;
let highScore = Number(localStorage.getItem("high_score") || 0);

const player = {
  x: 10,
  y: tileCount - 1,
  speedCounter: 0
};

let bullets = [];
let bombs = [];
let invaders = [];
let invaderDir = 1;
let invaderSpeed = 40;
let invaderTick = 0;
let bulletCooldown = 0;

let bunkers = [];
const BUNKER_W = 3, BUNKER_H = 2;

// --- Bunkers ---
function buildBunkers() {
  const y = tileCount - 5;
  const xs = [Math.round(tileCount * 1/6), Math.round(tileCount * 1/2), Math.round(tileCount * 5/6)];
  return xs.map(x =>
    ({
      x: x - 1,
      y,
      width: BUNKER_W,
      height: BUNKER_H,
      cells: Array.from({length: BUNKER_H}, () => Array(BUNKER_W).fill(true))
    })
  );
}
function drawBunker(bunker) {
  for (let row = 0; row < bunker.height; row++) {
    for (let col = 0; col < bunker.width; col++) {
      if (bunker.cells[row][col]) {
        ctx.fillStyle = "#7aaf7a";
        ctx.fillRect((bunker.x + col) * gridSize, (bunker.y + row) * gridSize, gridSize, gridSize);
      }
    }
  }
}

// --- Invaders ---
function spawnInvaderGrid() {
  invaders = [];
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      invaders.push({
        x: col * 2 + 2,
        y: row + 1,
        emoji: emojiBank[Math.floor(Math.random() * emojiBank.length)]
      });
    }
  }
}

// --- Bonus Emoji ---
let bonusEmoji = null;
let bonusTimer = 0;
function maybeSpawnBonusEmoji() {
  if (bonusEmoji !== null) return;
  if (Math.random() < 1/300) {
    const fromLeft = Math.random() < 0.5;
    bonusEmoji = {
      emoji: emojiBank[Math.floor(Math.random() * emojiBank.length)],
      x: fromLeft ? 0 : tileCount-1,
      y: 0,
      dir: fromLeft ? 1 : -1,
      speed: 0.2,
      progress: 0
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
  if (bonusEmoji.x < 0 || bonusEmoji.x >= tileCount)
    bonusEmoji = null;
}
function drawBonusEmoji() {
  if (!bonusEmoji) return;
  let drawX = bonusEmoji.x + bonusEmoji.dir * bonusEmoji.progress;
  ctx.save();
  ctx.font = (gridSize + 8) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = Math.abs(Math.sin(Date.now()/150));
  ctx.fillText(bonusEmoji.emoji, drawX * gridSize + gridSize/2, bonusEmoji.y * gridSize + gridSize/2);
  ctx.globalAlpha = 1;
  ctx.restore();
}
function handleBulletBonusCollision() {
  if (!bonusEmoji) return;
  bullets = bullets.filter(b => {
    if (
      Math.round(b.x) === Math.round(bonusEmoji.x) &&
      b.y === bonusEmoji.y
    ) {
      score += 500;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("high_score", highScore);
      }
      bonusTimer = 30;
      bonusEmoji.showScore = 500;
      return false;
    }
    return true;
  });
  if (bonusTimer > 0 && bonusEmoji) {
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "yellow";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    let drawX = (bonusEmoji.x + bonusEmoji.dir * bonusEmoji.progress) * gridSize + gridSize / 2;
    ctx.fillText("+500", drawX, (bonusEmoji.y + 1) * gridSize - 2);
    bonusTimer--;
    if (bonusTimer <= 0) {
      bonusEmoji = null;
    }
  }
}

// --- Reset ---
function resetBunkers() { bunkers = buildBunkers(); }
function resetGame() {
  score = 0;
  player.x = 10;
  player.y = tileCount - 1;
  player.speedCounter = 0;
  bullets = [];
  bombs = [];
  spawnInvaderGrid();
  resetBunkers();
  bonusEmoji = null;
  updateHUD();
}

// --- Draw ---
function drawEmoji(x, y, emoji, flicker = false, customSize = null) {
  ctx.save();
  ctx.font = (customSize ? customSize : gridSize) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (flicker) ctx.globalAlpha = Math.abs(Math.sin(Date.now()/150));
  ctx.fillText(emoji, x * gridSize + gridSize/2, y * gridSize + gridSize/2);
  ctx.globalAlpha = 1;
  ctx.restore();
}

// --- Main game loop ---
let left = false, right = false, shooting = false;
let reqId = null;
function gameOver(win = false) {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem("high_score", highScore);
  }
  gameOverOverlay.innerHTML = win
    ? `<h2>YOU WIN!</h2><div>Score: ${score}</div>`
    : `<h2>GAME OVER</h2><div>Score: ${score}</div>`;
  gameOverOverlay.style.display = 'flex';
  setTimeout(() => {
    gameOverOverlay.style.display = 'none';
    resetGame();
    reqId = requestAnimationFrame(gameLoop);
  }, 1800);
}

function updateHUD() {
  scoreDisplay.textContent = `Score: ${score}`;
  highScoreDisplay.textContent = `High Score: ${highScore}`;
}

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw bunkers
  for (let bunker of bunkers) drawBunker(bunker);

  // Player movement
  player.speedCounter++;
  let move = left ? -1 : right ? 1 : 0;
  if (player.speedCounter >= 4) {
    if (move && player.x + move >= 0 && player.x + move < tileCount) player.x += move;
    player.speedCounter = 0;
  }

  // Firing
  if (bulletCooldown > 0) bulletCooldown--;
  if (shooting && bulletCooldown === 0 && bullets.length < 3) {
    bullets.push({ x: player.x, y: player.y - 1 });
    bulletCooldown = 15;
  }

  // Bullets movement
  bullets = bullets.map(b => ({ x: b.x, y: b.y - 1 })).filter(b => b.y >= 0);

  // Bombs movement
  bombs = bombs.map(b => ({ x: b.x, y: b.y + 1, emoji: b.emoji })).filter(b => b.y < tileCount);

  // Invader movement
  invaderTick++;
  if (invaderTick >= invaderSpeed) {
    let hitEdge = false;
    for (let inv of invaders) {
      inv.x += invaderDir;
      if (inv.x <= 0 || inv.x >= tileCount-1) hitEdge = true;
      // Bombs drop randomly
      if (Math.random() < 0.01) {
        const bombEmoji = emojiBank[Math.floor(Math.random() * emojiBank.length)];
        bombs.push({ x: Math.round(inv.x), y: Math.round(inv.y), emoji: bombEmoji });
      }
    }
    if (hitEdge) {
      invaderDir *= -1;
      for (let inv of invaders) inv.y += 1;
    }
    invaderTick = 0;
  }

  // Invader/Player collision (loss)
  if (invaders.some(inv => Math.round(inv.y) >= player.y)) {
    gameOver(false);
    return;
  }

  // Bullet/Invader collision
  bullets = bullets.filter((b, i) => {
    for (let j = 0; j < invaders.length; j++) {
      const inv = invaders[j];
      if (Math.round(b.x) == Math.round(inv.x) && Math.round(b.y) == Math.round(inv.y)) {
        score += 10;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("high_score", highScore);
        }
        invaders.splice(j, 1);
        return false;
      }
    }
    return true;
  });

  // Bomb/Bunker/Player collision
  let bombsAfter = [];
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
            bunker.cells[row][col] = false;
            hit = true;
          }
        }
      }
    }
    if (hit) continue;
    if (b.x === player.x && b.y === player.y) {
      gameOver(false);
      return;
    }
    bombsAfter.push(b);
  }
  bombs = bombsAfter;

  // Bullets/Bunker collision
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
            bunker.cells[row][col] = false;
            hit = true;
          }
        }
      }
    }
    if (!hit) bulletsAfter.push(b);
  }
  bullets = bulletsAfter;

  // Bonus emoji logic
  maybeSpawnBonusEmoji();
  updateBonusEmoji();
  drawBonusEmoji();
  handleBulletBonusCollision();

  // Draw player
  drawEmoji(player.x, player.y, "💩", false, gridSize + 2);

  // Draw bullets
  bullets.forEach(b => drawEmoji(b.x, b.y, "💥", false, gridSize - 4));

  // Draw bombs
  bombs.forEach(b => drawEmoji(b.x, b.y, b.emoji, true));

  // Draw invaders
  invaders.forEach(inv => drawEmoji(inv.x, inv.y, inv.emoji));

  // Win/next wave
  if (invaders.length === 0) {
    gameOver(true);
    return;
  }

  updateHUD();
  reqId = requestAnimationFrame(gameLoop);
}

// --- Controls ---
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') right = true;
  if (e.key === ' ' || e.key === 'z' || e.key === 'j') shooting = true;
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') right = false;
  if (e.key === ' ' || e.key === 'z' || e.key === 'j') shooting = false;
});

// --- Init ---
resetGame();
gameLoop();
