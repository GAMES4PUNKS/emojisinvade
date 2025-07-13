// Emoji Invaders Game - 21 cells wide and 21 cells high, player centered with 20 cells either side
// UFO speed scales with reward value
// If player hits any top 25 highest-rewarded UFO, all invaders refresh
// Radio and Login buttons now work!
// Game starts ONLY after Play/Pause button is clicked, or PLAY overlay is clicked, or Enter/Space is pressed.

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

const group1 = emojiBank.slice(0, 54);    // lowest points
const group2 = emojiBank.slice(54, 108);  // highest points

const emojiBonusScores = {};
for (let i = 0; i < emojiBank.length; i++)
  emojiBonusScores[emojiBank[i]] = 1000 + i * 50;

// === GRID SETUP - Now 21 wide and 21 high ===
const tileCount = 21;
const gridSize = 20;
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = tileCount * gridSize;
canvas.height = tileCount * gridSize;

// Center player at cell 10,20 (0-based index, so 10 is exact center for 21 cells wide, 20 is bottom for 21 high)
let score = 0;
let highScore = Number(localStorage.getItem("high_score") || 0);
const player = { x: Math.floor(tileCount / 2), y: tileCount - 1, speedCounter: 0 };  // x:10,y:20 for 21x21 grid
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
const pauseBtn = document.getElementById("pauseBtn");
const radioBtn = document.getElementById('toggleRadio');
const radioAudio = document.getElementById('radioStream');
const loginBtn = document.getElementById('loginBtn');
const loginPopup = document.getElementById('loginPopup');
const closeLoginPopup = document.getElementById('closeLoginPopup');
const muteBtn = document.getElementById("muteBtn");
const speedSelect = document.getElementById("speedSelect");

let gameSoundsMuted = false;
const fireSounds = [
  new Audio('fire.mp3'), new Audio('fire2.mp3'), new Audio('fire3.mp3'),
  new Audio('fire4.mp3'), new Audio('fire5.mp3')
];
const invaderDownSound = new Audio('invaderdown.mp3');
const ufoSound = new Audio('ufo.mp3');
const ufoHitSound = new Audio('ufo2.mp3');
const ufoMissSounds = [
  new Audio('ufomiss.mp3'), new Audio('ufomiss2.mp3'), new Audio('ufomiss3.mp3')
];
const lifeLost1Sound = new Audio('lifelost.mp3');
const lifeLost2Sound = new Audio('lifelost2.mp3');
const gameOverSound1 = new Audio('gameover.mp3');
const gameOverSound2 = new Audio('gameover2.mp3');
const ufoBombSound = new Audio('ufobomb1.mp3');
function playRandomFireSound() {
  if (gameSoundsMuted) return;
  const idx = Math.floor(Math.random() * fireSounds.length);
  try { fireSounds[idx].currentTime = 0; fireSounds[idx].play(); } catch (e) {}
}
function playInvaderDownSound() { if (!gameSoundsMuted) try { invaderDownSound.currentTime = 0; invaderDownSound.play(); } catch (e) {} }
function playRandomUfoMissSound() { if (!gameSoundsMuted) { const idx = Math.floor(Math.random() * ufoMissSounds.length); try { ufoMissSounds[idx].currentTime = 0; ufoMissSounds[idx].play(); } catch (e) {} } }
function playLifeLost1Sound() { if (!gameSoundsMuted) try { lifeLost1Sound.currentTime = 0; lifeLost1Sound.play(); } catch (e) {} }
function playLifeLost2Sound() { if (!gameSoundsMuted) try { lifeLost2Sound.currentTime = 0; lifeLost2Sound.play(); } catch (e) {} }
function playGameOverSounds() { if (!gameSoundsMuted) { try { gameOverSound1.currentTime = 0; gameOverSound1.play(); } catch (e) {} try { gameOverSound2.currentTime = 0; gameOverSound2.play(); } catch (e) {} } }
function playUfoBombSound() { if (!gameSoundsMuted) try { ufoBombSound.currentTime = 0; ufoBombSound.play(); } catch (e) {} }
function updateGameSoundMute() { const v = gameSoundsMuted ? 0 : 1; [...fireSounds, invaderDownSound, ufoSound, ufoHitSound, ...ufoMissSounds, lifeLost1Sound, lifeLost2Sound, gameOverSound1, gameOverSound2, ufoBombSound].forEach(a => a.volume = v); }

