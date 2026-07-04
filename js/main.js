import { FileSystem } from './fs.js';
import { Shell } from './shell.js';
import { commands } from './commands/index.js';

// Instantiate FileSystem and Shell contexts
const fileSystem = new FileSystem();
const shell = new Shell({
  fileSystem,
  commands: {
    ...commands,
    pong: {
      helpText: 'Play a game of Pong (easy|medium|hard).',
      category: 'game',
      run: async (args, shellInstance) => {
        try {
          const { pong } = await import('../games/pong.js');
          await pong.run(args, shellInstance);
        } catch (err) {
          shellInstance.print(`Error starting Pong: ${err.message}`, 'color-error');
          console.error(err);
        }
      }
    },
    tetris: {
      helpText: 'Play a game of Tetris.',
      category: 'game',
      run: async (args, shellInstance) => {
        try {
          const { tetris } = await import('../games/tetris.js');
          await tetris.run(args, shellInstance);
        } catch (err) {
          shellInstance.print(`Error starting Tetris: ${err.message}`, 'color-error');
          console.error(err);
        }
      }
    },
    snake: {
      helpText: 'Play a game of Snake (easy|medium|hard).',
      category: 'game',
      run: async (args, shellInstance) => {
        try {
          const { snake } = await import('../games/snake.js');
          await snake.run(args, shellInstance);
        } catch (err) {
          shellInstance.print(`Error starting Snake: ${err.message}`, 'color-error');
          console.error(err);
        }
      }
    },
    minesweeper: {
      helpText: 'Play a game of Minesweeper (easy|medium|hard|custom <cols> <rows> <mines>).',
      category: 'game',
      run: async (args, shellInstance) => {
        try {
          const { minesweeper } = await import('../games/minesweeper.js');
          await minesweeper.run(args, shellInstance);
        } catch (err) {
          shellInstance.print(`Error starting Minesweeper: ${err.message}`, 'color-error');
          console.error(err);
        }
      }
    },
    invaders: {
      helpText: 'Play a game of Space Invaders (easy|medium|hard).',
      category: 'game',
      run: async (args, shellInstance) => {
        try {
          const { invaders } = await import('../games/invaders.js');
          await invaders.run(args, shellInstance);
        } catch (err) {
          shellInstance.print(`Error starting Space Invaders: ${err.message}`, 'color-error');
          console.error(err);
        }
      }
    },
    sokoban: {
      helpText: 'Play a game of Sokoban. Usage: sokoban [path/to/custom_level.txt]',
      category: 'game',
      run: async (args, shellInstance) => {
        try {
          const { sokoban } = await import('../games/sokoban.js');
          await sokoban.run(args, shellInstance);
        } catch (err) {
          shellInstance.print(`Error starting Sokoban: ${err.message}`, 'color-error');
          console.error(err);
        }
      }
    }
  }
});

// Initialize event listeners and start shell lifecycle
shell.mount();
shell.startConnection();
