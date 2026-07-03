import { audio } from '../audio.js';

export const sound = {
  helpText: 'Toggle audio on or off (sound [on|off]).',
  run: async (args, shell) => {
    if (args.length === 0) {
      const newState = audio.toggle();
      shell.print(`Audio has been <span class="${newState ? 'color-green' : 'color-error'}">${newState ? 'enabled' : 'disabled'}</span>.`);
      if (newState) {
        audio.playBootChime();
      }
      return;
    }

    const sub = args[0].toLowerCase();
    if (sub === 'on' || sub === 'enable' || sub === 'unmute') {
      audio.setEnabled(true);
      shell.print('Audio has been <span class="color-green">enabled</span>.');
      audio.playBootChime();
    } else if (sub === 'off' || sub === 'disable' || sub === 'mute') {
      audio.setEnabled(false);
      shell.print('Audio has been <span class="color-error">disabled</span>.');
    } else {
      shell.print('Usage: sound [on|off]', 'color-dim');
    }
  }
};
