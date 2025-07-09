// emoji invaders game - cross-platform emoji safe set
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

const player = { x: 10, y: tileCount - 1, speedCounter: 0 };
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

// Calculate y-position for bunkers: 40% closer to bottom (between previous and bottom)
function getBunkerY() {
  // tileCount-1 = bottom row, tileCount-5 = previous position
  // Interpolate: newY = previousY + 0.4*(bottomY - previousY)
  const previousY = tileCount - 5;
  const bottomY = tileCount - 2; // -1 for player, -2 for just above player
  return Math.round(previousY + 0.4 * (bottomY - previousY));
}

// Calculate evenly spaced x positions for 3 bunkers
function getBunkerXs() {
  // Use proportional positions for even spacing: 1/6, 1/2, 5/6 of width
  return [
    Math.round(tileCount * 1 / 6),
    Math.round(tileCount * 1 / 2),
    Math.round(tileCount * 5 / 6)
  ];
}

// Bunkers/barriers: smaller and now evenly spaced and lower
function buildBunkers() {
  const y = getBunkerY();
  const xs = getBunkerXs();
  return [
    { x: xs[0], y, health: 3, maxHealth: 3 },
    { x: xs[1], y, health: 3, maxHealth: 3 },
    { x: xs[2], y, health: 3, maxHealth: 3 }
  ];
}

let bunkers = buildBunkers();

// Responsive bunker draw (smaller barriers, positioned lower)
function drawBunker(bunker) {
  if (bunker.health <= 0) return;
  // Smaller: about 1/7 of canvas width
  const size = Math.floor(canvas.width / 7);
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
function drawEmoji(x, y, emoji, flicker = false, customSize = null) {
  ctx.font = (customSize ? customSize : gridSize) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji','Noto Emoji','Segoe UI Symbol','Orbitron',sans-serif";
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
  // Recreate bunkers for new positions/sizes
  bunkers = buildBunkers();
}

function resetGame() {
  score = 0;
  bullets = [];
  bombs = [];
  player.x = 10;
  player.y = tileCount - 1;
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

// --- Bomb logic: make bombs fall more commonly and use random invader emoji for bombs ---

function gameLoop() {
  if (isPaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw bunkers first
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
  bombs = bombs.map(b => ({ x: b.x, y: b.y + 1, emoji: b.emoji })).filter(b => b.y < tileCount);

  // Invader movement
  invaderTick++;
  if (invaderTick >= invaderSpeed) {
    let hitEdge = false;
    for (let i = 0; i < invaders.length; i++) {
      invaders[i].x += invaderDir;
      if (invaders[i].x <= 0 || invaders[i].x >= tileCount - 1) hitEdge = true;
      // Make bombs drop twice as often (100% more): increase probability and use random emoji
      if (Math.random() < 0.004) { // was 0.002, now 0.004
        // Pick a random emoji for the bomb from the emojiBank
        const bombEmoji = emojiBank[Math.floor(Math.random() * emojiBank.length)];
        bombs.push({ x: invaders[i].x, y: invaders[i].y, emoji: bombEmoji });
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

  // Draw player as small emoji, above the bunkers visually
  drawEmoji(player.x, player.y, "💩");

  // Draw bullets
  bullets.forEach(b => drawEmoji(b.x, b.y, "💥"));

  // Draw bombs - now uses emoji per bomb
  bombs.forEach(b => drawEmoji(b.x, b.y, b.emoji, true));

  // Draw invaders
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
