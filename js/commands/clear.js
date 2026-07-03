export const clear = {
  helpText: 'Clear the terminal screen.',
  run: async (args, shell) => {
    shell.clear();
  }
};
