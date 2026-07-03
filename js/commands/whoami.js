export const whoami = {
  helpText: 'Print the current session user name.',
  run: async (args, shell) => {
    shell.print(shell.currentUsername);
  }
};