const shitImg = new Image();
shitImg.src = 'BASE.png';
const BUNKER_W = 3, BUNKER_H = 3;
let bunkerLevel = 0;
function getBunkerCellHp() { return Math.max(1, 5 - bunkerLevel * 0.05); }
function getBunkerY() { const previousY = tileCount - 5; const bottomY = tileCount - 2; return Math.round(previousY + 0.4 * (bottomY - previousY)); }
function getBunkerXs() {
  // Distribute 3 bunkers evenly: left, center, right
  return [
    Math.round(tileCount * 1 / 6),
    Math.round(tileCount * 1 / 2),
    Math.round(tileCount * 5 / 6)
  ];
}
function makeCells() { return Array.from({length: BUNKER_H}, () => Array.from({length: BUNKER_W}, () => ({ hp: getBunkerCellHp() }))); }
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
  for (let row = 0; row < bunker.height; row++)
    for (let col = 0; col < bunker.width; col++) {
      const cell = bunker.cells[row][col];
      if (cell && cell.hp > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0.25, cell.hp / getBunkerCellHp());
        ctx.drawImage(shitImg, (bunker.x + col) * gridSize, (bunker.y + row) * gridSize, gridSize, gridSize);
        ctx.restore();
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

// === INVADER GRID SETUP - now fits 21 columns ===
function spawnInvaderGrid() {
  invaders = [];
  for (let row = 0; row < 10; row++) {
    const rowEmojis = [];
    while (rowEmojis.length < 5) {
      const emoji = emojiBank[Math.floor(Math.random() * emojiBank.length)];
      if (!rowEmojis.includes(emoji)) rowEmojis.push(emoji);
    }
    for (let col = 0; col < 5; col++) {
      const colX = [2, 6, 10, 14, 18][col];
      invaders.push({
        x: colX,
        y: row + 1,
        emoji: rowEmojis[col],
        flickerPhase: Math.random() * Math.PI * 2
      });
    }
  }
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
  ufoSlowFactor = 0.33;
  ufoBombDropChance = 0.0125;
  bunkerLevel = 0;
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
    playRandomFireSound();
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
    if (hitEdge) { invaderDir *= -1; for (let i = 0; i < invaders.length; i++) { invaders[i].y += 1; } playInvaderDownSound(); }
    invaderTick = 0;
  }

  drawEmoji(player.x, player.y, "💩");
  bullets.forEach(b => drawEmoji(b.x, Math.round(b.y), "💥"));
  bombs.forEach(b => drawEmoji(b.x, Math.round(b.y), b.emoji, true));
  invaders.forEach(inv => drawEmoji(inv.x, inv.y, inv.emoji, true, null, inv.flickerPhase));

  if (invaders.length === 0) {
    invaderSpeed = Math.max(1, invaderSpeed - 0.5);
    bombDropSpeed = Math.min(2, bombDropSpeed + 0.2);
    bulletTravelSpeed = Math.min(2, bulletTravelSpeed + 0.2);
    spawnInvaderGrid();
    bunkerLevel++;
    resetBunkers();
  }

  updateHUD();
  reqId = requestAnimationFrame(gameLoop);
}

// --- Overlay, radio, login, pause, restart logic ---

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

radioBtn.onclick = function() {
  if (radioAudio.paused) {
    radioAudio.play();
    radioBtn.textContent = "Radio ON";
  } else {
    radioAudio.pause();
    radioBtn.textContent = "Radio OFF";
  }
  canvas.focus();
};

loginBtn.onclick = function() {
  loginPopup.style.display = "block";
  canvas.focus();
};
closeLoginPopup.onclick = function() {
  loginPopup.style.display = "none";
  canvas.focus();
};

muteBtn.onclick = () => {
  gameSoundsMuted = !gameSoundsMuted;
  updateGameSoundMute();
  muteBtn.textContent = gameSoundsMuted ? "🔇" : "🔊";
  canvas.focus();
};

speedSelect.onchange = (e) => {
  invaderSpeed = Number(e.target.value);
  canvas.focus();
};

window.addEventListener('keydown', function(e) {
  if (!initialGameStarted && overlay.style.display === "block" && (e.key === "Enter" || e.key === " ")) {
    startMainGame();
  }
  if (e.key === "Escape") {
    if (loginPopup && loginPopup.style.display === "block") { loginPopup.style.display = "none"; canvas.focus(); }
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
// DO NOT CALL gameLoop() HERE! Game starts after Play button pressed.

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
