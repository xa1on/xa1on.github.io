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

  // Lazy loaded commands (loaded on-demand and preloaded in background on boot)
  llm: { name: 'llm', category: 'general', lazy: true, import: () => import('./general/llm.js') },
  nano: { name: 'nano', category: 'filesystem', lazy: true, import: () => import('./filesystem/nano.js') },
  vim: { name: 'vim', category: 'filesystem', lazy: true, import: () => import('./filesystem/vim.js') },
  pong: { name: 'pong', category: 'game', lazy: true, import: () => import('./games/pong.js') },
  tetris: { name: 'tetris', category: 'game', lazy: true, import: () => import('./games/tetris.js') },
  snake: { name: 'snake', category: 'game', lazy: true, import: () => import('./games/snake.js') },
  minesweeper: { name: 'minesweeper', category: 'game', lazy: true, import: () => import('./games/minesweeper.js') },
  invaders: { name: 'invaders', category: 'game', lazy: true, import: () => import('./games/invaders.js') },
  sokoban: { name: 'sokoban', category: 'game', lazy: true, import: () => import('./games/sokoban.js') }
};
