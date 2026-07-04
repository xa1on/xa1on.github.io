export const rm = {
  helpText: 'Remove files or directories (rm [-rf] [path]).',
  run: async (args, shell) => {
    if (args.length === 0) {
      shell.print('rm: missing operand. Usage: rm [-rf] [path]', 'color-error');
      return;
    }

    let recursive = false;
    let force = false;
    const paths = [];

    for (const arg of args) {
      if (arg.startsWith('-')) {
        if (arg.includes('r')) recursive = true;
        if (arg.includes('f')) force = true;
      } else {
        paths.push(arg);
      }
    }

    if (paths.length === 0) {
      shell.print('rm: missing operand. Usage: rm [-rf] [path]', 'color-error');
      return;
    }

    for (const pathArg of paths) {
      const resolved = shell.fileSystem.resolvePath(shell.currentPath, pathArg);

      if (resolved === null) {
        if (!force) {
          shell.print(`rm: cannot remove '${pathArg}': No such file or directory`, 'color-error');
        }
        continue;
      }

      const node = shell.fileSystem.getNodeByPath(resolved);
      if (node && typeof node === 'object') {
        if (!recursive) {
          shell.print(`rm: cannot remove '${pathArg}': Is a directory`, 'color-error');
          continue;
        }
      }

      try {
        shell.fileSystem.deleteNode(resolved);
      } catch (err) {
        shell.print(`rm: cannot remove '${pathArg}': ${err.message}`, 'color-error');
      }
    }
  }
};
