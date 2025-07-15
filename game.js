const tileCount = 21;
let gridSize = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.9 / tileCount);

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = gridSize * tileCount;
canvas.height = gridSize * tileCount;

window.addEventListener('resize', () => {
  gridSize = Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.9 / tileCount);
  canvas.width = gridSize * tileCount;
  canvas.height = gridSize * tileCount;
});

// EMOJIS
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

const group1 = emojiBank.slice(0, 54);
const group2 = emojiBank.slice(54, 108);

const emojiBonusScores = {};
for (let i = 0; i < emojiBank.length; i++)
  emojiBonusScores[emojiBank[i]] = 1000 + i * 50;

let score = 0;
let highScore = Number(localStorage.getItem("high_score") || 0);
const player = { x: Math.floor(tileCount/2), y: tileCount - 1, speedCounter: 0 };
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
const spacemanSound = new Audio('spaceman.mp3');
const rocketSound = new Audio('rocket.mp3');

function playSpacemanSound() {
  if (!gameSoundsMuted) try { spacemanSound.currentTime = 0; spacemanSound.play(); } catch (e) {}
}
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
function updateGameSoundMute() { const v = gameSoundsMuted ? 0 : 1; [...fireSounds, invaderDownSound, ufoSound, ufoHitSound, ...ufoMissSounds, lifeLost1Sound, lifeLost2Sound, gameOverSound1, gameOverSound2, ufoBombSound, spacemanSound, rocketSound].forEach(a => a.volume = v); }

const shitImg = new Image();
shitImg.src = 'BASE.png';
// BUNKERS
const BUNKER_W = 3, BUNKER_H = 3;
const CENTER_BUNKER_W = 5; // Center bunker is 5 cells wide

function getBunkerCellHp() { return Math.max(1, 5 - bunkerLevel * 0.05); }
function getBunkerY() { 
  const previousY = tileCount - 5; 
  const bottomY = tileCount - 2; 
  return Math.round(previousY + 0.4 * (bottomY - previousY)); 
}
function getBunkerXs() { 
  // LEFT: moved 2 cells left, CENTER/RIGHT unchanged
  return [
    Math.round(tileCount * 1 / 6) - 2, // moved 2 cells left
    Math.round(tileCount * 1 / 2),
    Math.round(tileCount * 5 / 6)
  ]; 
}
function makeCells(width = BUNKER_W) { 
  return Array.from({length: BUNKER_H}, () => 
    Array.from({length: width}, () => ({ hp: getBunkerCellHp() }))
  ); 
}
// This version centers the center bunker perfectly
function buildBunkers() {
  const y = getBunkerY();
  const xs = getBunkerXs();
  return [
    { x: xs[0] - 1, y, width: BUNKER_W, height: BUNKER_H, cells: makeCells(BUNKER_W) },
    { x: Math.floor(tileCount / 2 - CENTER_BUNKER_W / 2), y, width: CENTER_BUNKER_W, height: BUNKER_H, cells: makeCells(CENTER_BUNKER_W) },
    { x: xs[2] - 1, y, width: BUNKER_W, height: BUNKER_H, cells: makeCells(BUNKER_W) }
  ];
}
let bunkerLevel = 0;
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

// INVADER GRID WITH 1 CELL GAP
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
        x: col * 2 + 2, // 1 cell gap between invaders horizontally
        y: row + 1,
        emoji: rowEmojis[col],
        flickerPhase: Math.random() * Math.PI * 2
      });
    }
  }
}

let left = false, right = false, shooting = false;
let firePressed = false;
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowLeft' || e.key === 'a') left = true;
  if (e.key === 'ArrowRight' || e.key === 'd') right = true;
  if ((e.key === ' ' || e.key === 'z' || e.key === 'j') && !firePressed) { shooting = true; firePressed = true; }
  if (e.key.toLowerCase() === 'p') document.getElementById("pauseBtn").click();
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
  player.x = Math.floor(tileCount/2);
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

let lastBonusMissFrame = -1000;
let ufoBombDropChance = 0.0125;
let bonusEmoji = null;
let bonusTimer = 0;
let bonusSpeedupHits = 0;
let firstBonusSpawned = false;

