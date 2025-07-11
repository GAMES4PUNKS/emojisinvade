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

let bombDropSpeed = 0.33;
let bulletTravelSpeed = 0.33;
let ufoSlowFactor = 0.33;

const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const overlay = document.getElementById("overlay");
const gameOverOverlay = document.getElementById("gameOverOverlay");
const radio = document.getElementById("radioStream");

// ---- GAME SOUND MUTE LOGIC ----
let gameSoundsMuted = false;

// ---- SOUND EFFECTS ----
const ufoSound = new Audio('ufo.mp3');
ufoSound.preload = 'auto';
ufoSound.volume = 1;
ufoSound.loop = false;

const ufoHitSound = new Audio('ufo2.mp3');
ufoHitSound.preload = 'auto';
ufoHitSound.volume = 1;
ufoHitSound.loop = false;

const fireSounds = [
  new Audio('fire.mp3'),
  new Audio('fire2.mp3'),
  new Audio('fire3.mp3'),
  new Audio('fire4.mp3')
];
for (let fs of fireSounds) {
  fs.preload = 'auto';
  fs.volume = 1;
  fs.loop = false;
}

const invaderDownSound = new Audio('invaderdown.mp3');
invaderDownSound.preload = 'auto';
invaderDownSound.volume = 1;
invaderDownSound.loop = false;

const ufoMissSounds = [
  new Audio('ufomiss.mp3'),
  new Audio('ufomiss2.mp3'),
  new Audio('ufomiss3.mp3')
];
ufoMissSounds.forEach(s => {
  s.preload = 'auto';
  s.volume = 1;
  s.loop = false;
});

const lifeLost1Sound = new Audio('lifelost.mp3');
lifeLost1Sound.preload = 'auto';
lifeLost1Sound.volume = 1;
lifeLost1Sound.loop = false;

const lifeLost2Sound = new Audio('lifelost2.mp3');
lifeLost2Sound.preload = 'auto';
lifeLost2Sound.volume = 1;
lifeLost2Sound.loop = false;

const gameOverSound1 = new Audio('gameover.mp3');
gameOverSound1.preload = 'auto';
gameOverSound1.volume = 1;
gameOverSound1.loop = false;

const gameOverSound2 = new Audio('gameover2.mp3');
gameOverSound2.preload = 'auto';
gameOverSound2.volume = 1;
gameOverSound2.loop = false;

function playRandomFireSound() {
  if (gameSoundsMuted) return;
  const idx = Math.floor(Math.random() * fireSounds.length);
  try {
    fireSounds[idx].currentTime = 0;
    fireSounds[idx].play();
  } catch (e) {}
}
function playInvaderDownSound() {
  if (gameSoundsMuted) return;
  try {
    invaderDownSound.currentTime = 0;
    invaderDownSound.play();
  } catch (e) {}
}
function playRandomUfoMissSound() {
  if (gameSoundsMuted) return;
  const idx = Math.floor(Math.random() * ufoMissSounds.length);
  try {
    ufoMissSounds[idx].currentTime = 0;
    ufoMissSounds[idx].play();
  } catch (e) {}
}
function playLifeLost1Sound() {
  if (gameSoundsMuted) return;
  try {
    lifeLost1Sound.currentTime = 0;
    lifeLost1Sound.play();
  } catch (e) {}
}
function playLifeLost2Sound() {
  if (gameSoundsMuted) return;
  try {
    lifeLost2Sound.currentTime = 0;
    lifeLost2Sound.play();
  } catch (e) {}
}
function playGameOverSounds() {
  if (gameSoundsMuted) return;
  try {
    gameOverSound1.currentTime = 0;
    gameOverSound1.play();
  } catch (e) {}
  try {
    gameOverSound2.currentTime = 0;
    gameOverSound2.play();
  } catch (e) {}
}

function updateGameSoundMute() {
  const v = gameSoundsMuted ? 0 : 1;
  ufoSound.volume = v;
  ufoHitSound.volume = v;
  fireSounds.forEach(fs => fs.volume = v);
  invaderDownSound.volume = v;
  ufoMissSounds.forEach(s => s.volume = v);
  lifeLost1Sound.volume = v;
  lifeLost2Sound.volume = v;
  gameOverSound1.volume = v;
  gameOverSound2.volume = v;
}

// Focus helper to prevent button spacebar bug
function focusGameCanvas() {
  canvas.focus();
}

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
        flickerPhase: Math.random() * Math.PI * 2
      });
    }
  }
}
spawnInvaderGrid();

let left = false, right = false, shooting = false;
let firePressed = false;

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') right = true;
  if ((e.key === ' ' || e.key === 'z' || e.key === 'j') && !firePressed) {
    shooting = true;
    firePressed = true;
  }
  if (e.key.toLowerCase() === 'p') togglePause();
});
document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = false;
  if (e.key === 'ArrowRight' || e.key === 'd') right = false;
  if (e.key === ' ' || e.key === 'z' || e.key === 'j') {
    shooting = false;
    firePressed = false;
  }
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
  invaderSpeed = 40;
  bombDropSpeed = 0.33;
  bulletTravelSpeed = 0.33;
  ufoSlowFactor = 0.33;
  spawnInvaderGrid();
  resetBunkers();
  updateHUD();
}

