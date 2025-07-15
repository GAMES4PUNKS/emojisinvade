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

const satelliteSound = new Audio('satellite.mp3');
function playSatelliteSound() {
  if (!gameSoundsMuted) try { satelliteSound.currentTime = 0; satelliteSound.play(); } catch (e) {}
}

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
function updateGameSoundMute() { const v = gameSoundsMuted ? 0 : 1; [...fireSounds, invaderDownSound, ufoSound, ufoHitSound, ...ufoMissSounds, lifeLost1Sound, lifeLost2Sound, gameOverSound1, gameOverSound2, ufoBombSound, spacemanSound, rocketSound, satelliteSound].forEach(a => a.volume = v); }

const shitImg = new Image();
shitImg.src = 'BASE.png';
const BUNKER_W = 3, BUNKER_H = 3;
const CENTER_BUNKER_W = 5;

function getBunkerCellHp() { return Math.max(1, 5 - bunkerLevel * 0.05); }
function getBunkerY() { 
  const previousY = tileCount - 5; 
  const bottomY = tileCount - 2; 
  return Math.round(previousY + 0.4 * (bottomY - previousY)); 
}
function getBunkerXs() { 
  return [
    Math.round(tileCount * 1 / 6) - 2, 
    Math.round(tileCount * 1 / 2),
    Math.round(tileCount * 5 / 6)
  ]; 
}
function makeCells(width = BUNKER_W) { 
  return Array.from({length: BUNKER_H}, () => 
    Array.from({length: width}, () => ({ hp: getBunkerCellHp() }))
  ); 
}
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

// Your remaining bonus, game loop, collision checks, event handlers, and game start logic...

// BULLET COLLISION SECTION (with satellite sound)
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

// BOMB COLLISION SECTION (with satellite sound)
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

// The rest of your game loop with bonus emoji, level advance, life loss, restart logic, etc.

// Show start overlay, handle pause/resume, handle mute, and radio button logic

// Final init
window.addEventListener('DOMContentLoaded', () => {
  showStartOverlay();
});
updateHUD();
// DO NOT CALL gameLoop() HERE! Game starts after Play button pressed.
