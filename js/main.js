import { FileSystem } from './fs.js';
import { Shell } from './shell.js';
import { commands } from './commands/index.js';
import { pong } from '../games/pong.js';
import { tetris } from '../games/tetris.js';

// Instantiate FileSystem and Shell contexts
const fileSystem = new FileSystem();
const shell = new Shell({
  fileSystem,
  commands: {
    ...commands,
    pong: { ...pong, category: 'game' },
    tetris: { ...tetris, category: 'game' }
  }
});

// Initialize event listeners and start shell lifecycle
shell.mount();
shell.startConnection();