let isPaused = false;
let reqId = null;
let gameOverState = false;

// --- For UFO near-miss ---
let lastBonusMissFrame = -1000;

function loseLifeOrGameOver() {
  playerLives--;
  updateHUD();
  if (playerLives <= 0) {
    playLifeLost2Sound();
    playGameOverSounds();
    gameOverOverlay.style.display = 'flex';
    isPaused = true;
    gameOverState = true;
  } else {
    playLifeLost1Sound();
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

function manualRestart() {
  if (!gameOverState) return;
  gameOverOverlay.style.display = 'none';
  gameOverState = false;
  isPaused = false;
  resetGame();
  reqId = requestAnimationFrame(gameLoop);
}

function togglePause() {
  if (isPaused && !gameOverState) {
    isPaused = false;
    overlay.style.display = "none";
    reqId = requestAnimationFrame(gameLoop);
  } else if (!gameOverState) {
    isPaused = true;
    overlay.textContent = "PAUSED";
    overlay.style.display = "block";
    if (reqId) cancelAnimationFrame(reqId);
  }
}

// --- BONUS EMOJI ACROSS TOP LINE (UFO) ---
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
      speed = 0.05 * ufoSlowFactor;
      firstBonusSpawned = true;
    } else {
      speed = 0.15 * ufoSlowFactor;
      if (bonusSpeedupHits > 5) {
        speed = 0.15 * Math.pow(1.1, bonusSpeedupHits - 5) * ufoSlowFactor;
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
    try {
      if (!gameSoundsMuted) {
        ufoSound.currentTime = 0;
        ufoSound.play();
      }
    } catch (e) {}
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
    try { ufoSound.pause(); ufoSound.currentTime = 0; } catch (e) {}
    bonusEmoji = null;
  }
}

function drawBonusEmoji() {
  if (!bonusEmoji) return;
  let drawX = bonusEmoji.x + bonusEmoji.dir * bonusEmoji.progress;
  drawEmoji(drawX, bonusEmoji.y, bonusEmoji.emoji, true, gridSize);
}

function handleBulletBonusCollision() {
  if (!bonusEmoji) return;
  let hit = false;
  bullets = bullets.filter(b => {
    if (
      Math.abs(b.x - bonusEmoji.x) < 0.5 &&
      Math.abs(b.y - bonusEmoji.y) < 0.5
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
    try { ufoSound.pause(); ufoSound.currentTime = 0; } catch (e) {}
    try { if (!gameSoundsMuted) { ufoHitSound.currentTime = 0; ufoHitSound.play(); } } catch (e) {}
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

// UFO Near Miss Logic
function checkUfoNearMiss() {
  if (!bonusEmoji) return;
  // If a bullet is within 1.5 cells horizontally and y-aligned (but not a hit) and passes within the last 2 frames
  let nearMiss = bullets.some(b =>
    Math.abs(b.x - bonusEmoji.x) < 1.5 &&
    Math.abs(b.y - bonusEmoji.y) < 0.6 &&
    !(Math.abs(b.x - bonusEmoji.x) < 0.5 && Math.abs(b.y - bonusEmoji.y) < 0.5)
  );
  // Only trigger once every 500ms
  if (nearMiss && Date.now() - lastBonusMissFrame > 500) {
    playRandomUfoMissSound();
    lastBonusMissFrame = Date.now();
  }
}

function gameLoop() {
  if (isPaused) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- SPEED UP INVADERS IF ANY ARE 5 CELLS FROM THE BOTTOM ---
  let effectiveInvaderSpeed = invaderSpeed;
  let invaderNearBottom = invaders.some(inv => inv.y >= tileCount - 5);
  if (invaderNearBottom) {
    effectiveInvaderSpeed = Math.max(1, Math.floor(invaderSpeed * 0.75));
  }

  bunkers.forEach(drawBunker);

  player.speedCounter++;
  if (player.speedCounter >= 4) {
    if (left && player.x > 0) player.x--;
    if (right && player.x < tileCount - 1) player.x++;
    player.speedCounter = 0;
  }

  if (shooting && bullets.length === 0) {
    bullets.push({ x: player.x, y: player.y - 1, vy: 0 });
    playRandomFireSound();
    shooting = false;
  }

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

  bullets.forEach(b => {
    b.vy = (b.vy || 0) + bulletTravelSpeed;
    if (b.vy >= 1) {
      b.y -= Math.floor(b.vy);
      b.vy = b.vy % 1;
    }
  });
  bullets = bullets.filter(b => b.y >= 0);

  bombs.forEach(b => {
    b.vy = (b.vy || 0) + bombDropSpeed;
    if (b.vy >= 1) {
      b.y += Math.floor(b.vy);
      b.vy = b.vy % 1;
    }
  });
  bombs = bombs.filter(b => b.y < tileCount);

  // --------- USE effectiveInvaderSpeed for this frame ---------
  invaderTick++;
  if (invaderTick >= effectiveInvaderSpeed) {
    let hitEdge = false;
    for (let i = 0; i < invaders.length; i++) {
      invaders[i].x += invaderDir;
      if (invaders[i].x <= 0 || invaders[i].x >= tileCount - 1) hitEdge = true;
      if (Math.random() < 0.004) {
        bombs.push({ x: invaders[i].x, y: invaders[i].y, emoji: "✨", vy: 0 });
      }
    }
    if (hitEdge) {
      invaderDir *= -1;
      for (let i = 0; i < invaders.length; i++) {
        invaders[i].y += 1;
      }
      // Play invaderdown.mp3 when invaders move down a row
      playInvaderDownSound();
    }
    invaderTick = 0;
  }

  // --- GAME OVER IF INVADER HITS BUNKER ---
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
  let invaderAtBunker = false;
  for (let i = 0; i < invaders.length; i++) {
    if (
      invaders[i].y === player.y ||
      bunkerRows.has(invaders[i].y)
    ) {
      invaderAtBunker = true;
      break;
    }
  }
  if (invaderAtBunker) {
    playGameOverSounds(); // <- Play both gameover.mp3 and gameover2.mp3
    gameOverOverlay.style.display = 'flex';
    isPaused = true;
    gameOverState = true;
    try { ufoSound.pause(); ufoSound.currentTime = 0; } catch (e) {}
    return;
  }

  let bulletIndicesToRemove = new Set();
  let invaderIndicesToRemove = new Set();
  bullets.forEach((b, bi) => {
    invaders.forEach((inv, ji) => {
      if (Math.round(b.x) === Math.round(inv.x) && Math.round(b.y) === Math.round(inv.y)) {
        bulletIndicesToRemove.add(bi);
        invaderIndicesToRemove.add(ji);
      }
    });
  });
  bullets = bullets.filter((b, i) => !bulletIndicesToRemove.has(i));
  let removed = 0;
  invaders = invaders.filter((inv, i) => {
    if (invaderIndicesToRemove.has(i)) {
      score += 10;
      if (score > highScore) {
        highScore = score;
        localStorage.setItem("high_score", highScore);
      }
      removed++;
      return false;
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
            b.x === bunker.x + col && Math.round(b.y) === bunker.y + row
          ) {
            bunker.cells[row][col] = false;
            hit = true;
          }
        }
      }
    }
    if (hit) continue;
    if (b.x === player.x && Math.round(b.y) === player.y) {
      loseLifeOrGameOver();
      try { ufoSound.pause(); ufoSound.currentTime = 0; } catch (e) {}
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
  checkUfoNearMiss();

  drawEmoji(player.x, player.y, "💩");
  bullets.forEach(b => drawEmoji(b.x, Math.round(b.y), "💥"));
  bombs.forEach(b => drawEmoji(b.x, Math.round(b.y), "✨", true));
  invaders.forEach(inv => drawEmoji(inv.x, inv.y, inv.emoji, true, null, inv.flickerPhase));

  if (invaders.length === 0) {
    invaderSpeed = Math.max(1, invaderSpeed - 0.5);
    bombDropSpeed = Math.min(2, bombDropSpeed + 0.2);
    bulletTravelSpeed = Math.min(2, bulletTravelSpeed + 0.2);
    spawnInvaderGrid();
  }

  updateHUD();
  reqId = requestAnimationFrame(gameLoop);
}

updateHUD();
gameLoop();

document.getElementById("pauseBtn").onclick = () => {
  togglePause();
  focusGameCanvas();
};
document.getElementById("muteBtn").onclick = () => {
  gameSoundsMuted = !gameSoundsMuted;
  updateGameSoundMute();
  document.getElementById("muteBtn").textContent = gameSoundsMuted ? "🔇" : "🔊";
  focusGameCanvas();
};
document.getElementById("toggleRadio").onclick = () => {
  if (radio.paused) {
    radio.play();
    document.getElementById("toggleRadio").textContent = "Radio OFF";
  } else {
    radio.pause();
    document.getElementById("toggleRadio").textContent = "Radio ON";
  }
  focusGameCanvas();
};
document.getElementById("loginBtn").onclick = () => {
  document.getElementById("loginPopup").style.display = "block";
};
document.getElementById("closeLoginPopup").onclick = () => {
  document.getElementById("loginPopup").style.display = "none";
  focusGameCanvas();
};
document.getElementById("speedSelect").onchange = (e) => {
  invaderSpeed = Number(e.target.value);
  focusGameCanvas();
};
window.addEventListener('keydown', function(e) {
  if (e.key === "Escape") {
    const popup = document.getElementById("loginPopup");
    if (popup && popup.style.display === "block") {
      popup.style.display = "none";
      focusGameCanvas();
    }
  }
  if (gameOverState && (e.key === "Enter" || e.key === " ")) {
    manualRestart();
  }
});
canvas.addEventListener('mousedown', manualRestart);
canvas.addEventListener('touchstart', manualRestart);
