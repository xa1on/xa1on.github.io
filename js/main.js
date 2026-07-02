import { FileSystem } from './fs.js';
import { Shell } from './shell.js';
import { commands } from './commands.js';
import { pong } from '../games/pong.js';
import { tetris } from '../games/tetris.js';

// Instantiate FileSystem and Shell contexts
const fileSystem = new FileSystem();
const shell = new Shell({
  fileSystem,
  commands
});

// Register games onto the shell environment
shell.games.pong = pong;
shell.games.tetris = tetris;

// Initialize event listeners and start shell lifecycle
shell.mount();
shell.startConnection();
