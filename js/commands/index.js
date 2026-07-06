// Eagerly loaded core and helper commands
import { help } from './general/help.js';
import { ls } from './filesystem/ls.js';
import { cd } from './filesystem/cd.js';
import { cat } from './filesystem/cat.js';
import { clear } from './general/clear.js';
import { whoami } from './general/whoami.js';
import { date } from './general/date.js';
import { ping } from './general/ping.js';
import { neofetch } from './general/neofetch.js';
import { sound } from './audio/sound.js';
import { touch } from './filesystem/touch.js';
import { mkdir } from './filesystem/mkdir.js';
import { rm } from './filesystem/rm.js';
import { mute } from './audio/mute.js';
import { unmute } from './audio/unmute.js';
import { buddies } from './general/buddies.js';

export const commands = {
  // Eagerly loaded
  help,
  ls,
  cd,
  cat,
  clear,
  whoami,
  date,
  ping,
  neofetch,
  sound,
  touch,
  mkdir,
  rm,
  mute,
  unmute,
  buddies,

  // Lazy loaded LLM interface
  llm: {
    name: 'llm',
    description: 'Interact with a local in-browser LLM via WebGPU.',
    category: 'general',
    args: [
      { name: 'prompt', description: 'Optional initial prompt for the AI agent.', required: false }
    ],
    run: async (args, shell) => {
      const { llm } = await import('./general/llm.js');
      return llm.run(args, shell);
    }
  },

  // Lazy loaded Editors
  nano: {
    name: 'nano',
    description: 'Edit a text file using the nano terminal editor.',
    category: 'filesystem',
    args: [
      { name: 'filename', description: 'File to edit or create.', required: true }
    ],
    run: async (args, shell) => {
      const { nano } = await import('./filesystem/nano.js');
      return nano.run(args, shell);
    }
  },
  vim: {
    name: 'vim',
    description: 'Edit a text file using the vim terminal editor.',
    category: 'filesystem',
    args: [
      { name: 'filename', description: 'File to edit or create.', required: true }
    ],
    run: async (args, shell) => {
      const { vim } = await import('./filesystem/vim.js');
      return vim.run(args, shell);
    }
  },

  // Lazy loaded Games
  pong: {
    name: 'pong',
    description: 'Play a game of Pong.',
    category: 'game',
    args: [
      { name: 'difficulty', description: 'Difficulty level (easy, medium, hard).', required: false, suggestions: ['easy', 'medium', 'hard'] }
    ],
    run: async (args, shell) => {
      const { pong } = await import('./games/pong.js');
      return pong.run(args, shell);
    }
  },
  tetris: {
    name: 'tetris',
    description: 'Play a game of Tetris.',
    category: 'game',
    args: [],
    run: async (args, shell) => {
      const { tetris } = await import('./games/tetris.js');
      return tetris.run(args, shell);
    }
  },
  snake: {
    name: 'snake',
    description: 'Play a game of Snake.',
    category: 'game',
    args: [],
    run: async (args, shell) => {
      const { snake } = await import('./games/snake.js');
      return snake.run(args, shell);
    }
  },
  minesweeper: {
    name: 'minesweeper',
    description: 'Play a game of Minesweeper.',
    category: 'game',
    args: [
      { name: 'difficulty', description: 'Difficulty level (easy, medium, hard).', required: false, suggestions: ['easy', 'medium', 'hard'] }
    ],
    run: async (args, shell) => {
      const { minesweeper } = await import('./games/minesweeper.js');
      return minesweeper.run(args, shell);
    }
  },
  invaders: {
    name: 'invaders',
    description: 'Play a game of Space Invaders.',
    category: 'game',
    args: [],
    run: async (args, shell) => {
      const { invaders } = await import('./games/invaders.js');
      return invaders.run(args, shell);
    }
  },
  sokoban: {
    name: 'sokoban',
    description: 'Play a game of Sokoban.',
    category: 'game',
    args: [
      { name: 'level', description: 'Starting level number (1-3).', required: false, suggestions: ['1', '2', '3'] }
    ],
    run: async (args, shell) => {
      const { sokoban } = await import('./games/sokoban.js');
      return sokoban.run(args, shell);
    }
  }
};
