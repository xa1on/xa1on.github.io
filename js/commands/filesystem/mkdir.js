export const mkdir = {
  name: 'mkdir',
  description: 'Create a new directory.',
  category: 'filesystem',
  args: [
    { name: 'directory_name', description: 'Name of the new directory to create.', required: true }
  ],
  run: async (args, shell) => {
    let dirArg = args[0].trim();
    while (dirArg.endsWith('/') && dirArg.length > 1) {
      dirArg = dirArg.slice(0, -1);
    }

    if (dirArg === '') {
      shell.print('mkdir: invalid empty directory name', 'color-error');
      return;
    }

    let parentPathStr = '';
    let name = dirArg;
    const lastSlash = dirArg.lastIndexOf('/');
    if (lastSlash !== -1) {
      parentPathStr = dirArg.slice(0, lastSlash);
      name = dirArg.slice(lastSlash + 1);
      if (parentPathStr === '') {
        parentPathStr = '/';
      }
    }

    const resolvedParent = shell.fileSystem.resolvePath(shell.currentPath, parentPathStr);
    if (resolvedParent === null) {
      shell.print(`mkdir: cannot create directory '${dirArg}': No such file or directory`, 'color-error');
      return;
    }

    const targetPath = [...resolvedParent, name];

    try {
      shell.fileSystem.createDirectory(targetPath);
    } catch (err) {
      shell.print(`mkdir: cannot create directory '${dirArg}': ${err.message}`, 'color-error');
    }
  }
};
