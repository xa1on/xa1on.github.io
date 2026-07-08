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
import { echo } from './general/echo.js';
import { sudo } from './general/sudo.js';

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
  echo,
  sudo,

  // Lazy loaded commands (loaded on-demand and preloaded in background on boot)
  llm: {
    name: 'llm',
    description: 'Interact with a local in-browser LLM via WebGPU.',
    category: 'general',
    args: [
      { name: 'prompt', description: 'Optional initial prompt for the AI agent.', required: false }
    ],
    lazy: true,
    import: () => import('./general/llm.js')
  },
  nano: {
    name: 'nano',
    description: 'Edit a text file using the nano terminal editor.',
    category: 'filesystem',
    args: [
      { name: 'filename', description: 'File to edit or create.', required: true }
    ],
    lazy: true,
    import: () => import('./filesystem/nano.js')
  },
  vim: {
    name: 'vim',
    description: 'Edit a text file using the vim terminal editor.',
    category: 'filesystem',
    args: [
      { name: 'filename', description: 'File to edit or create.', required: true }
    ],
    lazy: true,
    import: () => import('./filesystem/vim.js')
  },
  pong: {
    name: 'pong',
    description: 'Play a game of Pong.',
    category: 'game',
    args: [
      { name: 'difficulty', description: 'Difficulty level (easy, medium, hard).', required: false, suggestions: ['easy', 'medium', 'hard'] }
    ],
    lazy: true,
    import: () => import('./games/pong.js')
  },
  tetris: {
    name: 'tetris',
    description: 'Play a game of Tetris.',
    category: 'game',
    args: [],
    lazy: true,
    import: () => import('./games/tetris.js')
  },
  snake: {
    name: 'snake',
    description: 'Play a game of Snake.',
    category: 'game',
    args: [
      { name: 'difficulty', description: 'Difficulty level (easy, medium, hard).', required: false, suggestions: ['easy', 'medium', 'hard'] }
    ],
    lazy: true,
    import: () => import('./games/snake.js')
  },
  minesweeper: {
    name: 'minesweeper',
    description: 'Play a game of Minesweeper.',
    category: 'game',
    args: [
      { name: 'difficulty', description: 'Difficulty level (easy, medium, hard, or custom <cols> <rows> <mines>).', required: false, suggestions: ['easy', 'medium', 'hard', 'custom'] }
    ],
    lazy: true,
    import: () => import('./games/minesweeper.js')
  },
  invaders: {
    name: 'invaders',
    description: 'Play a game of Space Invaders.',
    category: 'game',
    args: [
      { name: 'difficulty', description: 'Difficulty level (easy, medium, hard).', required: false, suggestions: ['easy', 'medium', 'hard'] }
    ],
    lazy: true,
    import: () => import('./games/invaders.js')
  },
  sokoban: {
    name: 'sokoban',
    description: 'Play a game of Sokoban.',
    category: 'game',
    args: [
      { name: 'level_path', description: 'Path to custom level file.', required: false }
    ],
    lazy: true,
    import: () => import('./games/sokoban.js')
  }
};