function getRandomUFOEmoji() {
  const totalWeight = 1.75 + 1;
  const rand = Math.random();
  if (rand < 1.75 / totalWeight) {
    const idx = Math.floor(Math.random() * group1.length);
    return group1[idx];
  } else {
    const idx = Math.floor(Math.random() * group2.length);
    return group2[idx];
  }
}

function getUfoSpeed(emoji) {
  const maxSpeed = 0.15 * ufoSlowFactor;
  const minSpeed = 0.05 * ufoSlowFactor;
  const idx = emojiBank.indexOf(emoji);
  if (idx === emojiBank.length - 1) return maxSpeed;
  return minSpeed + ((maxSpeed - minSpeed) * idx / (emojiBank.length - 1));
}

function maybeSpawnBonusEmoji() {
  if (bonusEmoji !== null) return;
  if (Math.random() < 1/240) {
    const fromLeft = Math.random() < 0.5;
    const emoji = getRandomUFOEmoji();
    const speed = getUfoSpeed(emoji);
    bonusEmoji = {
      emoji,
      x: fromLeft ? 0 : tileCount - 1,
      y: 0,
      dir: fromLeft ? 1 : -1,
      speed: speed,
      progress: 0,
      bankIndex: emojiBank.indexOf(emoji)
    };
    try { if (!gameSoundsMuted) { ufoSound.currentTime = 0; ufoSound.play(); } } catch (e) {}
  }
}

function updateBonusEmoji() {
  if (!bonusEmoji) return;
  bonusEmoji.progress += bonusEmoji.speed;
  if (bonusEmoji.progress >= 1) {
    bonusEmoji.x += bonusEmoji.dir;
    bonusEmoji.progress = 0;
  }
  if (Math.random() < ufoBombDropChance * 0.5) {
    bombs.push({ x: bonusEmoji.x, y: bonusEmoji.y + 1, emoji: "💣", vy: 0 });
    playUfoBombSound();
  }
  if (bonusEmoji.x < 0 || bonusEmoji.x >= tileCount) {
    try { ufoSound.pause(); ufoSound.currentTime = 0; } catch (e) {}
    bonusEmoji = null;
  }
}

