import { FileSystem } from './fs.js';
import { Shell } from './shell.js';
import { commands } from './commands/index.js';

// Instantiate FileSystem and Shell contexts
const fileSystem = new FileSystem();

const shell = new Shell({
  fileSystem,
  commands
});

// Initialize event listeners and start shell lifecycle
shell.mount();
shell.startConnection();
