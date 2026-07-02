// Virtual File System (Structured Resume & Projects)
const virtualFS = {
  "about.md": "file",
  "contact.md": "file",
  "archive": {
    // ???
  },
  "projects.md": "file"
};

// State Variables
let currentPath = []; // Array of directory names representing current folder path
let currentUsername = 'root';
const commandHistory = [];
let historyIndex = -1;

// Expose state logic on the window.Terminal namespace
window.Terminal.currentPath = currentPath;
window.Terminal.currentUsername = currentUsername;

Object.defineProperty(window, 'loginState', {
  get() { return window.Terminal.loginState; },
  set(val) { window.Terminal.loginState = val; }
});

// DOM Cache aliases linked to modular Terminal
const terminalBody = window.Terminal.body;
const terminalOutput = window.Terminal.output;
const inputLine = window.Terminal.inputLine;
const promptPrefix = window.Terminal.promptPrefix;
const inputDisplay = window.Terminal.inputDisplay;
const terminalInput = window.Terminal.input;
const cursor = window.Terminal.cursor;

// Compatibility wrappers for modular functions
const printOutput = (html, cls) => window.Terminal.print(html, cls);
const focusInput = () => window.Terminal.focus();
const parseMarkdown = (txt) => window.Terminal.parseMarkdown(txt);
const readInput = (prompt) => window.Terminal.readInput(prompt);

// ASCII Art Banner
const asciiArt = `
                                   
                 @                 
                @@@                
               @@@@@               
              @@@@@@@              
             @@@@@@@@@             
            @@@@@@@@@@@            
           @@@@@@ @@@@@@           
                   @@@@@@          
                    @@@@@@          | <span class="blue">arch</span>4ic
                     @@@@@@        
       <span class="red">#########</span>      @@@@@@       
      <span class="red">############</span>     @@@@@@      
     <span class="red">######</span>             @@@@@@     
    <span class="red">######</span>               @@@@@@    
   <span class="red">######</span>                 @@@@@@   
  <span class="red">######</span>                   @@@@@@  
 <span class="red">######</span>                     @@@@@@ 
                                   
`;


/**
 * Resolves path array to corresponding nested object or file contents in virtualFS
 */
function getNodeByPath(pathArr) {
  let node = virtualFS;
  for (const part of pathArr) {
    if (node && typeof node === 'object' && node[part] !== undefined) {
      node = node[part];
    } else {
      return null;
    }
  }
  return node;
}



/**
 * Resets the prompt prefix label depending on current login state & directory
 */
function updatePrompt() {
  if (loginState === 'LOGGED_IN') {
    const displayPath = currentPath.length === 0 ? '~' : '/' + currentPath.join('/');
    promptPrefix.innerHTML = `<span class="color-accent"><span class="red">${currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${displayPath}</span>#`;
    inputDisplay.textContent = '';
    terminalInput.value = '';
  } else if (loginState === 'CONNECTING') {
    promptPrefix.textContent = 'Press [Enter] to reconnect...';
    inputDisplay.textContent = '';
    terminalInput.value = '';
  } else if (loginState === 'BOOTING') {
    // Managed by typing animation
    inputDisplay.textContent = '';
    terminalInput.value = '';
  }
}

/**
 * System load details emulating Ubuntu login screen message of the day (MOTD)
 */
function printMOTD() {
  const now = new Date();
  const currentTimestamp = now.toString();

  printOutput(`Arch Linux 6.9.3-arch1-1 (tty1)`, 'color-dim');
  printOutput(`\n  >>> <span class="blue">Welcome, root@chenghao.li!</span> <<<`, 'color-accent');
  printOutput(asciiArt, 'color-accent');
  printOutput(`
System information at ${currentTimestamp}:
  System load:  0.15               Processes:             108
  Usage of /:   38.4% of 50GB      Users logged in:       2
  Memory usage: 12%                IPv4 address for eth0: 192.168.1.104
`, 'color-dim');
  printOutput(`
Type <span class="color-accent">help</span> to view available terminal commands.
`);
}

