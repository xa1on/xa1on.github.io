// Register Pong Game in modular registry
window.Terminal.games.pong = {
  helpText: 'Play a game of Pong (easy|medium|hard).',
  run: async (args) => {
    let diffText = args.length > 0 ? args[0].toLowerCase() : '';

    // Choose difficulty if none specified or invalid
    while (diffText !== 'easy' && diffText !== 'medium' && diffText !== 'hard' && diffText !== '1' && diffText !== '2' && diffText !== '3') {
      window.Terminal.print('Select difficulty:\n  [1] Easy\n  [2] Medium\n  [3] Hard');
      const response = await window.Terminal.readInput('Choose difficulty (1-3): ');
      diffText = response.trim().toLowerCase();
      if (diffText === '') {
        window.Terminal.print('Pong cancelled.', 'color-dim');
        return;
      }
    }

    let difficulty = 'easy';
    if (diffText === '2' || diffText === 'medium') difficulty = 'medium';
    if (diffText === '3' || diffText === 'hard') difficulty = 'hard';

    // Enter generic gameplay state
    window.Terminal.loginState = 'GAME';

    // Scoped game state variables
    const pongGame = {
      playerY: 4,
      cpuY: 4,
      ballX: 22,
      ballY: 5,
      ballDx: Math.random() > 0.5 ? 1 : -1,
      ballDy: Math.random() > 0.5 ? 0.5 : -0.5,
      playerScore: 0,
      cpuScore: 0,
      boardWidth: 44,
      boardHeight: 12,
      paddleHeight: 3,
      difficulty: difficulty,
      gameOver: false
    };

    const gameContainer = document.createElement('pre');
    gameContainer.style.fontFamily = 'monospace';
    gameContainer.style.lineHeight = '1.15';
    gameContainer.style.color = 'var(--text-color)';
    window.Terminal.output.appendChild(gameContainer);

    function drawPong() {
      let board = '';
      const width = pongGame.boardWidth;
      const height = pongGame.boardHeight;

      board += '─'.repeat(width + 2) + '\n';

      for (let y = 0; y < height; y++) {
        let line = '│';
        for (let x = 0; x < width; x++) {
          const isLeftPaddle = (x === 1) && (y >= pongGame.playerY && y < pongGame.playerY + pongGame.paddleHeight);
          const isRightPaddle = (x === width - 2) && (y >= pongGame.cpuY && y < pongGame.cpuY + pongGame.paddleHeight);
          const isBall = (x === Math.round(pongGame.ballX)) && (y === Math.round(pongGame.ballY));

          if (isLeftPaddle || isRightPaddle) {
            line += '█';
          } else if (isBall) {
            line += '●';
          } else {
            line += ' ';
          }
        }
        line += '│\n';
        board += line;
      }

      board += '─'.repeat(width + 2) + '\n';
      board += ` Score: Player ${pongGame.playerScore} ║ CPU ${pongGame.cpuScore}   (Difficulty: ${pongGame.difficulty.toUpperCase()})\n`;
      board += ` Controls: [ArrowUp]/[ArrowDown] to move. Press [Q] to quit.\n`;

      gameContainer.textContent = board;
      window.Terminal.body.scrollTop = window.Terminal.body.scrollHeight;
    }

    drawPong();

    function resetBall(direction) {
      pongGame.ballX = Math.floor(pongGame.boardWidth / 2);
      pongGame.ballY = Math.floor(pongGame.boardHeight / 2);
      pongGame.ballDx = direction;
      pongGame.ballDy = Math.random() > 0.5 ? 0.5 : -0.5;
    }

    // Attach key listener globally during gameplay
    const keyHandler = (e) => {
      if (window.Terminal.loginState === 'GAME') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          pongGame.playerY = Math.max(0, pongGame.playerY - 1);
          drawPong();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          pongGame.playerY = Math.min(pongGame.boardHeight - pongGame.paddleHeight, pongGame.playerY + 1);
          drawPong();
        } else if (e.key === 'q' || e.key === 'Q') {
          e.preventDefault();
          pongGame.gameOver = true;
        }
      }
    };
    document.addEventListener('keydown', keyHandler);

    await new Promise((resolve) => {
      const gameInterval = setInterval(() => {
        if (pongGame.gameOver) {
          clearInterval(gameInterval);
          resolve();
          return;
        }

        // Move Ball
        pongGame.ballX += pongGame.ballDx;
        pongGame.ballY += pongGame.ballDy;

        // Bounce top/bottom
        if (pongGame.ballY <= 0) {
          pongGame.ballY = 0;
          pongGame.ballDy = -pongGame.ballDy;
        } else if (pongGame.ballY >= pongGame.boardHeight - 1) {
          pongGame.ballY = pongGame.boardHeight - 1;
          pongGame.ballDy = -pongGame.ballDy;
        }

        // Left paddle collision
        if (pongGame.ballX <= 2 && pongGame.ballDx < 0) {
          if (pongGame.ballY >= pongGame.playerY && pongGame.ballY < pongGame.playerY + pongGame.paddleHeight) {
            pongGame.ballX = 2;
            pongGame.ballDx = 1;
            const hitPos = pongGame.ballY - pongGame.playerY;
            if (hitPos === 0) pongGame.ballDy = -0.75;
            else if (hitPos === 2) pongGame.ballDy = 0.75;
            else pongGame.ballDy = (Math.random() > 0.5 ? 0.5 : -0.5);
          }
        }

        // Right paddle collision
        if (pongGame.ballX >= pongGame.boardWidth - 3 && pongGame.ballDx > 0) {
          if (pongGame.ballY >= pongGame.cpuY && pongGame.ballY < pongGame.cpuY + pongGame.paddleHeight) {
            pongGame.ballX = pongGame.boardWidth - 3;
            pongGame.ballDx = -1;
            const hitPos = pongGame.ballY - pongGame.cpuY;
            if (hitPos === 0) pongGame.ballDy = -0.75;
            else if (hitPos === 2) pongGame.ballDy = 0.75;
            else pongGame.ballDy = (Math.random() > 0.5 ? 0.5 : -0.5);
          }
        }

        // CPU AI movement
        const ballTarget = pongGame.ballY;
        const cpuCenter = pongGame.cpuY + 1;
        let moveProbability = 0.45;
        if (pongGame.difficulty === 'medium') moveProbability = 0.70;
        if (pongGame.difficulty === 'hard') moveProbability = 0.92;

        if (Math.random() < moveProbability) {
          if (cpuCenter < ballTarget) {
            pongGame.cpuY = Math.min(pongGame.boardHeight - pongGame.paddleHeight, pongGame.cpuY + 1);
          } else if (cpuCenter > ballTarget) {
            pongGame.cpuY = Math.max(0, pongGame.cpuY - 1);
          }
        }

        // Point scoring
        if (pongGame.ballX < 0) {
          pongGame.cpuScore++;
          if (pongGame.cpuScore >= 5) {
            pongGame.gameOver = true;
          } else {
            resetBall(1);
          }
        } else if (pongGame.ballX >= pongGame.boardWidth) {
          pongGame.playerScore++;
          if (pongGame.playerScore >= 5) {
            pongGame.gameOver = true;
          } else {
            resetBall(-1);
          }
        }

        drawPong();
      }, 80);
    });

    // Cleanup listeners and restore state
    document.removeEventListener('keydown', keyHandler);
    window.Terminal.loginState = 'LOGGED_IN';

    if (pongGame.playerScore >= 5) {
      window.Terminal.print('Congratulations! You won the match!', 'color-green');
    } else if (pongGame.cpuScore >= 5) {
      window.Terminal.print('Game Over! The CPU won the match.', 'color-error');
    } else {
      window.Terminal.print('Pong game terminated.', 'color-dim');
    }
  }
};
