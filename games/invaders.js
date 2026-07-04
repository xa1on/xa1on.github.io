import { audio } from '../js/audio.js';

export const invaders = {
  helpText: 'Play a game of Space Invaders (easy|medium|hard).',
  run: async (args, shell) => {
    let diffText = args.length > 0 ? args[0].toLowerCase() : '';

    const highscoreKey = 'invaders_highscore';
    let highscore = parseInt(localStorage.getItem(highscoreKey) || '0', 10);

    // Prompt for difficulty if not provided or invalid
    while (diffText !== 'easy' && diffText !== 'medium' && diffText !== 'hard' && diffText !== '1' && diffText !== '2' && diffText !== '3') {
      shell.print(`--- SPACE INVADERS ---`);
      shell.print(`Personal High Score: ${highscore}`);
      shell.print(`Select difficulty:\n  [1] Easy\n  [2] Medium\n  [3] Hard`);
      const response = await shell.readInput('Choose difficulty (1-3): ');
      if (response === null) {
        shell.print('Space Invaders cancelled.', 'color-dim');
        return;
      }
      diffText = response.trim().toLowerCase();
      if (diffText === '') {
        shell.print('Space Invaders cancelled.', 'color-dim');
        return;
      }
    }

    let difficulty = 'medium';
    let alienMoveSpeed = 16; // Tick interval divider
    let shootFreq = 0.015;  // Alien fire rate
    if (diffText === '1' || diffText === 'easy') {
      difficulty = 'easy';
      alienMoveSpeed = 24;
      shootFreq = 0.008;
    } else if (diffText === '2' || diffText === 'medium') {
      difficulty = 'medium';
      alienMoveSpeed = 16;
      shootFreq = 0.018;
    } else if (diffText === '3' || diffText === 'hard') {
      difficulty = 'hard';
      alienMoveSpeed = 10;
      shootFreq = 0.035;
    }

    shell.loginState = 'GAME';

    const width = 44;
    const height = 30; // 15 rows of sub-pixel height

    // Game state
    const game = {
      playerX: 20,
      playerY: 28, // base y coordinate for bottom of ship
      bullets: [], // player bullets: {x, y}
      alienBullets: [], // alien bullets: {x, y}
      aliens: [],  // array of {x, y, alive}
      alienDir: 1, // 1 = Right, -1 = Left
      score: 0,
      gameOver: false,
      gameWon: false,
      tickCount: 0,
      bunkers: [] // barrier blocks: {x, y, hp}
    };

    // Create aliens grid
    const alienRows = 3;
    const alienCols = 6;
    for (let r = 0; r < alienRows; r++) {
      for (let c = 0; c < alienCols; c++) {
        game.aliens.push({
          x: c * 6 + 4,
          y: r * 4 + 2,
          alive: true
        });
      }
    }

    // Create destructible bunkers
    // 3 bunkers spaced out across width
    const bunkerPositionsX = [8, 20, 32];
    bunkerPositionsX.forEach(bx => {
      // Create a small arch of blocks at y = 22, 23
      for (let x = bx; x < bx + 5; x++) {
        game.bunkers.push({ x, y: 22, hp: 3 });
        game.bunkers.push({ x, y: 23, hp: 3 });
      }
    });

    const gameContainer = document.createElement('pre');
    gameContainer.style.fontFamily = 'monospace';
    gameContainer.style.lineHeight = '1.15';
    gameContainer.style.color = 'var(--text-color)';
    shell.output.appendChild(gameContainer);

    function drawInvaders() {
      let board = '┌' + '─'.repeat(width) + '┐\n';

      for (let r = 0; r < height / 2; r++) {
        let line = '│';
        const topY = 2 * r;
        const bottomY = 2 * r + 1;

        for (let x = 0; x < width; x++) {
          // Check collision items for top and bottom subpixels
          let topType = null;
          let bottomType = null;

          // 1. Check player ship (renders at y = 27, 28)
          // Ship layout: top center at x = playerX+2, bottom row at x = playerX to playerX+4
          const isPlayerTop = (y) => (y === 27 && x === game.playerX + 2);
          const isPlayerBottom = (y) => (y === 28 && x >= game.playerX && x <= game.playerX + 4);

          if (isPlayerTop(topY) || isPlayerBottom(topY)) topType = 'player';
          if (isPlayerTop(bottomY) || isPlayerBottom(bottomY)) bottomType = 'player';

          // 2. Check aliens (each alien is 4x2 pixels)
          const getAlienAt = (ax, ay) => {
            return game.aliens.find(al => al.alive && ax >= al.x && ax < al.x + 4 && ay >= al.y && ay < al.y + 2);
          };
          if (getAlienAt(x, topY)) topType = 'alien';
          if (getAlienAt(x, bottomY)) bottomType = 'alien';

          // 3. Check Bunkers
          const getBunkerAt = (bx, by) => game.bunkers.find(b => b.x === bx && b.y === by && b.hp > 0);
          const topBunker = getBunkerAt(x, topY);
          const bottomBunker = getBunkerAt(x, bottomY);
          if (topBunker) topType = 'bunker_' + topBunker.hp;
          if (bottomBunker) bottomType = 'bunker_' + bottomBunker.hp;

          // 4. Check Bullets
          const hasPlayerBullet = (bx, by) => game.bullets.some(b => b.x === bx && Math.round(b.y) === by);
          const hasAlienBullet = (bx, by) => game.alienBullets.some(b => b.x === bx && Math.round(b.y) === by);

          if (hasPlayerBullet(x, topY)) topType = 'pbullet';
          else if (hasAlienBullet(x, topY)) topType = 'abullet';

          if (hasPlayerBullet(x, bottomY)) bottomType = 'pbullet';
          else if (hasAlienBullet(x, bottomY)) bottomType = 'abullet';

          // Select matching sub-pixel character representation
          let cellChar = ' ';
          const getCellHTML = (type, char) => {
            if (type === 'player') return `<span class="green">${char}</span>`;
            if (type === 'alien') return `<span class="magenta">${char}</span>`;
            if (type && type.startsWith('bunker')) {
              const hp = type.split('_')[1];
              const opacity = hp === '3' ? '' : hp === '2' ? ' style="opacity:0.65"' : ' style="opacity:0.35"';
              return `<span class="cyan"${opacity}>${char}</span>`;
            }
            if (type === 'pbullet') return `<span class="yellow">${char}</span>`;
            if (type === 'abullet') return `<span class="red">${char}</span>`;
            return char;
          };

          if (topType && bottomType) {
            const char = (topType === 'pbullet' || bottomType === 'pbullet') ? '║' : '█';
            const colorType = (topType === bottomType) ? topType : (topType === 'pbullet' || topType === 'abullet' ? bottomType : topType);
            cellChar = getCellHTML(colorType, char);
          } else if (topType) {
            const char = (topType === 'pbullet' || topType === 'abullet') ? '╨' : '▀';
            cellChar = getCellHTML(topType, char);
          } else if (bottomType) {
            const char = (bottomType === 'pbullet' || bottomType === 'abullet') ? '╥' : '▄';
            cellChar = getCellHTML(bottomType, char);
          }

          line += cellChar;
        }
        line += '│\n';
        board += line;
      }

      board += '└' + '─'.repeat(width) + '┘\n';
      board += ` Score: ${game.score} ║ High Score: ${highscore} ║ Difficulty: ${difficulty.toUpperCase()}\n`;
      board += ` Controls: [A]/[D] or [Arrows] to Move. [Space] to Shoot. [Q] to quit.\n`;

      gameContainer.innerHTML = board;
      shell.body.scrollTop = shell.body.scrollHeight;
    }

    drawInvaders();

    // Event keys handler
    const keyHandler = (e) => {
      if (shell.loginState !== 'GAME') return;
      const key = e.key.toLowerCase();

      if (key === 'q') {
        e.preventDefault();
        game.gameOver = true;
        return;
      }

      if (key === 'arrowleft' || key === 'a') {
        e.preventDefault();
        game.playerX = Math.max(0, game.playerX - 2);
        drawInvaders();
      } else if (key === 'arrowright' || key === 'd') {
        e.preventDefault();
        game.playerX = Math.min(width - 5, game.playerX + 2);
        drawInvaders();
      } else if (e.key === ' ') {
        e.preventDefault();
        // Limit active player bullets
        if (game.bullets.length < 3) {
          game.bullets.push({ x: game.playerX + 2, y: game.playerY - 2 });
          audio.playInvadersShoot();
          drawInvaders();
        }
      }
    };
    document.addEventListener('keydown', keyHandler);

    // Dynamic gameplay interval
    await new Promise((resolve) => {
      const loop = setInterval(() => {
        if (game.gameOver || shell.abortSignal) {
          clearInterval(loop);
          resolve();
          return;
        }

        game.tickCount++;

        // 1. Move Player Bullets
        game.bullets.forEach(b => b.y -= 1);
        game.bullets = game.bullets.filter(b => b.y >= 0);

        // 2. Move Alien Bullets
        game.alienBullets.forEach(b => b.y += 0.8);
        game.alienBullets = game.alienBullets.filter(b => b.y < height);

        // 3. Move Aliens (moves periodically to match retro feel)
        if (game.tickCount % alienMoveSpeed === 0) {
          let hitBorder = false;
          game.aliens.forEach(al => {
            if (!al.alive) return;
            const nextX = al.x + game.alienDir * 2;
            if (nextX < 1 || nextX > width - 5) {
              hitBorder = true;
            }
          });

          if (hitBorder) {
            game.alienDir = -game.alienDir;
            game.aliens.forEach(al => {
              if (al.alive) al.y += 2;
            });
          } else {
            game.aliens.forEach(al => {
              if (al.alive) al.x += game.alienDir * 2;
            });
          }
        }

        // 4. Random Alien shooting
        game.aliens.forEach(al => {
          if (al.alive && Math.random() < shootFreq) {
            // Find if bottom-most alien in its column to avoid self-shooting
            const columnAliens = game.aliens.filter(other => other.alive && other.x === al.x && other.y > al.y);
            if (columnAliens.length === 0) {
              game.alienBullets.push({ x: al.x + 2, y: al.y + 2 });
            }
          }
        });

        // 5. Collisions: Player bullets hitting Aliens
        game.bullets.forEach((bullet, bIdx) => {
          game.aliens.forEach(al => {
            if (al.alive && bullet.x >= al.x && bullet.x < al.x + 4 && Math.round(bullet.y) >= al.y && Math.round(bullet.y) < al.y + 2) {
              al.alive = false;
              game.bullets.splice(bIdx, 1);
              game.score += 30;
              audio.playInvadersExplosion();
            }
          });
        });

        // 6. Collisions: Player bullets hitting Bunkers
        game.bullets.forEach((bullet, bIdx) => {
          const hitBunker = game.bunkers.find(b => b.hp > 0 && b.x === bullet.x && b.y === Math.round(bullet.y));
          if (hitBunker) {
            hitBunker.hp--;
            game.bullets.splice(bIdx, 1);
          }
        });

        // 7. Collisions: Alien bullets hitting Bunkers
        game.alienBullets.forEach((bullet, bIdx) => {
          const hitBunker = game.bunkers.find(b => b.hp > 0 && b.x === bullet.x && b.y === Math.round(bullet.y));
          if (hitBunker) {
            hitBunker.hp--;
            game.alienBullets.splice(bIdx, 1);
          }
        });

        // 8. Collisions: Alien bullets hitting Player
        game.alienBullets.forEach((bullet, bIdx) => {
          // Player bounds: base y = 28, top y = 27
          const isPlayerHit = (bullet.x >= game.playerX && bullet.x <= game.playerX + 4 && Math.round(bullet.y) === 28) ||
            (bullet.x === game.playerX + 2 && Math.round(bullet.y) === 27);
          if (isPlayerHit) {
            game.alienBullets.splice(bIdx, 1);
            game.gameOver = true;
            audio.playTetrisGameOver();
          }
        });

        // 9. Check Aliens landing
        game.aliens.forEach(al => {
          if (al.alive && al.y >= 26) {
            game.gameOver = true;
            audio.playTetrisGameOver();
          }
        });

        // 10. Check Win Condition
        if (!game.aliens.some(al => al.alive)) {
          game.gameOver = true;
          game.gameWon = true;
          audio.playTetrisLevelUp();
        }

        drawInvaders();
      }, 50);
    });

    // Cleanup
    document.removeEventListener('keydown', keyHandler);
    shell.loginState = 'LOGGED_IN';

    // Print Game Outcome
    if (game.gameWon) {
      shell.print('Congratulations! You saved the terminal from Space Invaders!', 'color-green');
    } else if (shell.abortSignal) {
      shell.print('Space Invaders game interrupted.', 'color-dim');
    } else {
      shell.print('Game Over! The invaders have defeated you.', 'color-error');
    }

    // High Score updating
    if (game.score > highscore) {
      highscore = game.score;
      localStorage.setItem(highscoreKey, highscore.toString());
      shell.print(`NEW HIGH SCORE: ${highscore}!`, 'color-accent');
    } else {
      shell.print(`Final Score: ${game.score}`, 'color-blue');
    }
  }
};
