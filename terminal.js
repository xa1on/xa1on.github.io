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
let loginState = 'BOOTING'; // BOOTING | LOGGED_IN
let currentUsername = 'root';
const commandHistory = [];
let historyIndex = -1;
const MAX_LINES = 150; // Keep the last 150 printed output lines to prevent DOM bloat and render lag
let activeInputResolver = null;
let pongGame = null;

// DOM Cache
const terminalBody = document.getElementById('terminal-body');
const terminalOutput = document.getElementById('terminal-output');
const inputLine = document.getElementById('input-line');
const promptPrefix = document.getElementById('prompt-prefix');
const inputDisplay = document.getElementById('input-display');
const terminalInput = document.getElementById('terminal-input');
const cursor = document.getElementById('cursor');

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
 * Focus helper - keeps keyboard focus on terminal input
 */
function focusInput() {
  terminalInput.focus();
}

/**
 * Asynchronously prompts the user for custom input inline in the shell.
 * Can be used by any command or game.
 */
function readInput(promptText) {
  return new Promise((resolve) => {
    const originalPrefixHTML = promptPrefix.innerHTML;
    
    // Temporarily show input line so user can type
    inputLine.style.visibility = 'visible';
    
    promptPrefix.textContent = promptText;
    terminalInput.value = '';
    inputDisplay.textContent = '';
    focusInput();
    
    activeInputResolver = (val) => {
      // Hide input line again
      inputLine.style.visibility = 'hidden';
      promptPrefix.innerHTML = originalPrefixHTML;
      resolve(val);
    };
  });
}

/**
 * Simple regex-based Markdown to Terminal HTML parser
 * Parses headers (# title -> bold text), **bold**, and [text](url) -> standard links
 */