/**
 * Triggers SSH connection boot messages
 */
function startConnection() {
  loginState = 'BOOTING';
  terminalInput.disabled = true;
  promptPrefix.innerHTML = '<span class="color-accent">C:\\Users\\cli&gt;</span>';
  inputDisplay.textContent = '';

  const cmdText = 'ssh root@chenghao.li';
  let charIndex = 0;

  const typeEffect = setInterval(() => {
    inputDisplay.textContent += cmdText[charIndex];
    charIndex++;
    if (charIndex >= cmdText.length) {
      clearInterval(typeEffect);

      setTimeout(() => {
        // Append simulated typed command to output
        printOutput('<span class="color-accent">C:\\Users\\cli&gt;</span> ssh root@chenghao.li');
        inputDisplay.textContent = '';

        printMOTD();

        // Temporarily show prompt prefix for typing animation
        promptPrefix.innerHTML = `<span class="color-accent"><span class="red">root</span>@chenghao.li</span>:<span class="color-dir">~</span>#`;

        setTimeout(() => {
          const lsText = 'ls';
          let lsIndex = 0;

          const lsTypeEffect = setInterval(() => {
            inputDisplay.textContent += lsText[lsIndex];
            lsIndex++;

            if (lsIndex >= lsText.length) {
              clearInterval(lsTypeEffect);

              setTimeout(async () => {
                inputDisplay.textContent = '';
                // Execute ls command
                loginState = 'LOGGED_IN';
                terminalInput.disabled = false;
                await handleInputSubmit('ls');
              }, 400);
            }
          }, 50);
        }, 600);
      }, 400); // short pause
    }
  }, 50); // Fast typing simulation
}

/**
 * Command Handler - executes commands when logged in
 */
