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
      if (fileName.endsWith('.html')) {
        const filePath = resolved.join('/');
        shell.print(`Opening ${fileName} in a new tab...`);
        const newTab = window.open(filePath, '_blank');
        if (!newTab) {
          shell.print(`Popup blocked. Please click to open: <a href="${filePath}" target="_blank" class="color-link">[Open ${fileName}]</a>`, 'color-error');
        } else {
          shell.print(`<a href="${filePath}" target="_blank" class="color-link">[Fallback link: Click here if the page did not open]</a>`);
        }
        return;
      }

      try {
        const content = await shell.fileSystem.readFile(resolved);
        const output = fileName.endsWith('.md') ? shell.parseMarkdown(content) : shell.escapeHTML(content);
        shell.print(output);
      } catch (err) {
        shell.print(`cat: error reading ${fileArg}: ${err.message}`, 'color-error');
      }
    }
  }
};
