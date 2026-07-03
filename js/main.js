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
    }
  }
});

// Initialize event listeners and start shell lifecycle
shell.mount();
shell.startConnection();
