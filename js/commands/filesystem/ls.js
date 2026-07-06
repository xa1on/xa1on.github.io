export const ls = {
  name: 'ls',
  description: 'List contents of a directory.',
  category: 'filesystem',
  args: [
    { name: 'path', description: 'Optional path to list contents of.', required: false }
  ],
  run: async (args, shell) => {
    let targetPath = shell.currentPath;
    if (args.length > 0) {
      const pathArg = args[0];
      const resolved = shell.fileSystem.resolvePath(shell.currentPath, pathArg);
      if (resolved === null) {
        shell.print(`ls: no such file or directory: ${pathArg}`, 'color-error');
        return;
      }
      targetPath = resolved;
    }

    const targetNode = shell.fileSystem.getNodeByPath(targetPath);
    if (targetNode === null) {
      shell.print('ls: file system error.', 'color-error');
    } else if (typeof targetNode !== 'object') {
      const absolutePath = '/' + targetPath.join('/');
      const fileName = targetPath[targetPath.length - 1];
      shell.print(`<span class="color-file ls-item" data-type="file" data-path="${absolutePath}">${fileName}</span>`);
    } else {
      const items = Object.keys(targetNode);
      const targetPathStr = targetPath.join('/');
      const formattedItems = items.map(name => {
        const isDir = typeof targetNode[name] === 'object';
        const absolutePath = '/' + (targetPathStr ? targetPathStr + '/' : '') + name;
        return isDir
          ? `<span class="color-dir ls-item" data-type="dir" data-path="${absolutePath}">${name}/</span>`
          : `<span class="color-file ls-item" data-type="file" data-path="${absolutePath}">${name}</span>`;
      });

      if (targetPath.length > 0) {
        const parentPath = '/' + targetPath.slice(0, -1).join('/');
        formattedItems.unshift(`<span class="color-dir ls-item" data-type="dir" data-path="${parentPath}">../</span>`);
      }

      if (formattedItems.length === 0) {
        shell.print('');
      } else {
        shell.print(formattedItems.join('   '));
      }
    }
  }
};
