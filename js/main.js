import { FileSystem } from './fs.js';
import { Shell } from './shell.js';
import { commands } from './commands/index.js';

// Instantiate FileSystem and Shell contexts
const fileSystem = new FileSystem();
const makeGameCommand = (fileName, exportName, helpText, displayName) => ({
  helpText,
  category: 'game',
  run: async (args, shellInstance) => {
    try {
      const module = await import(`../games/${fileName}.js`);
      await module[exportName].run(args, shellInstance);
    } catch (err) {
      shellInstance.print(`Error starting ${displayName}: ${err.message}`, 'color-error');
      console.error(err);
    }
  }
});

const shell = new Shell({
  fileSystem,
  commands: {
    ...commands,
    pong: makeGameCommand('pong', 'pong', 'Play a game of Pong (easy|medium|hard).', 'Pong'),
    tetris: makeGameCommand('tetris', 'tetris', 'Play a game of Tetris.', 'Tetris'),
    snake: makeGameCommand('snake', 'snake', 'Play a game of Snake (easy|medium|hard).', 'Snake'),
    minesweeper: makeGameCommand('minesweeper', 'minesweeper', 'Play a game of Minesweeper (easy|medium|hard|custom <cols> <rows> <mines>).', 'Minesweeper'),
    invaders: makeGameCommand('invaders', 'invaders', 'Play a game of Space Invaders (easy|medium|hard).', 'Space Invaders'),
    sokoban: makeGameCommand('sokoban', 'sokoban', 'Play a game of Sokoban. Usage: sokoban [path/to/custom_level.txt]', 'Sokoban')
  }
});

// Initialize event listeners and start shell lifecycle
shell.mount();
shell.startConnection();
