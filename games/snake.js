import { audio } from '../js/audio.js';

export const snake = {
  helpText: 'Play a game of Snake (easy|medium|hard).',
  run: async (args, shell) => {
    let diffText = args.length > 0 ? args[0].toLowerCase() : '';

    const highscoreKey = 'snake_highscore';
    let highscore = parseInt(localStorage.getItem(highscoreKey) || '0', 10);

    // Prompt for difficulty if not provided or invalid
    while (diffText !== 'easy' && diffText !== 'medium' && diffText !== 'hard' && diffText !== '1' && diffText !== '2' && diffText !== '3') {
      shell.print(`--- SNAKE ---`);
      shell.print(`Personal High Score: ${highscore}`);
      shell.print(`Select difficulty:\n  [1] Easy\n  [2] Medium\n  [3] Hard`);
      const response = await shell.readInput('Choose difficulty (1-3): ');
      if (response === null) {
        shell.print('Snake game cancelled.', 'color-dim');
        return;
      }
      diffText = response.trim().toLowerCase();
      if (diffText === '') {
        shell.print('Snake game cancelled.', 'color-dim');
        return;
      }
    }

    let difficulty = 'medium';
    let speed = 100; // interval in ms
    if (diffText === '1' || diffText === 'easy') {
      difficulty = 'easy';
      speed = 150;
    } else if (diffText === '2' || diffText === 'medium') {
      difficulty = 'medium';
      speed = 100;
    } else if (diffText === '3' || diffText === 'hard') {
      difficulty = 'hard';
      speed = 60;
    }

    // Set shell state to game
    shell.loginState = 'GAME';

    // Game state
    const width = 40;
    const height = 30; // subpixel height, 15 text characters
    const gameState = {
      snake: [
        { x: 10, y: 14 },
        { x: 9, y: 14 },
        { x: 8, y: 14 }
      ],
      dir: 'RIGHT',
      nextDir: 'RIGHT',
      food: { x: 25, y: 14 },
      score: 0,
      gameOver: false
    };

    const gameContainer = document.createElement('pre');
    gameContainer.style.fontFamily = 'monospace';
    gameContainer.style.lineHeight = '1.15';
    gameContainer.style.color = 'var(--text-color)';
    shell.output.appendChild(gameContainer);

    function generateFood() {
      while (true) {
        const x = Math.floor(Math.random() * width);
        const y = Math.floor(Math.random() * height);
        // Ensure food is not on snake
        if (!gameState.snake.some(segment => segment.x === x && segment.y === y)) {
          gameState.food = { x, y };
          break;
        }
      }
    }

    function drawSnake() {
      let board = '';
      board += '┌' + '─'.repeat(width) + '┐\n';

      for (let r = 0; r < height / 2; r++) {
        let line = '│';
        const topY = 2 * r;
        const bottomY = 2 * r + 1;

        for (let x = 0; x < width; x++) {
          const isTopSnake = gameState.snake.some(segment => segment.x === x && segment.y === topY);
          const isBottomSnake = gameState.snake.some(segment => segment.x === x && segment.y === bottomY);
          const isTopFood = (gameState.food.x === x && gameState.food.y === topY);
          const isBottomFood = (gameState.food.x === x && gameState.food.y === bottomY);

          const topHead = (gameState.snake[0].x === x && gameState.snake[0].y === topY);
          const bottomHead = (gameState.snake[0].x === x && gameState.snake[0].y === bottomY);

          let topType = null;
          if (topHead) topType = 'head';
          else if (isTopSnake) topType = 'body';
          else if (isTopFood) topType = 'food';

          let bottomType = null;
          if (bottomHead) bottomType = 'head';
          else if (isBottomSnake) bottomType = 'body';
          else if (isBottomFood) bottomType = 'food';

          let cellChar = ' ';
          if (topType && bottomType) {
            if (topType === 'food' || bottomType === 'food') {
              cellChar = '<span class="red">█</span>';
            } else if (topType === 'head' || bottomType === 'head') {
              cellChar = '<span class="green color-dim">█</span>';
            } else {
              cellChar = '<span class="green">█</span>';
            }
          } else if (topType) {
            if (topType === 'food') {
              cellChar = '<span class="red">▀</span>';
            } else if (topType === 'head') {
              cellChar = '<span class="green color-dim">▀</span>';
            } else {
              cellChar = '<span class="green">▀</span>';
            }
          } else if (bottomType) {
            if (bottomType === 'food') {
              cellChar = '<span class="red">▄</span>';
            } else if (bottomType === 'head') {
              cellChar = '<span class="green color-dim">▄</span>';
            } else {
              cellChar = '<span class="green">▄</span>';
            }
          }
          line += cellChar;
        }
        line += '│\n';
        board += line;
      }

      board += '└' + '─'.repeat(width) + '┘\n';
      board += ` Score: ${gameState.score} ║ High Score: ${highscore} ║ Difficulty: ${difficulty.toUpperCase()}\n`;
      board += ` Controls: [ArrowKeys] or [WASD] to turn. Press [Q] to quit.\n`;

      gameContainer.innerHTML = board;
      shell.body.scrollTop = shell.body.scrollHeight;
    }

    drawSnake();

    const keyHandler = (e) => {
      if (shell.loginState === 'GAME') {
        const key = e.key.toLowerCase();
        if (key === 'q') {
          e.preventDefault();
          gameState.gameOver = true;
          return;
        }

        // Avoid turning 180 degrees instantly
        if ((key === 'arrowup' || key === 'w') && gameState.dir !== 'DOWN') {
          e.preventDefault();
          gameState.nextDir = 'UP';
        } else if ((key === 'arrowdown' || key === 's') && gameState.dir !== 'UP') {
          e.preventDefault();
          gameState.nextDir = 'DOWN';
        } else if ((key === 'arrowleft' || key === 'a') && gameState.dir !== 'RIGHT') {
          e.preventDefault();
          gameState.nextDir = 'LEFT';
        } else if ((key === 'arrowright' || key === 'd') && gameState.dir !== 'LEFT') {
          e.preventDefault();
          gameState.nextDir = 'RIGHT';
        }
      }
    };

    document.addEventListener('keydown', keyHandler);

    await new Promise((resolve) => {
      const loop = setInterval(() => {
        if (gameState.gameOver || shell.abortSignal) {
          clearInterval(loop);
          resolve();
          return;
        }

        gameState.dir = gameState.nextDir;
        const head = { ...gameState.snake[0] };

        // Move head
        switch (gameState.dir) {
          case 'UP': head.y--; break;
          case 'DOWN': head.y++; break;
          case 'LEFT': head.x--; break;
          case 'RIGHT': head.x++; break;
        }

        // Collision check - boundary walls
        if (head.x < 0 || head.x >= width || head.y < 0 || head.y >= height) {
          gameState.gameOver = true;
          audio.playSnakeCrash();
          return;
        }

        // Collision check - self body
        if (gameState.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
          gameState.gameOver = true;
          audio.playSnakeCrash();
          return;
        }

        // Prepend head
        gameState.snake.unshift(head);

        // Check if food eaten
        if (head.x === gameState.food.x && head.y === gameState.food.y) {
          gameState.score += 10;
          audio.playSnakeEat();
          generateFood();
        } else {
          // Remove tail
          gameState.snake.pop();
        }

        drawSnake();
      }, speed);
    });

    // Cleanup
    document.removeEventListener('keydown', keyHandler);
    shell.loginState = 'LOGGED_IN';

    // Update high score
    if (gameState.score > highscore) {
      highscore = gameState.score;
      localStorage.setItem(highscoreKey, highscore.toString());
      shell.print(`NEW HIGH SCORE! Score: ${gameState.score}`, 'color-green');
    } else {
      shell.print(`Game Over! Final Score: ${gameState.score}`, 'color-error');
    }
  }
};
