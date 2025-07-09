// Safe cross-platform emoji bank for your game
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

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = 400;
canvas.height = 400;

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let score = 0;
let highScore = Number(localStorage.getItem("high_score") || 0);

const player = { x: 10, y: 19, speedCounter: 0 };
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

// BUNKERS/BARRIERS using BASE.png
const shitImg = new Image();
shitImg.src = 'BASE.png';

// Bunker definitions: 3 barriers, fixed X, fixed Y above player line, with health
const bunkers = [
  { x: 4, y: tileCount - 3, health: 3, maxHealth: 3 },
  { x: Math.floor(tileCount / 2), y: tileCount - 3, health: 3, maxHealth: 3 },
  { x: tileCount - 5, y: tileCount - 3, health: 3, maxHealth: 3 }
];

function drawBunker(bunker) {
  if (bunker.health <= 0) return;
  // Responsive: 1/5 of canvas width (as in the screenshot)
  const size = Math.floor(canvas.width / 5);
  ctx.save();
  ctx.globalAlpha = Math.max(0.5, bunker.health / bunker.maxHealth); // fade if damaged
  ctx.drawImage(
    shitImg,
    bunker.x * gridSize + gridSize / 2 - size / 2,
    bunker.y * gridSize + gridSize / 2 - size / 2,
    size,
    size
  );
  ctx.restore();
}

// Responsive emoji draw for player and game objects
function drawEmoji(x, y, emoji, flicker = false) {
  ctx.font = `${gridSize}px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Noto Emoji','Segoe UI Symbol','Orbitron',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (flicker) ctx.globalAlpha = Math.abs(Math.sin(Date.now() / 150));
  ctx.fillText(emoji, x * gridSize + gridSize / 2, y * gridSize + gridSize / 2);
  ctx.globalAlpha = 1;
}

function updateHUD() {
  scoreDisplay.textContent = `Score: ${score}`;
  highScoreDisplay.textContent = `High Score: ${highScore}`;
}

function spawnInvaderGrid() {
  invaders = [];
  for (let row = 0; row < 10; row++) {
    const rowEmojis = [];
    while (rowEmojis.length < 5) {
      const emoji = emojiBank[Math.floor(Math.random() * emojiBank.length)];
      if (!rowEmojis.includes(emoji)) rowEmojis.push(emoji);
    }
    for (let col = 0; col < 5; col++) {
      invaders.push({ x: col * 2 + 2, y: row + 1, emoji: rowEmojis[col] });
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
  for (const bunker of bunkers) {
    bunker.health = bunker.maxHealth;
  }
}

function resetGame() {
  score = 0;
  bullets = [];
  bombs = [];
  player.x = 10;
  player.y = 19;
  player.speedCounter = 0;
  spawnInvaderGrid();
  resetBunkers();
  updateHUD();
}

function gameOver() {
  gameOverOverlay.style.display = 'flex';
  setTimeout(() => {
    gameOverOverlay.style.display = 'none';
    resetGame();
    isPaused = false;
    reqId = requestAnimationFrame(gameLoop);
  }, 1500);
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

function gameLoop() {
  if (isPaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw bunkers first (so they're under bullets/bombs/player)
  bunkers.forEach(drawBunker);

  // Player movement (slowed)
  player.speedCounter++;
  if (player.speedCounter >= 4) {
    if (left && player.x > 0) player.x--;
    if (right && player.x < tileCount - 1) player.x++;
    player.speedCounter = 0;
  }

  // Firing cooldown
  if (bulletCooldown > 0) bulletCooldown--;
  if (shooting && bulletCooldown === 0 && bullets.length < 3) {
    bullets.push({ x: player.x, y: player.y - 1 });
    bulletCooldown = 15;
  }

  bullets = bullets.map(b => ({ x: b.x, y: b.y - 1 })).filter(b => b.y >= 0);
  bombs = bombs.map(b => ({ x: b.x, y: b.y + 1 })).filter(b => b.y < tileCount);

  // Invader movement
  invaderTick++;
  if (invaderTick >= invaderSpeed) {
    let hitEdge = false;
    for (let i = 0; i < invaders.length; i++) {
      invaders[i].x += invaderDir;
      if (invaders[i].x <= 0 || invaders[i].x >= tileCount - 1) hitEdge = true;
      if (Math.random() < 0.002) bombs.push({ x: invaders[i].x, y: invaders[i].y });
    }
    if (hitEdge) {
      invaderDir *= -1;
      for (let i = 0; i < invaders.length; i++) {
        invaders[i].y += 1;
      }
    }
    invaderTick = 0;
  }

  // Bullet <-> Invader collision
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

  // Bomb collision: check bunkers first!
  let bombsAfter = [];
  for (let b of bombs) {
    let hit = false;
    for (const bunker of bunkers) {
      if (
        bunker.health > 0 &&
        b.x >= bunker.x - 1 && b.x <= bunker.x + 1 && // 3-tile wide hitbox
        b.y === bunker.y
      ) {
        bunker.health -= 1;
        hit = true;
        break;
      }
    }
    if (hit) continue; // bomb destroyed by bunker
    if (b.x === player.x && b.y === player.y) {
      gameOver();
      return;
    }
    bombsAfter.push(b);
  }
  bombs = bombsAfter;

  // Draw player as small emoji
  drawEmoji(player.x, player.y, "💩");

  // Draw bullets/bombs/invaders
  bullets.forEach(b => drawEmoji(b.x, b.y, "💥"));
  bombs.forEach(b => drawEmoji(b.x, b.y, "⚡️", true));
  invaders.forEach(inv => drawEmoji(inv.x, inv.y, inv.emoji, true));

  if (invaders.length === 0) spawnInvaderGrid();

  updateHUD();
  reqId = requestAnimationFrame(gameLoop);
}

updateHUD();
gameLoop();

// UI Buttons

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

// Speed select (makes invaders move faster/slower)
document.getElementById("speedSelect").onchange = (e) => {
  invaderSpeed = Number(e.target.value);
};
