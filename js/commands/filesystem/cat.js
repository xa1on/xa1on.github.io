export const cat = {
  name: 'cat',
  description: 'Display the contents of a text file or open an HTML page.',
  category: 'filesystem',
  args: [
    { name: 'filename', description: 'The text file to display or HTML page to open.', required: true }
  ],
  run: async (args, shell) => {
    const fileArg = args[0];
    const resolved = shell.fileSystem.resolvePath(shell.currentPath, fileArg);
    if (resolved === null) {
      shell.print(`cat: ${fileArg}: No such file or directory`, 'color-error');
      return;
    }
    const targetNode = shell.fileSystem.getNodeByPath(resolved);
    if (targetNode === null) {
      shell.print(`cat: ${fileArg}: No such file or directory`, 'color-error');
    } else if (typeof targetNode === 'object') {
      shell.print(`cat: ${fileArg}: Is a directory`, 'color-error');
    } else {
      const fileName = resolved[resolved.length - 1];
      const lowerName = fileName.toLowerCase();
      const isImage = lowerName.endsWith('.png') ||
                      lowerName.endsWith('.jpg') ||
                      lowerName.endsWith('.jpeg') ||
                      lowerName.endsWith('.gif') ||
                      lowerName.endsWith('.webp') ||
                      lowerName.endsWith('.svg') ||
                      lowerName.endsWith('.ico');

      if (isImage) {
        const hash = shell.fileSystem.isBuiltInPath(resolved) ? shell.fileSystem.getNodeByPath(resolved) : '';
        const filePath = resolved.join('/') + (typeof hash === 'string' && hash && hash !== 'core' ? '?v=' + hash : '');
        shell.print(`<img src="${filePath}" class="terminal-image" alt="${shell.escapeHTML(fileName)}">`);
        return;
      }

      try {
        const content = await shell.fileSystem.readFile(resolved);
        const output = fileName.endsWith('.md') ? shell.parseMarkdown(content, resolved.slice(0, -1)) : shell.escapeHTML(content);
        shell.print(output);
      } catch (err) {
        shell.print(`cat: error reading ${fileArg}: ${err.message}`, 'color-error');
      }
    }
  }
};
