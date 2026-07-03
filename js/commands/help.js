export const help = {
  helpText: 'List available commands.',
  run: async (args, shell) => {
    let generalText = 'Available Commands:';
    let gameText = '\nAvailable Games:';
    for (const [name, cmd] of Object.entries(shell.commands)) {
      const line = `\n  <span class="color-accent">${name.padEnd(14)}</span> ${cmd.helpText}`;
      if (cmd.category === 'game') {
        gameText += line;
      } else {
        generalText += line;
      }
    }
    shell.print(generalText + '\n' + gameText);
  }
};