async function executeCommand(cmdStr) {
  const trimmed = cmdStr.trim();
  if (trimmed === '') return;

  // Print command to output history
  const displayPath = currentPath.length === 0 ? '~' : '/' + currentPath.join('/');
  printOutput(`<span class="color-accent"><span class="red">${currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${displayPath}</span># ${trimmed}`);

  // Split arguments
  const parts = trimmed.split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Check modular game/command registry first
  if (window.Terminal.games[command]) {
    await window.Terminal.games[command].run(args);
    return;
  }

  switch (command) {
    case 'help':
      {
        let helpText = `Available Commands:
  <span class="color-accent">ls</span>             List contents of the current directory.
  <span class="color-accent">cd [dir]</span>       Change the current working directory.
  <span class="color-accent">cat [file]</span>     Display the contents of a text file.
  <span class="color-accent">clear</span>          Clear the terminal screen.
  <span class="color-accent">whoami</span>         Print the current session user name.
  <span class="color-accent">date</span>           Display the current system date and time.
  <span class="color-accent">ping [host]</span>    Simulate pinging a host.`;

        for (const [name, game] of Object.entries(window.Terminal.games)) {
          helpText += `\n  <span class="color-accent">${name.padEnd(14)}</span> ${game.helpText}`;
        }

        printOutput(helpText);
      }
      break;

    case 'ls':
      const currentDir = getNodeByPath(currentPath);
      if (currentDir && typeof currentDir === 'object') {
        const items = Object.keys(currentDir);
        const currentPathStr = currentPath.join('/');
        const formattedItems = items.map(name => {
          const isDir = typeof currentDir[name] === 'object';
          const absolutePath = '/' + (currentPathStr ? currentPathStr + '/' : '') + name;
          return isDir
            ? `<span class="color-dir ls-item" data-type="dir" data-path="${absolutePath}">${name}/</span>`
            : `<span class="color-file ls-item" data-type="file" data-path="${absolutePath}">${name}</span>`;
        });

        // Add parent directory link if not in root
        if (currentPath.length > 0) {
          const parentPath = '/' + currentPath.slice(0, -1).join('/');
          formattedItems.unshift(`<span class="color-dir ls-item" data-type="dir" data-path="${parentPath}">../</span>`);
        }

        if (formattedItems.length === 0) {
          printOutput('');
        } else {
          printOutput(formattedItems.join('   '));
        }
      } else {
        printOutput('ls: cannot open directory: file system error.', 'color-error');
      }
      break;

    case 'cd':
      if (args.length === 0 || args[0] === '~') {
        currentPath = [];
      } else {
        const pathArg = args[0];
        const resolved = resolvePath(pathArg);
        if (resolved === null) {
          printOutput(`cd: no such file or directory: ${pathArg}`, 'color-error');
        } else {
          const targetNode = getNodeByPath(resolved);
          if (typeof targetNode !== 'object') {
            printOutput(`cd: not a directory: ${pathArg}`, 'color-error');
          } else {
            currentPath = resolved;
          }
        }
      }
      break;

    case 'cat':
      if (args.length === 0) {
        printOutput('cat: missing file operand. Usage: cat [filename]', 'color-error');
      } else {
        const fileArg = args[0];
        const resolved = resolvePath(fileArg);
        if (resolved === null) {
          printOutput(`cat: ${fileArg}: No such file or directory`, 'color-error');
        } else {
          const targetNode = getNodeByPath(resolved);
          if (targetNode === null) {
            printOutput(`cat: ${fileArg}: No such file or directory`, 'color-error');
          } else if (typeof targetNode === 'object') {
            printOutput(`cat: ${fileArg}: Is a directory`, 'color-error');
          } else {
            // It is a file! Let's fetch it from server_root/
            const filePath = 'server_root/' + resolved.join('/');
            try {
              const response = await fetch(filePath);
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              const rawText = await response.text();
              const parsedHtml = parseMarkdown(rawText);
              printOutput(parsedHtml);
            } catch (err) {
              printOutput(`cat: error reading ${fileArg}: Permission denied or file corrupt`, 'color-error');
            }
          }
        }
      }
      break;

    case 'clear':
      terminalOutput.innerHTML = '';
      break;

    case 'whoami':
      printOutput(currentUsername);
      break;

    case 'date':
      printOutput(new Date().toString());
      break;

    case 'ping':
      {
        const host = args.length > 0 ? args[0] : 'chenghao.li';
        // Generate a random mock IPv4 address
        const ip = `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;

        printOutput(`PING ${host} (${ip}) 56(84) bytes of data.`);

        const times = [];
        for (let i = 1; i <= 4; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const time = (Math.random() * 30 + 5).toFixed(3);
          times.push(parseFloat(time));
          printOutput(`64 bytes from ${ip}: icmp_seq=${i} ttl=64 time=${time} ms`);
        }

        await new Promise(resolve => setTimeout(resolve, 200));

        const totalTime = times.reduce((a, b) => a + b, 0);
        const min = Math.min(...times).toFixed(3);
        const avg = (totalTime / times.length).toFixed(3);
        const max = Math.max(...times).toFixed(3);
        const mdev = Math.sqrt(times.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / times.length).toFixed(3);

        printOutput(`\n--- ${host} ping statistics ---`);
        printOutput(`4 packets transmitted, 4 received, 0% packet loss, time ${Math.floor(totalTime + 1200)}ms`);
        printOutput(`rtt min/avg/max/mdev = ${min}/${avg}/${max}/${mdev} ms`);
      }
      break;

    default:
      printOutput(`command not found: ${command}. Type 'help' to see list of commands.`, 'color-error');
  }
}

/**
 * Helper to resolve absolute or relative path strings based on current directory
 */
function resolvePath(pathStr) {
  let target = [...currentPath];

  if (pathStr.startsWith('/')) {
    target = [];
    pathStr = pathStr.slice(1);
  }

  const segments = pathStr.split('/').filter(s => s.length > 0 && s !== '.');

  for (const seg of segments) {
    if (seg === '..') {
      if (target.length > 0) {
        target.pop();
      }
    } else {
      target.push(seg);
    }
  }

  // Verify path actually exists in VFS
  if (getNodeByPath(target) === null) {
    return null;
  }
  return target;
}

/**
 * Computes the relative path from fromPath array to toPath array.
 */
function getRelativePath(fromPath, toPath) {
  let commonCount = 0;
  while (commonCount < fromPath.length && commonCount < toPath.length && fromPath[commonCount] === toPath[commonCount]) {
    commonCount++;
  }

  const upSegments = fromPath.length - commonCount;
  const downSegments = toPath.slice(commonCount);

  const segments = [];
  for (let i = 0; i < upSegments; i++) {
    segments.push('..');
  }
  segments.push(...downSegments);

  if (segments.length === 0) {
    return '.';
  }
  return segments.join('/');
}

/**
 * Tab Autocomplete logic
 * Autocompletes matching commands and files/directories in currentPath, case-insensitively
 */
function handleTabAutocomplete() {
  const currentVal = terminalInput.value;
  const trimmed = currentVal.trimStart();
  if (trimmed === '') return;

  // Split by space. We want to autocomplete the last token.
  // Note: if there's no space in the trimmed string, we are autocompleting the command itself.
  const parts = currentVal.split(/\s+/);
  const isCommandOnly = parts.length === 1;

  if (isCommandOnly) {
    // Autocomplete commands
    const typedCmd = parts[0].toLowerCase();
    const availableCmds = ['help', 'ls', 'cd', 'cat', 'clear', 'whoami', 'date', 'ping', ...Object.keys(window.Terminal.games)];
    const matches = availableCmds.filter(cmd => cmd.startsWith(typedCmd));

    if (matches.length === 1) {
      // Single match: complete it with a space at the end
      terminalInput.value = matches[0] + ' ';
      inputDisplay.textContent = terminalInput.value;
    } else if (matches.length > 1) {
      // Multiple matches: list them horizontally, reprint prompt line
      printOutput(matches.join('    '), 'color-accent');
      // Reprint prompt log
      const displayPath = currentPath.length === 0 ? '~' : '/' + currentPath.join('/');
      printOutput(`<span class="color-accent"><span class="red">${currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${displayPath}</span># ${currentVal}`);
    }
  } else {
    // Autocomplete file/path arguments (for commands like cd and cat)
    const activeCommand = parts[0].toLowerCase();
    // The argument is everything after the command
    const argVal = parts.slice(1).join(' ');

    // We split the path string by '/' to handle nested folders
    const slashIdx = argVal.lastIndexOf('/');
    let targetPath = [...currentPath];
    let prefix = argVal;

    if (slashIdx !== -1) {
      const pathPrefix = argVal.slice(0, slashIdx);
      prefix = argVal.slice(slashIdx + 1);

      const resolvedPrefixPath = resolvePath(pathPrefix);
      if (resolvedPrefixPath === null) {
        return; // Invalid path prefix, can't autocomplete
      }
      targetPath = resolvedPrefixPath;
    }

    const targetDir = getNodeByPath(targetPath);
    if (!targetDir || typeof targetDir !== 'object') return;

    const dirKeys = Object.keys(targetDir);
    // Support parent directory traversal symbol if not in root
    if (targetPath.length > 0) {
      dirKeys.push('..');
    }

    // Filter matches case-insensitively
    const prefixLower = prefix.toLowerCase();
    const matches = dirKeys.filter(key => key.toLowerCase().startsWith(prefixLower));

    if (matches.length === 1) {
      // Single match: complete it
      const matchedName = matches[0];
      const isDirNode = matchedName === '..' || typeof targetDir[matchedName] === 'object';
      const completedArg = (slashIdx !== -1 ? argVal.slice(0, slashIdx + 1) : '') + matchedName + (isDirNode ? '/' : ' ');

      terminalInput.value = parts[0] + ' ' + completedArg;
      inputDisplay.textContent = terminalInput.value;
    } else if (matches.length > 1) {
      // Multiple matches: list them horizontally, print prompt
      const formattedMatches = matches.map(matchedName => {
        const isDirNode = matchedName === '..' || typeof targetDir[matchedName] === 'object';
        return isDirNode ? `<span class="color-dir">${matchedName}/</span>` : `<span class="color-file">${matchedName}</span>`;
      });
      printOutput(formattedMatches.join('    '));

      const displayPath = currentPath.length === 0 ? '~' : '/' + currentPath.join('/');
      printOutput(`<span class="color-accent"><span class="red">${currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${displayPath}</span># ${currentVal}`);
    }
  }
}

/**
 * Handle form submissions / pressing enter
 */
async function handleInputSubmit(val) {
  if (loginState !== 'LOGGED_IN') return;

  const trimmed = val.trim();
  if (trimmed !== '') {
    // Add to history if empty or different from the last entry
    if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== trimmed) {
      commandHistory.push(trimmed);
    }
    historyIndex = commandHistory.length;
  }

  inputLine.style.visibility = 'hidden';
  await executeCommand(val);
  inputLine.style.visibility = 'visible';
  updatePrompt();
  focusInput();
}

