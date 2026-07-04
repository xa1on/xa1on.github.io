export const buddies = {
  name: 'buddies',
  description: 'Display buddy box.',
  category: 'general',
  args: [],
  run: async (args, shell) => {
    shell.printBuddyBox();
  }
};