function drawBonusEmoji() { if (!bonusEmoji) return; let drawX = bonusEmoji.x + bonusEmoji.dir * bonusEmoji.progress; drawEmoji(drawX, bonusEmoji.y, bonusEmoji.emoji, true, gridSize); }
function handleBulletBonusCollision() {
  if (!bonusEmoji) return;
  let hit = false;
  bullets = bullets.filter(b => {
    if (Math.abs(b.x - bonusEmoji.x) < 0.5 && Math.abs(b.y - bonusEmoji.y) < 0.5) {
      let pts = emojiBonusScores[bonusEmoji.emoji] || 1000;
      score += pts;
      if (score > highScore) { highScore = score; localStorage.setItem("high_score", highScore); }
      bonusTimer = 30;
      bonusEmoji.showScore = pts;
      hit = true;
      const ufoIdx = emojiBank.indexOf(bonusEmoji.emoji);
      if (ufoIdx >= emojiBank.length - 25) {
        spawnInvaderGrid();
      }
      return false;
    }
    return true;
  });
  if (hit) {
    bonusSpeedupHits++;
    try { ufoSound.pause(); ufoSound.currentTime = 0; } catch (e) {}
    try { if (!gameSoundsMuted) { ufoHitSound.currentTime = 0; ufoHitSound.play(); } } catch (e) {}
    setTimeout(() => { bonusEmoji = null; }, 300);
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
    if (bonusTimer <= 0) { bonusEmoji.showScore = null; }
  }
}
function checkUfoNearMiss() {
  if (!bonusEmoji) return;
  let nearMiss = bullets.some(b =>
    Math.abs(b.x - bonusEmoji.x) < 1.5 &&
    Math.abs(b.y - bonusEmoji.y) < 0.6 &&
    !(Math.abs(b.x - bonusEmoji.x) < 0.5 && Math.abs(b.y - bonusEmoji.y) < 0.5)
  );
  if (nearMiss && Date.now() - lastBonusMissFrame > 500) { playRandomUfoMissSound(); lastBonusMissFrame = Date.now(); }
}

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

  let effectiveInvaderSpeed = invaderSpeed;
  let invaderNearBottom = invaders.some(inv => inv.y >= tileCount - 5);
  if (invaderNearBottom) { effectiveInvaderSpeed = Math.max(1, Math.floor(invaderSpeed * 0.75)); }

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
    for (const bunker of bunkers)
      for (let row = 0; row < bunker.height; row++)
        for (let col = 0; col < bunker.width; col++) {
          const cell = bunker.cells[row][col];
          if (cell && cell.hp > 0 && Math.round(b.x) === bunker.x + col && Math.round(b.y) === bunker.y + row) {
            cell.hp--;
            playSatelliteSound();
            hit = true;
          }
        }
    if (!hit) bulletsAfter.push(b);
  }
  bullets = bulletsAfter;

  let bombsAfter = [];
  for (let b of bombs) {
    let hit = false;
    for (const bunker of bunkers)
      for (let row = 0; row < bunker.height; row++)
        for (let col = 0; col < bunker.width; col++) {
          const cell = bunker.cells[row][col];
          if (cell && cell.hp > 0 && b.x === bunker.x + col && Math.round(b.y) === bunker.y + row) {
            cell.hp--;
            playSatelliteSound();
            hit = true;
          }
        }
    if (hit) continue;
    if (b.x === player.x && Math.round(b.y) === player.y) {
      loseLifeOrGameOver(true);
      try { ufoSound.pause(); ufoSound.currentTime = 0; } catch (e) {}
      return;
    }
    bombsAfter.push(b);
  }
  bombs = bombsAfter;

  bullets.forEach(b => { b.vy = (b.vy || 0) + bulletTravelSpeed; if (b.vy >= 1) { b.y -= Math.floor(b.vy); b.vy = b.vy % 1; } });
  bullets = bullets.filter(b => b.y >= 0);
  bombs.forEach(b => { b.vy = (b.vy || 0) + bombDropSpeed; if (b.vy >= 1) { b.y += Math.floor(b.vy); b.vy = b.vy % 1; } });
  bombs = bombs.filter(b => b.y < tileCount);

  invaderTick++;
  if (invaderTick >= effectiveInvaderSpeed) {
    let hitEdge = false;
    for (let i = 0; i < invaders.length; i++) {
      invaders[i].x += invaderDir;
      if (invaders[i].x <= 0 || invaders[i].x >= tileCount - 1) hitEdge = true;
      if (Math.random() < 0.004) bombs.push({ x: invaders[i].x, y: invaders[i].y, emoji: "✨", vy: 0 });
    }
    if (hitEdge) { invaderDir *= -1; for (let i = 0; i < invaders.length; i++) { invaders[i].y += 1; } playInvaderDownSound(); }
    invaderTick = 0;
  }

  let bunkerRows = new Set();
  for (const bunker of bunkers)
    for (let row = 0; row < bunker.height; row++)
      for (let col = 0; col < bunker.width; col++) {
        const cell = bunker.cells[row][col];
        if (cell && cell.hp > 0) bunkerRows.add(bunker.y + row);
      }
  let invaderAtBunker = false;
  for (let i = 0; i < invaders.length; i++) {
    if (invaders[i].y === player.y || bunkerRows.has(invaders[i].y)) {
      for (const bunker of bunkers) for (let row = 0; row < bunker.height; row++)
        if (bunker.y + row === invaders[i].y)
          for (let col = 0; col < bunker.width; col++) {
            const cell = bunker.cells[row][col];
            if (cell && cell.hp > 0) cell.hp--;
            playSatelliteSound();
          }
      invaderAtBunker = true;
      break;
    }
  }
  if (invaderAtBunker) {
    playGameOverSounds();
    gameOverOverlay.style.display = 'flex';
    isPaused = true;
    gameOverState = true;
    try { ufoSound.pause(); ufoSound.currentTime = 0; } catch (e) {}
    return;
  }

  let bulletIndicesToRemove = new Set(), invaderIndicesToRemove = new Set();
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
      if (score > highScore) { highScore = score; localStorage.setItem("high_score", highScore); }
      removed++;
      return false;
    }
    return true;
  });

  maybeSpawnBonusEmoji();
  updateBonusEmoji();
  drawBonusEmoji();
  handleBulletBonusCollision();
  drawBonusScore();
  checkUfoNearMiss();

  drawEmoji(player.x, player.y, "💩");
  bullets.forEach(b => drawEmoji(b.x, Math.round(b.y), "💥"));
  bombs.forEach(b => drawEmoji(b.x, Math.round(b.y), b.emoji, true));
  invaders.forEach(inv => drawEmoji(inv.x, inv.y, inv.emoji, true, null, inv.flickerPhase));

  if (invaders.length === 0) {
    invaderSpeed = Math.max(1, invaderSpeed - 0.5);
    bombDropSpeed = Math.min(2, bombDropSpeed + 0.2);
    bulletTravelSpeed = Math.min(2, bulletTravelSpeed + 0.2);

    try { rocketSound.currentTime = 0; rocketSound.play(); } catch(e) {}

    spawnInvaderGrid();
    advanceLevel();
  }

  updateHUD();
  reqId = requestAnimationFrame(gameLoop);
}

