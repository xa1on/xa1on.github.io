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
let loginState = 'BOOTING'; // BOOTING | LOGGED_IN | CONNECTING
let currentUsername = 'root';

// DOM Cache
const terminalBody = document.getElementById('terminal-body');
const terminalOutput = document.getElementById('terminal-output');
const inputLine = document.getElementById('input-line');
const promptPrefix = document.getElementById('prompt-prefix');
const inputDisplay = document.getElementById('input-display');
const terminalInput = document.getElementById('terminal-input');

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
                    @@@@@@          | arch4ic
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
  // Auto-scroll to bottom of terminal
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

/**
 * Resets the prompt prefix label depending on current login state & directory
 */
function updatePrompt() {
  if (loginState === 'LOGGED_IN') {
    const displayPath = currentPath.length === 0 ? '~' : '/' + currentPath.join('/');
    promptPrefix.innerHTML = `<span class="color-accent">${currentUsername}@chenghao.li</span>:<span class="color-dir">${displayPath}</span>#`;
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

  printOutput(`Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.8.0-31-generic x86_64)

 * Documentation:  <a href="https://help.ubuntu.com" class="color-link" target="_blank">https://help.ubuntu.com</a>
 * Management:     <a href="https://landscape.canonical.com" class="color-link" target="_blank">https://landscape.canonical.com</a>
 * Support:        <a href="https://ubuntu.com/pro" class="color-link" target="_blank">https://ubuntu.com/pro</a>

System information at ${currentTimestamp}:

  System load:  0.15               Processes:             108
  Usage of /:   38.4% of 50GB      Users logged in:       1
  Memory usage: 12%                IPv4 address for eth0: 192.168.1.104

Last login: ${new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString()} from 127.0.0.1
`, 'color-dim');

  printOutput(asciiArt, 'color-accent');
  printOutput(`Chenghao Li (xa1on) - Virtual Server Instance v1.2.4

Type <span class="color-accent">help</span> to view available terminal commands.
`);
}

/**
 * Triggers SSH connection boot messages
 */
function startConnection() {
  loginState = 'BOOTING';
  terminalInput.disabled = true;
  promptPrefix.textContent = 'C:\\Users\\cli>';
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
        printOutput('C:\\Users\\cli&gt; ssh root@chenghao.li');
        inputDisplay.textContent = '';
        
        printMOTD();
        
        // Temporarily show prompt prefix for typing animation
        promptPrefix.innerHTML = `<span class="color-accent">root@chenghao.li</span>:<span class="color-dir">~</span>#`;
        
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
                await executeCommand('ls');
                updatePrompt();
                focusInput();
              }, 400);
            }
          }, 100);
        }, 600);
      }, 400); // short pause
    }
  }, 30); // Fast typing simulation
}

/**
 * Command Handler - executes commands when logged in
 */
async function executeCommand(cmdStr) {
  const trimmed = cmdStr.trim();
  if (trimmed === '') return;

  // Print command to output history
  const displayPath = currentPath.length === 0 ? '~' : '/' + currentPath.join('/');
  printOutput(`<span class="color-accent">${currentUsername}@chenghao.li</span>:<span class="color-dir">${displayPath}</span># ${trimmed}`);

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
`);
      break;

    case 'ls':
      const currentDir = getNodeByPath(currentPath);
      if (currentDir && typeof currentDir === 'object') {
        const items = Object.keys(currentDir);
        const formattedItems = items.map(name => {
          const isDir = typeof currentDir[name] === 'object';
          return isDir 
            ? `<span class="color-dir ls-item" data-type="dir" data-name="${name}">${name}/</span>` 
            : `<span class="color-file ls-item" data-type="file" data-name="${name}">${name}</span>`;
        });
        
        // Add parent directory link if not in root
        if (currentPath.length > 0) {
          formattedItems.unshift(`<span class="color-dir ls-item" data-type="dir" data-name="..">../</span>`);
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
 * Handle form submissions / pressing enter
 */
async function handleInputSubmit(val) {
  if (loginState === 'LOGGED_IN') {
    inputLine.style.visibility = 'hidden';
    await executeCommand(val);
    inputLine.style.visibility = 'visible';
    updatePrompt();
    focusInput();
  } else if (loginState === 'CONNECTING') {
    startConnection();
  }
}

// Event Listeners

// Capture key entries in the hidden input and mirror to screen
terminalInput.addEventListener('input', (e) => {
  inputDisplay.textContent = e.target.value;
});

// Capture Enter press for submit
terminalInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const val = terminalInput.value;
    terminalInput.value = '';
    inputDisplay.textContent = '';
    await handleInputSubmit(val);
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
    const name = target.getAttribute('data-name');
    
    if (type === 'dir') {
      // Execute cd [dir] followed by ls
      await handleInputSubmit(`cd ${name}`);
      await handleInputSubmit('ls');
    } else if (type === 'file') {
      // Execute cat [file]
      await handleInputSubmit(`cat ${name}`);
    }
  }
});

// Initial boot initialization on load
window.addEventListener('load', () => {
  startConnection();
});
