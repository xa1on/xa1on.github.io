import { help } from './help.js';
import { ls } from './ls.js';
import { cd } from './cd.js';
import { cat } from './cat.js';
import { clear } from './clear.js';
import { whoami } from './whoami.js';
import { date } from './date.js';
import { ping } from './ping.js';
import { llm } from './llm.js';
import { neofetch } from './neofetch.js';
import { sound } from './sound.js';
import { touch } from './touch.js';
import { mkdir } from './mkdir.js';
import { rm } from './rm.js';
import { nano } from './nano.js';
import { vim } from './vim.js';

export const commands = {
  help,
  ls,
  cd,
  cat,
  clear,
  whoami,
  date,
  ping,
  llm,
  neofetch,
  sound,
  touch,
  mkdir,
  rm,
  nano,
  vim,
  mute: {
    helpText: 'Mute all sounds.',
    run: async (args, shell) => {
      await sound.run(['off'], shell);
    }
  },
  unmute: {
    helpText: 'Unmute all sounds.',
    run: async (args, shell) => {
      await sound.run(['on'], shell);
    }
  }
};