function advanceLevel() {
  ufoBombDropChance += 0.0125;
  bunkerLevel++;
  resetBunkers();
}

function loseLifeOrGameOver(bombHit = false) {
  playerLives--;
  playSpacemanSound();
  if (bombHit) {
    score = Math.floor(score * 0.5);
    updateHUD();
  }
  updateHUD();
  if (playerLives <= 0) {
    playLifeLost2Sound();
    playGameOverSounds();
    gameOverOverlay.style.display = 'flex';
    isPaused = true;
    gameOverState = true;
  } else {
    playLifeLost1Sound();
    player.x = Math.floor(tileCount/2);
    player.y = tileCount - 1;
    player.speedCounter = 0;
    bombs = bombs.filter(b => b.y < player.y);
    bullets = [];
    setTimeout(() => { reqId = requestAnimationFrame(gameLoop); }, 500);
    isPaused = true;
    overlay.textContent = "💥 Ouch! 💥";
    overlay.style.display = "block";
    setTimeout(() => { overlay.style.display = "none"; isPaused = false; }, 400);
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

overlay.onclick = () => {
  if (!initialGameStarted && overlay.style.display === "block") {
    startMainGame();
  }
  if (gameOverState && overlay.style.display === "block") {
    manualRestart();
  }
};
window.addEventListener('keydown', function(e) {
  if (!initialGameStarted && overlay.style.display === "block" && (e.key === "Enter" || e.key === " ")) {
    startMainGame();
  }
  if (e.key === "Escape") {
    const popup = document.getElementById("loginPopup");
    if (popup && popup.style.display === "block") { popup.style.display = "none"; canvas.focus(); }
  }
  if (gameOverState && e.key === "Enter") manualRestart();
});

function togglePause() {
  if (isPaused && !gameOverState) { isPaused = false; overlay.style.display = "none"; reqId = requestAnimationFrame(gameLoop); }
  else if (!gameOverState) { isPaused = true; overlay.textContent = "PAUSED"; overlay.style.display = "block"; if (reqId) cancelAnimationFrame(reqId); }
}

const radioBtn = document.getElementById('toggleRadio');
const radioAudio = document.getElementById('radioStream');
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

const loginBtn = document.getElementById('loginBtn');
const loginPopup = document.getElementById('loginPopup');
const closeLoginPopup = document.getElementById('closeLoginPopup');
loginBtn.onclick = function() {
  loginPopup.style.display = "block";
  canvas.focus();
};
closeLoginPopup.onclick = function() {
  loginPopup.style.display = "none";
  canvas.focus();
};

document.getElementById("muteBtn").onclick = () => { gameSoundsMuted = !gameSoundsMuted; updateGameSoundMute(); document.getElementById("muteBtn").textContent = gameSoundsMuted ? "🔇" : "🔊"; canvas.focus(); };
document.getElementById("speedSelect").onchange = (e) => { invaderSpeed = Number(e.target.value); canvas.focus(); };

let initialGameStarted = false;
function showStartOverlay() {
  overlay.textContent = "▶ PLAY";
  overlay.style.display = "block";
  overlay.style.cursor = "pointer";
  isPaused = true;
  gameOverState = false;
  if (reqId) cancelAnimationFrame(reqId);
}
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
document.getElementById("pauseBtn").onclick = () => {
  if (!initialGameStarted) {
    startMainGame();
  } else {
    togglePause();
    canvas.focus();
  }
};

window.addEventListener('DOMContentLoaded', () => {
  showStartOverlay();
});
updateHUD();
// DO NOT CALL gameLoop() HERE! Game starts after Play button pressed.
