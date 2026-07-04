export const touch = {
  name: 'touch',
  description: 'Create an empty file.',
  category: 'filesystem',
  args: [
    { name: 'filename', description: 'Name of the empty file to create.', required: true }
  ],
  run: async (args, shell) => {
    let fileArg = args[0].trim();
    while (fileArg.endsWith('/') && fileArg.length > 1) {
      fileArg = fileArg.slice(0, -1);
    }

    if (fileArg === '') {
      shell.print('touch: invalid empty filename', 'color-error');
      return;
    }

    let parentPathStr = '';
    let name = fileArg;
    const lastSlash = fileArg.lastIndexOf('/');
    if (lastSlash !== -1) {
      parentPathStr = fileArg.slice(0, lastSlash);
      name = fileArg.slice(lastSlash + 1);
      if (parentPathStr === '') {
        parentPathStr = '/';
      }
    }

    const resolvedParent = shell.fileSystem.resolvePath(shell.currentPath, parentPathStr);
    if (resolvedParent === null) {
      shell.print(`touch: cannot touch '${fileArg}': No such file or directory`, 'color-error');
      return;
    }

    const targetPath = [...resolvedParent, name];

    // Check if target already exists
    const targetNode = shell.fileSystem.getNodeByPath(targetPath);
    if (targetNode !== null) {
      // Node exists, standard touch just updates timestamp (no-op here)
      return;
    }

    try {
      shell.fileSystem.writeFile(targetPath, '');
    } catch (err) {
      shell.print(`touch: cannot touch '${fileArg}': ${err.message}`, 'color-error');
    }
  }
};
