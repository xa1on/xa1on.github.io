export const cat = {
  helpText: 'Display the contents of a text file or open an HTML page.',
  run: async (args, shell) => {
    if (args.length === 0) {
      shell.print('cat: missing file operand. Usage: cat [filename]', 'color-error');
      return;
    }
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
        const filePath = 'server_root/' + resolved.join('/');
        shell.print(`Opening ${fileName} in a new tab...`);
        const newTab = window.open(filePath, '_blank');
        if (!newTab) {
          shell.print(`Popup blocked. Please click to open: <a href="${filePath}" target="_blank" class="color-link">[Open ${fileName}]</a>`, 'color-error');
        } else {
          shell.print(`<a href="${filePath}" target="_blank" class="color-link">[Fallback link: Click here if the page did not open]</a>`);
        }
        return;
      }

      const filePath = 'server_root/' + resolved.join('/');
      try {
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rawText = await response.text();
        const parsedHtml = shell.parseMarkdown(rawText);
        shell.print(parsedHtml);
      } catch (err) {
        shell.print(`cat: error reading ${fileArg}: Permission denied or file corrupt`, 'color-error');
      }
    }
  }
};
