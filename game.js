// ... (keep the rest of your code above unchanged)

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

// ... (rest of your unchanged code)
