export const help = {
  helpText: 'List available commands.',
  run: async (args, shell) => {
    let generalText = 'Available Commands:';
    let gameText = '\nAvailable Games:';
    const sortedCommands = Object.entries(shell.commands).sort((a, b) => a[0].localeCompare(b[0]));
    for (const [name, cmd] of sortedCommands) {
      const line = `\n  <span class="blue cmd-link color-accent" data-cmd="${name}">${name.padEnd(14)}</span> ${cmd.helpText}`;
      if (cmd.category === 'game') {
        gameText += line;
      } else {
        generalText += line;
      }
    }
    shell.print(generalText + '\n' + gameText);
  }
};
