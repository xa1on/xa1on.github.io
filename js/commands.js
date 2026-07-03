export const commands = {
  help: {
    helpText: 'List available commands.',
    run: async (args, shell) => {
      let helpText = `Available Commands:`;
      for (const [name, cmd] of Object.entries(shell.commands)) {
        helpText += `\n  <span class="color-accent">${name.padEnd(14)}</span> ${cmd.helpText}`;
      }
      for (const [name, game] of Object.entries(shell.games)) {
        helpText += `\n  <span class="color-accent">${name.padEnd(14)}</span> ${game.helpText}`;
      }
      shell.print(helpText);
    }
  },
  ls: {
    helpText: 'List contents of the current directory.',
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
        // Target is a file, just print the filename as an ls item
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
  },
  cd: {
    helpText: 'Change the current working directory.',
    run: async (args, shell) => {
      if (args.length === 0 || args[0] === '~') {
        shell.currentPath = [];
      } else {
        const pathArg = args[0];
        const resolved = shell.fileSystem.resolvePath(shell.currentPath, pathArg);
        if (resolved === null) {
          shell.print(`cd: no such file or directory: ${pathArg}`, 'color-error');
        } else {
          const targetNode = shell.fileSystem.getNodeByPath(resolved);
          if (typeof targetNode !== 'object') {
            shell.print(`cd: not a directory: ${pathArg}`, 'color-error');
          } else {
            shell.currentPath = resolved;
          }
        }
      }
    }
  },
  cat: {
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
  },
  clear: {
    helpText: 'Clear the terminal screen.',
    run: async (args, shell) => {
      shell.clear();
    }
  },
  whoami: {
    helpText: 'Print the current session user name.',
    run: async (args, shell) => {
      shell.print(shell.currentUsername);
    }
  },
  date: {
    helpText: 'Display the current system date and time.',
    run: async (args, shell) => {
      shell.print(new Date().toString());
    }
  },
  ping: {
    helpText: 'Simulate pinging a host.',
    run: async (args, shell) => {
      const host = args.length > 0 ? args[0] : 'chenghao.li';
      const ip = `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;

      shell.print(`PING ${host} (${ip}) 56(84) bytes of data.`);

      const times = [];
      for (let i = 1; i <= 4; i++) {
        if (shell.abortSignal) {
          shell.print('ping: interrupted by user', 'color-dim');
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (shell.abortSignal) {
          shell.print('ping: interrupted by user', 'color-dim');
          return;
        }
        const time = (Math.random() * 30 + 5).toFixed(3);
        times.push(parseFloat(time));
        shell.print(`64 bytes from ${ip}: icmp_seq=${i} ttl=64 time=${time} ms`);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
      if (shell.abortSignal) return;

      const totalTime = times.reduce((a, b) => a + b, 0);
      const min = Math.min(...times).toFixed(3);
      const avg = (totalTime / times.length).toFixed(3);
      const max = Math.max(...times).toFixed(3);
      const mdev = Math.sqrt(times.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / times.length).toFixed(3);

      shell.print(`\n--- ${host} ping statistics ---`);
      shell.print(`4 packets transmitted, 4 received, 0% packet loss, time ${Math.floor(totalTime + 1200)}ms`);
      shell.print(`rtt min/avg/max/mdev = ${min}/${avg}/${max}/${mdev} ms`);
    }
  },
  llm: {
    helpText: 'Interact with a local in-browser LLM via WebGPU.',
    run: async (args, shell) => {
      try {
        const { llm } = await import('./llm.js');
        await llm.run(args, shell);
      } catch (err) {
        shell.print(`Error starting LLM module: ${err.message}`, 'color-error');
        console.error(err);
      }
    }
  }
};
