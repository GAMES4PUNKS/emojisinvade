// game.js

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
let invaders = [];
let invaderDir = 1;
let invaderSpeed = 40;
let invaderTick = 0;
let bulletCooldown = 0;
let bombs = [];

const scoreDisplay = document.getElementById("scoreDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const overlay = document.getElementById("overlay");
const radio = document.getElementById("radioStream");
const gameOverOverlay = document.getElementById("gameOverOverlay");

const emojiBank = "😀😅😇🤣😂🙃😍🥰😘🤪😜😝🧐🤓😎🤩🥳🥺😢😭😤😡🤬🤯😳🥵🥶😱🤗😥😰🤥🥱😪🤢🤠🤑🤕🤒😷🤧🤮😈👿👹🤡👻😺🎃🤖👾👽☠️😸😻🙀😿👀🎅🐶🐱🐭🐹🐰🦊🐻🐷🐮🐨🐻‍❄️🐼🐸🐵🙈🙉🙊🌍🌈⛄️🍏🍎🍐🍊🍒🍔🍟🧁🍩🍪⚽️🏀🏈⚾️🥎🏐❤️🧡💛💚💙💜☢️☣️🔞♥️".split('');

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
  if (e.key === 'ArrowLeft') left = true;
  if (e.key === 'ArrowRight') right = true;
  if (e.key === ' ') shooting = true;
});

document.addEventListener('keyup', e => {
  if (e.key === 'ArrowLeft') left = false;
  if (e.key === 'ArrowRight') right = false;
  if (e.key === ' ') shooting = false;
});

function drawEmoji(x, y, emoji, flicker = false) {
  ctx.font = `${gridSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
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

function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

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

  bullets = bullets.map(b => ({ x: b.x, y: b.y - 1 })).filter(b => b.y >= 0);
  bombs = bombs.map(b => ({ x: b.x, y: b.y + 1 })).filter(b => b.y < tileCount);

  invaderTick++;
  if (invaderTick >= invaderSpeed) {
    let hitEdge = false;
    for (let i = 0; i < invaders.length; i++) {
      invaders[i].x += invaderDir;
      if (invaders[i].x <= 0 || invaders[i].x >= tileCount - 1) hitEdge = true;
    }
    if (hitEdge) {
      invaderDir *= -1;
      for (let i = 0; i < invaders.length; i++) {
        invaders[i].y += 1;
      }
    }
    invaderTick = 0;
  }

  invaders.forEach(inv => {
    if (Math.random() < 0.01) {
      bombs.push({ x: inv.x, y: inv.y + 1 });
    }
  });

  bullets.forEach((b, i) => {
    for (let j = 0; j < invaders.length; j++) {
      const inv = invaders[j];
      if (b.x === inv.x && b.y === inv.y) {
        bullets.splice(i, 1);
        invaders.splice(j, 1);
        score += 10;
        if (score > highScore) {
          highScore = score;
          localStorage.setItem("high_score", highScore);
        }
        break;
      }
    }
  });

  for (let b of bombs) {
    if (b.x === player.x && b.y === player.y) {
      gameOverOverlay.style.display = "flex";
      return;
    }
  }

  drawEmoji(player.x, player.y, "💩");
  bullets.forEach(b => drawEmoji(b.x, b.y, "💥"));
  bombs.forEach(b => drawEmoji(b.x, b.y, "✨", true));
  invaders.forEach(inv => drawEmoji(inv.x, inv.y, inv.emoji, true));

  if (invaders.length === 0) {
    spawnInvaderGrid();
  }

  updateHUD();
  requestAnimationFrame(gameLoop);
}

gameLoop();

document.getElementById("pauseBtn").onclick = () => {
  const paused = overlay.style.display === "block";
  overlay.textContent = paused ? "" : "PAUSED";
  overlay.style.display = paused ? "none" : "block";
};

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