function parseMarkdown(text) {
  const lines = text.split('\n');
  const processedLines = lines.map(line => {
    // 1. Headers: # Header -> <span class="color-accent">Header</span>
    const headerMatch = line.match(/^(#+)\s*(.*)$/);
    if (headerMatch) {
      return `<span class="color-accent">${headerMatch[2]}</span>`;
    }

    let processed = line;
    // 2. Bold text: **text** -> <span class="color-accent">text</span>
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<span class="color-accent">$1</span>');

    // 3. Links: [label](url) -> <a href="$2" class="color-link" target="_blank">$1</a>
    processed = processed.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="color-link" target="_blank">$1</a>');

    return processed;
  });

  return processedLines.join('\n');
}

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
 * Writes a new line of text (or HTML) to the terminal history
 */
function printOutput(htmlContent, className = 'color-text') {
  const line = document.createElement('div');
  line.className = className;
  line.innerHTML = htmlContent;
  terminalOutput.appendChild(line);

  // Keep DOM count under control to prevent long-term lag
  while (terminalOutput.children.length > MAX_LINES) {
    terminalOutput.removeChild(terminalOutput.firstChild);
  }

  // Auto-scroll to bottom of terminal
  terminalBody.scrollTop = terminalBody.scrollHeight;
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

  switch (command) {
    case 'help':
      printOutput(`Available Commands:
  <span class="color-accent">ls</span>             List contents of the current directory.
  <span class="color-accent">cd [dir]</span>       Change the current working directory.
  <span class="color-accent">cat [file]</span>     Display the contents of a text file.
  <span class="color-accent">clear</span>          Clear the terminal screen.
  <span class="color-accent">whoami</span>         Print the current session user name.
  <span class="color-accent">date</span>           Display the current system date and time.
  <span class="color-accent">ping [host]</span>    Simulate pinging a host.
  <span class="color-accent">pong [level]</span>   Play a game of Pong (easy|medium|hard).
`);
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

    case 'pong':
      {
        let diffText = args.length > 0 ? args[0].toLowerCase() : '';
        while (diffText !== 'easy' && diffText !== 'medium' && diffText !== 'hard' && diffText !== '1' && diffText !== '2' && diffText !== '3') {
          printOutput('Select difficulty:\n  [1] Easy\n  [2] Medium\n  [3] Hard');
          const response = await readInput('Choose difficulty (1-3): ');
          diffText = response.trim().toLowerCase();
          if (diffText === '') {
            printOutput('Pong cancelled.', 'color-dim');
            return;
          }
        }

        let difficulty = 'easy';
        if (diffText === '2' || diffText === 'medium') difficulty = 'medium';
        if (diffText === '3' || diffText === 'hard') difficulty = 'hard';

        loginState = 'PONG';
        
        pongGame = {
          playerY: 4,
          cpuY: 4,
          ballX: 22,
          ballY: 5,
          ballDx: Math.random() > 0.5 ? 1 : -1,
          ballDy: Math.random() > 0.5 ? 0.5 : -0.5,
          playerScore: 0,
          cpuScore: 0,
          boardWidth: 44,
          boardHeight: 12,
          paddleHeight: 3,
          difficulty: difficulty,
          gameOver: false
        };

        const gameContainer = document.createElement('pre');
        gameContainer.style.fontFamily = 'monospace';
        gameContainer.style.lineHeight = '1.15';
        gameContainer.style.color = 'var(--text-color)';
        terminalOutput.appendChild(gameContainer);

        function drawPong() {
          let board = '';
          const width = pongGame.boardWidth;
          const height = pongGame.boardHeight;
          
          board += '─'.repeat(width + 2) + '\n';
          
          for (let y = 0; y < height; y++) {
            let line = '│';
            for (let x = 0; x < width; x++) {
              const isLeftPaddle = (x === 1) && (y >= pongGame.playerY && y < pongGame.playerY + pongGame.paddleHeight);
              const isRightPaddle = (x === width - 2) && (y >= pongGame.cpuY && y < pongGame.cpuY + pongGame.paddleHeight);
              const isBall = (x === Math.round(pongGame.ballX)) && (y === Math.round(pongGame.ballY));
              
              if (isLeftPaddle || isRightPaddle) {
                line += '█';
              } else if (isBall) {
                line += '●';
              } else {
                line += ' ';
              }
            }
            line += '│\n';
            board += line;
          }
          
          board += '─'.repeat(width + 2) + '\n';
          board += ` Score: Player ${pongGame.playerScore} ║ CPU ${pongGame.cpuScore}   (Difficulty: ${pongGame.difficulty.toUpperCase()})\n`;
          board += ` Controls: [ArrowUp]/[ArrowDown] to move. Press [Q] to quit.\n`;
          
          gameContainer.textContent = board;
          terminalBody.scrollTop = terminalBody.scrollHeight;
        }

        drawPong();

        function resetBall(direction) {
          pongGame.ballX = Math.floor(pongGame.boardWidth / 2);
          pongGame.ballY = Math.floor(pongGame.boardHeight / 2);
          pongGame.ballDx = direction;
          pongGame.ballDy = Math.random() > 0.5 ? 0.5 : -0.5;
        }

        await new Promise((resolve) => {
          const gameInterval = setInterval(() => {
            if (pongGame.gameOver) {
              clearInterval(gameInterval);
              resolve();
              return;
            }

            // Move Ball
            pongGame.ballX += pongGame.ballDx;
            pongGame.ballY += pongGame.ballDy;

            // Bounce top/bottom
            if (pongGame.ballY <= 0) {
              pongGame.ballY = 0;
              pongGame.ballDy = -pongGame.ballDy;
            } else if (pongGame.ballY >= pongGame.boardHeight - 1) {
              pongGame.ballY = pongGame.boardHeight - 1;
              pongGame.ballDy = -pongGame.ballDy;
            }

            // Left paddle collision
            if (pongGame.ballX <= 2 && pongGame.ballDx < 0) {
              if (pongGame.ballY >= pongGame.playerY && pongGame.ballY < pongGame.playerY + pongGame.paddleHeight) {
                pongGame.ballX = 2;
                pongGame.ballDx = 1;
                const hitPos = pongGame.ballY - pongGame.playerY;
                if (hitPos === 0) pongGame.ballDy = -0.75;
                else if (hitPos === 2) pongGame.ballDy = 0.75;
                else pongGame.ballDy = (Math.random() > 0.5 ? 0.5 : -0.5);
              }
            }

            // Right paddle collision
            if (pongGame.ballX >= pongGame.boardWidth - 3 && pongGame.ballDx > 0) {
              if (pongGame.ballY >= pongGame.cpuY && pongGame.ballY < pongGame.cpuY + pongGame.paddleHeight) {
                pongGame.ballX = pongGame.boardWidth - 3;
                pongGame.ballDx = -1;
                const hitPos = pongGame.ballY - pongGame.cpuY;
                if (hitPos === 0) pongGame.ballDy = -0.75;
                else if (hitPos === 2) pongGame.ballDy = 0.75;
                else pongGame.ballDy = (Math.random() > 0.5 ? 0.5 : -0.5);
              }
            }

            // CPU AI movement
            const ballTarget = pongGame.ballY;
            const cpuCenter = pongGame.cpuY + 1;
            let moveProbability = 0.45;
            if (pongGame.difficulty === 'medium') moveProbability = 0.70;
            if (pongGame.difficulty === 'hard') moveProbability = 0.92;

            if (Math.random() < moveProbability) {
              if (cpuCenter < ballTarget) {
                pongGame.cpuY = Math.min(pongGame.boardHeight - pongGame.paddleHeight, pongGame.cpuY + 1);
              } else if (cpuCenter > ballTarget) {
                pongGame.cpuY = Math.max(0, pongGame.cpuY - 1);
              }
            }

            // Point scoring
            if (pongGame.ballX < 0) {
              pongGame.cpuScore++;
              if (pongGame.cpuScore >= 5) {
                pongGame.gameOver = true;
              } else {
                resetBall(1);
              }
            } else if (pongGame.ballX >= pongGame.boardWidth) {
              pongGame.playerScore++;
              if (pongGame.playerScore >= 5) {
                pongGame.gameOver = true;
              } else {
                resetBall(-1);
              }
            }

            drawPong();
          }, 80);
        });

        loginState = 'LOGGED_IN';
        if (pongGame.playerScore >= 5) {
          printOutput('Congratulations! You won the match! 🎉', 'color-green');
        } else if (pongGame.cpuScore >= 5) {
          printOutput('Game Over! The CPU won the match. 🤖', 'color-error');
        } else {
          printOutput('Pong game terminated.', 'color-dim');
        }
        pongGame = null;
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
    const availableCmds = ['help', 'ls', 'cd', 'cat', 'clear', 'whoami', 'date', 'ping', 'pong'];
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
  if (activeInputResolver) {
    if (e.key === 'Enter') {
      const val = terminalInput.value;
      terminalInput.value = '';
      inputDisplay.textContent = '';
      const resolve = activeInputResolver;
      activeInputResolver = null;
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
  focusInput();
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

// Capture Pong gameplay key inputs globally on the page
document.addEventListener('keydown', (e) => {
  if (loginState === 'PONG') {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (pongGame) pongGame.playerY = Math.max(0, pongGame.playerY - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (pongGame) pongGame.playerY = Math.min(pongGame.boardHeight - pongGame.paddleHeight, pongGame.playerY + 1);
    } else if (e.key === 'q' || e.key === 'Q') {
      e.preventDefault();
      if (pongGame) pongGame.gameOver = true;
    }
  }
});

// Initial boot initialization on load
window.addEventListener('load', () => {
  startConnection();
});