// Event Listeners

terminalInput.addEventListener('input', (e) => {
  inputDisplay.textContent = e.target.value;
  // Reset blink animation so cursor stays solid/visible while typing
  if (cursor) {
    cursor.style.animation = 'none';
    void cursor.offsetHeight; // force reflow to restart animation
    cursor.style.animation = '';
  }
});

// Capture special key entries for History and Autocomplete
terminalInput.addEventListener('keydown', async (e) => {
  if (loginState === 'GAME') {
    return; // Ignore standard hotkeys during active gameplay state
  }

  if (window.Terminal.activeInputResolver) {
    if (e.key === 'Enter') {
      const val = terminalInput.value;
      terminalInput.value = '';
      inputDisplay.textContent = '';
      const resolve = window.Terminal.activeInputResolver;
      window.Terminal.activeInputResolver = null;
      resolve(val);
    }
    return; // Block other hotkeys (Arrows/Tab) during custom input prompts
  }

  if (e.key === 'Enter') {
    const val = terminalInput.value;
    terminalInput.value = '';
    inputDisplay.textContent = '';
    await handleInputSubmit(val);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (loginState !== 'LOGGED_IN') return;
    if (commandHistory.length > 0 && historyIndex > 0) {
      historyIndex--;
      terminalInput.value = commandHistory[historyIndex];
      inputDisplay.textContent = commandHistory[historyIndex];
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (loginState !== 'LOGGED_IN') return;
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      terminalInput.value = commandHistory[historyIndex];
      inputDisplay.textContent = commandHistory[historyIndex];
    } else if (historyIndex === commandHistory.length - 1) {
      historyIndex = commandHistory.length;
      terminalInput.value = '';
      inputDisplay.textContent = '';
    }
  } else if (e.key === 'Tab') {
    e.preventDefault();
    if (loginState !== 'LOGGED_IN') return;
    handleTabAutocomplete();
  }
});

// Focus input on click anywhere inside the terminal window
document.addEventListener('click', (e) => {
  if (loginState !== 'GAME') {
    focusInput();
  }
});

// Intercept clicks on interactive ls items
document.addEventListener('click', async (e) => {
  const target = e.target;
  if (target && target.classList.contains('ls-item')) {
    e.stopPropagation();

    // Only allow interaction if logged in
    if (loginState !== 'LOGGED_IN') return;

    const type = target.getAttribute('data-type');
    const path = target.getAttribute('data-path');

    if (path) {
      // Resolve path into segment array
      const targetPathArr = path.split('/').filter(s => s.length > 0);
      const relativePath = getRelativePath(currentPath, targetPathArr);

      if (type === 'dir') {
        // Execute cd [relative_path] followed by ls
        await handleInputSubmit(`cd ${relativePath}`);
        await handleInputSubmit('ls');
      } else if (type === 'file') {
        // Execute cat [relative_path]
        await handleInputSubmit(`cat ${relativePath}`);
      }
    }
  }
});


// Initial boot initialization on load
window.addEventListener('load', () => {
  startConnection();
});
