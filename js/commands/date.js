export const date = {
  helpText: 'Display the current system date and time.',
  run: async (args, shell) => {
    shell.print(new Date().toString());
  }
};
