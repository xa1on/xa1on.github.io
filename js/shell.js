import { resolvePath, getNodeByPath } from './fs.js';
import { audio } from './audio.js';
import { parseMarkdown, escapeHTML } from './utils/markdown.js';
import { buddies } from './buddies.js';

export class Shell {
  constructor(options = {}) {
    this.body = document.getElementById('terminal-body');
    this.output = document.getElementById('terminal-output');
    this.glowBackdrop = document.getElementById('terminal-glow-backdrop');
    this.inputLine = document.getElementById('input-line');
    this.promptPrefix = document.getElementById('prompt-prefix');
    this.inputDisplay = document.getElementById('input-display');
    this.input = document.getElementById('terminal-input');
    this.cursor = document.getElementById('cursor');

    this.loginState = 'BOOTING';
    this.currentUsername = 'root';
    this.currentPath = [];
    this.commandHistory = [];
    this.historyIndex = -1;
    this.activeInputResolver = null;
    this.activeInputAbortResolver = null;
    this.abortSignal = false;
    this.isExecutingCommand = false;

    this.fileSystem = options.fileSystem || null;
    this.commands = options.commands || {};
    this.placeholder = document.getElementById('input-placeholder');
  }

  mount() {
    // Expose compatibility namespace for scripts if needed, but decoupled internally


    // Sync glow backdrop throttled to prevent composition lag
    if (this.glowBackdrop && this.output) {
      let throttleTimeout = null;
      const observer = new MutationObserver(() => {
        if (!throttleTimeout) {
          throttleTimeout = setTimeout(() => {
            if (this.glowBackdrop && this.output) {
              this.glowBackdrop.innerHTML = this.output.innerHTML;
            }
            throttleTimeout = null;
          }, 80);
        }
      });
      observer.observe(this.output, {
        childList: true,
        subtree: true,
        characterData: true
      });
      this.glowBackdrop.innerHTML = this.output.innerHTML;
    }

    // Input visual mirroring
    this.input.addEventListener('input', (e) => {
      this.updateInputDisplay(e.target.value);
    });

    // Special keyboard listeners (Enter, Up, Down, Tab)
    this.input.addEventListener('keydown', async (e) => {
      if (this.loginState === 'GAME' || this.loginState === 'BOOTING') {
        return;
      }

      const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape'];
      if (!ignoredKeys.includes(e.key)) {
        audio.playKeyclick(e.key);
      }

      if (this.activeInputResolver) {
        if (e.key === 'Enter') {
          const val = this.input.value;
          this.input.value = '';
          this.inputDisplay.textContent = '';
          const resolve = this.activeInputResolver;
          this.activeInputResolver = null;
          this.activeInputAbortResolver = null;
          resolve(val);
        } else if (e.key === 'Tab') {
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'Enter') {
        const val = this.input.value;
        this.input.value = '';
        this.inputDisplay.textContent = '';
        await this.handleInputSubmit(val);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.loginState !== 'LOGGED_IN') return;
        if (this.commandHistory.length > 0 && this.historyIndex > 0) {
          this.historyIndex--;
          this.input.value = this.commandHistory[this.historyIndex];
          this.updateInputDisplay(this.commandHistory[this.historyIndex]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.loginState !== 'LOGGED_IN') return;
        if (this.historyIndex < this.commandHistory.length - 1) {
          this.historyIndex++;
          this.input.value = this.commandHistory[this.historyIndex];
          this.updateInputDisplay(this.commandHistory[this.historyIndex]);
        } else if (this.historyIndex === this.commandHistory.length - 1) {
          this.historyIndex = this.commandHistory.length;
          this.input.value = '';
          this.inputDisplay.textContent = '';
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (this.loginState !== 'LOGGED_IN') return;
        this.handleTabAutocomplete();
      }
    });

    // Capture Ctrl+C interrupts (only if no text is selected)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        if (window.getSelection().toString() === '') {
          e.preventDefault();
          this.abortSignal = true;

          // If we're inside a readInput() call, abort it cleanly
          if (this.activeInputAbortResolver) {
            const abort = this.activeInputAbortResolver;
            this.activeInputAbortResolver = null;
            this.activeInputResolver = null;
            abort();
            return;
          }

          // Normal shell Ctrl+C behavior (only when NOT in a readInput sub-prompt)
          if (this.loginState === 'LOGGED_IN' && !this.input.disabled) {
            const currentVal = this.input.value;
            this.print(`<span class="color-accent"><span class="red">${this.currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${this.currentPath.length === 0 ? '~' : '/' + this.currentPath.join('/')}</span># ${currentVal}^C`);
            this.input.value = '';
            this.inputDisplay.textContent = '';
            this.updatePrompt();
            this.focus();
          }
        }
      }
    });

    // Global click delegation handler
    document.addEventListener('click', async (e) => {
      const target = e.target;
      if (!target) return;

      const isInteractive = target.tagName === 'A' ||
        target.classList.contains('ls-item') ||
        target.classList.contains('cmd-link') ||
        target.tagName === 'BUTTON';

      if (isInteractive) {
        audio.playLinkClick();
      }

      // Handle focus redirection
      if (this.loginState !== 'GAME') {
        const selectedText = window.getSelection().toString();
        if (!selectedText) {
          this.focus();
        }
      }

      // Handle interactive item clicks (ls-item and cmd-link)
      if (this.loginState === 'LOGGED_IN' && !this.isExecutingCommand) {
        if (target.classList.contains('ls-item')) {
          e.stopPropagation();
          const type = target.getAttribute('data-type');
          const path = target.getAttribute('data-path');

          if (path) {
            const targetPathArr = path.split('/').filter(s => s.length > 0);
            const relativePath = this.fileSystem.getRelativePath(this.currentPath, targetPathArr);

            if (type === 'dir') {
              await this.handleInputSubmit(`cd ${relativePath}`);
              await this.handleInputSubmit('ls');
            } else if (type === 'file') {
              await this.handleInputSubmit(`cat ${relativePath}`);
            }
          }
        } else if (target.classList.contains('cmd-link')) {
          e.stopPropagation();
          const cmd = target.getAttribute('data-cmd');
          if (cmd) {
            await this.handleInputSubmit(cmd);
          }
        }
      }
    });
  }

  print(htmlContent, className = 'color-text') {
    const line = document.createElement('div');
    line.className = className;
    line.innerHTML = htmlContent;
    this.output.appendChild(line);

    const MAX_LINES = 150;
    while (this.output.children.length > MAX_LINES) {
      this.output.removeChild(this.output.firstChild);
    }

    this.body.scrollTop = this.body.scrollHeight;
    return line;
  }

  updateInputDisplay(text) {
    // 1. Toggle placeholder visibility (only show when logged in and no sub-prompt)
    if (this.loginState === 'LOGGED_IN' && !this.activeInputResolver && text === '') {
      if (this.placeholder) this.placeholder.style.display = 'inline';
    } else {
      if (this.placeholder) this.placeholder.style.display = 'none';
    }

    // 2. Clear text if empty
    if (text === '') {
      this.inputDisplay.textContent = '';
      if (this.cursor) {
        this.cursor.style.animation = 'none';
        void this.cursor.offsetHeight;
        this.cursor.style.animation = '';
      }
      return;
    }

    // 3. For sub-prompt input resolver, render raw text
    if (this.activeInputResolver) {
      this.inputDisplay.textContent = text;
    } else {
      // 4. Render standard text and dim comments
      const escapeHTML = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const commentMatch = text.match(/(?:\s|^)#.*/);
      if (commentMatch) {
        const commandPart = text.slice(0, commentMatch.index);
        const commentPart = text.slice(commentMatch.index);
        this.inputDisplay.innerHTML = escapeHTML(commandPart) + `<span class="color-dim">${escapeHTML(commentPart)}</span>`;
      } else {
        this.inputDisplay.textContent = text;
      }
    }

    // Reset cursor blink animation on any update to make it solid/visible
    if (this.cursor) {
      this.cursor.style.animation = 'none';
      void this.cursor.offsetHeight; // force reflow to restart animation
      this.cursor.style.animation = '';
    }
  }

  readInput(promptText) {
    return new Promise((resolve) => {
      const originalPrefixHTML = this.promptPrefix.innerHTML;
      this.input.disabled = false;
      this.inputLine.style.visibility = 'visible';
      this.promptPrefix.innerHTML = promptText;
      this.input.value = '';

      const cleanup = () => {
        this.input.disabled = true;
        this.inputLine.style.visibility = 'hidden';
        this.promptPrefix.innerHTML = originalPrefixHTML;
        this.activeInputResolver = null;
        this.activeInputAbortResolver = null;
      };

      this.activeInputResolver = (val) => {
        // Echo the prompt + typed value into the output before hiding
        this.print(`${promptText}${val}`);
        cleanup();
        resolve(val);
      };

      // Allow Ctrl+C to break out of readInput by resolving with null
      this.activeInputAbortResolver = () => {
        // Echo the prompt + typed text + ^C before hiding
        this.print(`${promptText}${this.input.value}^C`);
        cleanup();
        resolve(null);
      };

      this.updateInputDisplay('');
      this.focus();
    });
  }

  parseMarkdown(text) {
    return parseMarkdown(text);
  }

  escapeHTML(text) {
    return escapeHTML(text);
  }

  clear() {
    this.output.innerHTML = '';
  }

  focus() {
    if (this.input) {
      this.input.focus();
    }
  }

  updatePrompt() {
    if (this.loginState === 'LOGGED_IN') {
      const displayPath = this.currentPath.length === 0 ? '~' : '/' + this.currentPath.join('/');
      this.promptPrefix.innerHTML = `<span class="color-accent"><span class="red">${this.currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${displayPath}</span>#`;
      this.input.value = '';
      this.updateInputDisplay('');
    } else if (this.loginState === 'BOOTING') {
      this.inputDisplay.textContent = '';
      this.input.value = '';
    }
  }

  async handleInputSubmit(val) {
    if (this.loginState !== 'LOGGED_IN' || this.isExecutingCommand) return;

    this.isExecutingCommand = true;
    const trimmed = val.trim();
    if (trimmed !== '') {
      if (this.commandHistory.length === 0 || this.commandHistory[this.commandHistory.length - 1] !== trimmed) {
        this.commandHistory.push(trimmed);
      }
      this.historyIndex = this.commandHistory.length;
    }

    this.input.disabled = true;
    this.inputLine.style.visibility = 'hidden';

    try {
      await this.executeCommand(val);
    } catch (err) {
      this.print(`Error executing command: ${err.message}`, 'color-error');
      console.error(err);
    } finally {
      this.isExecutingCommand = false;
      this.input.disabled = false;
      this.inputLine.style.visibility = 'visible';
      this.abortSignal = false;
      this.updatePrompt();
      this.focus();
    }
  }

  async executeCommand(cmdStr) {
    const trimmed = cmdStr.trim();
    if (trimmed === '') return;

    const displayPath = this.currentPath.length === 0 ? '~' : '/' + this.currentPath.join('/');

    const commentMatch = trimmed.match(/(?:\s|^)#.*/);
    let commandPart = trimmed;
    let printedLine = escapeHTML(trimmed);
    if (commentMatch) {
      const commandPartStr = trimmed.slice(0, commentMatch.index);
      const commentPartStrFull = trimmed.slice(commentMatch.index);
      printedLine = escapeHTML(commandPartStr) + `<span class="color-dim">${escapeHTML(commentPartStrFull)}</span>`;
      commandPart = commandPartStr.trim();
    }

    this.print(`<span class="color-accent"><span class="red">${this.currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${displayPath}</span># ${printedLine}`);

    if (commandPart === '') return;

    const parts = commandPart.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    this.abortSignal = false;

    if (this.commands[command]) {
      const cmd = this.commands[command];

      // Intercept -h or --help to display detailed command help
      if (args.includes('-h') || args.includes('--help')) {
        await this.commands.help.run([command], this);
        return;
      }

      // Automatically validate required arguments
      if (cmd.args && cmd.args.length > 0) {
        const requiredArgs = cmd.args.filter(a => a.required);
        if (args.length < requiredArgs.length) {
          const missingArg = requiredArgs[args.length];
          let usage = cmd.name;
          const argUsageStrings = cmd.args.map(a => a.required ? `<${a.name}>` : `[${a.name}]`);
          if (argUsageStrings.length > 0) {
            usage += ' ' + argUsageStrings.join(' ');
          }
          this.print(`${command}: missing required argument &lt;${missingArg.name}&gt;. Usage: <span class="color-green">${usage}</span>`, 'color-error');
          return;
        }
      }

      await cmd.run(args, this);
      return;
    }

    this.print(`command not found: ${command}. Type 'help' to see list of commands.`, 'color-error');
  }

  handleTabAutocomplete() {
    const currentVal = this.input.value;
    const trimmed = currentVal.trimStart();
    if (trimmed === '') return;

    const parts = currentVal.split(/\s+/);
    const isCommandOnly = parts.length === 1;

    const getLongestCommonPrefix = (words) => {
      if (words.length === 0) return '';
      let prefix = words[0];
      for (let i = 1; i < words.length; i++) {
        while (words[i].toLowerCase().indexOf(prefix.toLowerCase()) !== 0) {
          prefix = prefix.substring(0, prefix.length - 1);
          if (prefix === '') return '';
        }
      }
      return prefix;
    };

    if (isCommandOnly) {
      const typedCmd = parts[0].toLowerCase();
      const availableCmds = Object.keys(this.commands);
      const matches = availableCmds.filter(cmd => cmd.startsWith(typedCmd));

      if (matches.length === 1) {
        this.input.value = matches[0] + ' ';
        this.updateInputDisplay(this.input.value);
      } else if (matches.length > 1) {
        const lcp = getLongestCommonPrefix(matches);
        if (lcp.length > typedCmd.length) {
          this.input.value = lcp;
          this.updateInputDisplay(this.input.value);
        } else {
          this.print(matches.join('    '), 'color-accent');
          const displayPath = this.currentPath.length === 0 ? '~' : '/' + this.currentPath.join('/');
          this.print(`<span class="color-accent"><span class="red">${this.currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${displayPath}</span># ${currentVal}`);
        }
      }
    } else {
      const command = parts[0].toLowerCase();
      const cmd = this.commands[command];
      const argIdx = parts.length - 2;
      const argMetadata = (cmd && cmd.args) ? cmd.args[argIdx] : null;

      if (argMetadata && argMetadata.suggestions && argMetadata.suggestions.length > 0) {
        const typedArg = parts[parts.length - 1].toLowerCase();
        const suggestions = argMetadata.suggestions;
        const matches = suggestions.filter(s => s.startsWith(typedArg));

        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0] + ' ';
          this.input.value = parts.join(' ');
          this.updateInputDisplay(this.input.value);
        } else if (matches.length > 1) {
          const lcp = getLongestCommonPrefix(matches);
          if (lcp.length > typedArg.length) {
            parts[parts.length - 1] = lcp;
            this.input.value = parts.join(' ');
            this.updateInputDisplay(this.input.value);
          } else {
            this.print(matches.join('    '), 'color-accent');
            const displayPath = this.currentPath.length === 0 ? '~' : '/' + this.currentPath.join('/');
            this.print(`<span class="color-accent"><span class="red">${this.currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${displayPath}</span># ${currentVal}`);
          }
        }
        return;
      }

      const argVal = parts[parts.length - 1];
      const slashIdx = argVal.lastIndexOf('/');
      let targetPath = [...this.currentPath];
      let prefix = argVal;

      if (slashIdx !== -1) {
        let pathPrefix = argVal.slice(0, slashIdx);
        if (pathPrefix === '' && argVal.startsWith('/')) {
          pathPrefix = '/';
        }
        prefix = argVal.slice(slashIdx + 1);

        const resolvedPrefixPath = this.fileSystem.resolvePath(this.currentPath, pathPrefix);
        if (resolvedPrefixPath === null) {
          return;
        }
        targetPath = resolvedPrefixPath;
      }

      const targetDir = this.fileSystem.getNodeByPath(targetPath);
      if (!targetDir || typeof targetDir !== 'object') return;

      const dirKeys = Object.keys(targetDir);
      if (targetPath.length > 0) {
        dirKeys.push('..');
      }

      const prefixLower = prefix.toLowerCase();
      const matches = dirKeys.filter(key => key.toLowerCase().startsWith(prefixLower));

      if (matches.length === 1) {
        const matchedName = matches[0];
        const isDirNode = matchedName === '..' || typeof targetDir[matchedName] === 'object';
        const completedArg = (slashIdx !== -1 ? argVal.slice(0, slashIdx + 1) : '') + matchedName + (isDirNode ? '/' : ' ');

        parts[parts.length - 1] = completedArg;
        this.input.value = parts.join(' ');
        this.updateInputDisplay(this.input.value);
      } else if (matches.length > 1) {
        const lcp = getLongestCommonPrefix(matches);
        if (lcp.length > prefix.length) {
          const completedPrefix = (slashIdx !== -1 ? argVal.slice(0, slashIdx + 1) : '') + lcp;
          parts[parts.length - 1] = completedPrefix;
          this.input.value = parts.join(' ');
          this.updateInputDisplay(this.input.value);
        } else {
          const formattedMatches = matches.map(matchedName => {
            const isDirNode = matchedName === '..' || typeof targetDir[matchedName] === 'object';
            return isDirNode ? `<span class="color-dir">${matchedName}/</span>` : `<span class="color-file">${matchedName}</span>`;
          });
          this.print(formattedMatches.join('    '));

          const displayPath = this.currentPath.length === 0 ? '~' : '/' + this.currentPath.join('/');
          this.print(`<span class="color-accent"><span class="red">${this.currentUsername}</span>@chenghao.li</span>:<span class="color-dir">${displayPath}</span># ${currentVal}`);
        }
      }
    }
  }

  startConnection() {
    this.loginState = 'BOOTING';
    this.input.disabled = true;
    this.promptPrefix.innerHTML = '<span class="color-accent">C:\\Users\\cli&gt;</span>';
    this.inputDisplay.textContent = '';

    audio.startHum();

    const cmdText = 'ssh root@chenghao.li';
    let charIndex = 0;

    const typeEffect = setInterval(() => {
      this.updateInputDisplay(cmdText.slice(0, charIndex + 1));
      audio.playKeyclick(cmdText[charIndex]);
      charIndex++;
      if (charIndex >= cmdText.length) {
        clearInterval(typeEffect);

        setTimeout(() => {
          this.print('<span class="color-accent">C:\\Users\\cli&gt;</span> ssh root@chenghao.li');
          this.inputDisplay.textContent = '';

          audio.playBootChime();
          this.printMOTD();
          this.promptPrefix.innerHTML = `<span class="color-accent"><span class="red">root</span>@chenghao.li</span>:<span class="color-dir">~</span>#`;

          setTimeout(() => {
            const lsText = 'ls # click items to navigate, or use cat/cd';
            let lsIndex = 0;

            const lsTypeEffect = setInterval(() => {
              this.updateInputDisplay(lsText.slice(0, lsIndex + 1));
              audio.playKeyclick(lsText[lsIndex]);
              lsIndex++;

              if (lsIndex >= lsText.length) {
                clearInterval(lsTypeEffect);

                setTimeout(async () => {
                  this.inputDisplay.textContent = '';
                  this.loginState = 'LOGGED_IN';
                  this.input.disabled = false;
                  audio.fadeHumQuiet();
                  await this.handleInputSubmit('ls # click items to navigate, or use cat/cd');
                }, 400);
              }
            }, 50);
          }, 600);
        }, 400);
      }
    }, 50);
  }

  printMOTD() {
    const now = new Date();
    const currentTimestamp = now.toString();
    const asciiArt = `<span class="color-dim red">

       ░░░░    ░  ░░ ░░░░   ░░░                ░░                             </span><span class="red">
      ░░░     ░  ░░░░░                    ░         ░░                        
     ░░░<span class="color-dim red"> ░</span>   ▒  ▒  ▒▒                               ░  ░                      
    ▒▒▒▒       ▒▒▒▒                   </span>▓█</span><span class="red">          ▒                           
    ▒▒▒<span class="color-dim red">  ▒</span>          ▒▒               </span>█  █</span><span class="red">               ▒                     
   ▒ ▒<span class="color-dim red"> ▒▒▒▒</span>        ▒▒               </span>█    █</span><span class="red">        ▒                           
   ▓▓▓<span class="color-dim red">  ▓</span>          ▓            </span>   █ ▓▓▓  █</span><span class="red">█▓             ▓  ▓                
  ▓ ▓<span class="color-dim red"> ▓  ▓</span>  ▓▓  ▓▓    <span class="color-dim red">▒</span>   ▓</span>█<span class="red">█ ▓</span> ▓▞▀▀▀▀▀▀▀▀▀█▀▀▀▀▀▀▀▀▛▀▀</span><span class="red">                       
  ▓ ▓            ▓       ██ ▓ ▓</span>██     ▓█ ▓▓ █ ▓     ▓</span><span class="red">                         
  ▓▓▓            ▓  <span class="color-dim red">▒</span>   █ ▓  </span>█<span class="red">█</span>██     ██▓█   ████▓ █</span><span class="red">                          
   ▓▓<span class="color-dim red">   ▓</span>          <span class="color-dim red">▒ ▒</span> </span>█<span class="red">▓ ▓▓▓</span>  ▓   ▟     ▚     ██████</span><span class="red">        ▒          </span> | <span class="blue">arch</span>4ic</span><span class="red">
  ▓▓▓<span class="color-dim red">   ▓</span>      ▓▓    <span class="color-dim red">▒</span></span>█▓<span class="red">  █▓</span> ▓█  ▓ █      ██▓  ██ ████</span><span class="red">▒                       
  ▓▓▓<span class="color-dim red">   ▓</span>       ▓▓    ██ ▓</span> █ █ █   ▓█▓ ▄<span class="red">▓</span>██ ███▓█ █  <span class="red">▓</span> █</span><span class="red">                      
  ▓ ▓           ▓▓      </span>█ ▓ <span class="red">█</span>█ <span class="red">▓</span>    ▄   ▚   █  <span class="red">▓</span> █    <span class="red">▓</span>█</span><span class="red">                      
  ▓ ▓<span class="color-dim red"> ▓▓▓▓</span>      ▓▓    ▓▓ </span>█<span class="red">█▓</span>█ ▄▄▄▄▄▓▓▄▄▓▄▄▓▓▓▓▄▄▄▄<span class="red">▓</span>███<span class="red">▓                       
    ▓▓<span class="color-dim red">  ▓</span>       ▓▓ <span class="color-dim red">░</span>      </span>█   <span class="red">▓</span>█ ▓ ▓▓██████   ██   █<span class="red">   ▓  ▓          ▓  ▓     
   ▒ ▒<span class="color-dim red"> ▒▒▒▒▒</span>   ▒  <span class="color-dim red">▒▒▒</span>    </span>█    █                █ <span class="red">▓</span>  █<span class="red">     ▒        ▒▒▒  ▒     
    ▒▒▒<span class="color-dim red">  ▒ ▒</span>      <span class="color-dim red">▒▒▒▒</span>  </span>█    █              ▓<span class="red">   █▓  ▓</span>█<span class="red">  ▒▒          ▒  ▒      
    ▒ ▒▒<span class="color-dim red">    ▒</span>          </span>█▄▄▄▄▞               ▓    ▚▄▄▄█<span class="red">               ▒▒      
     ░ ░<span class="color-dim red"> ░   ░</span>   ░    ░                                         ░     ░       
      ░ ░<span class="color-dim red">     ░</span>         ░                                      ░     ░ ░      </span><span class="color-dim red">
       ░ ░░<span class="color-dim red">    ░</span>            ░░░                ░░░           ░░    ░░ ░       </span>

`;

    /*
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
                                       
    `;*/

    this.print(`Arch Linux 6.9.3-arch1-1 (tty1)`, 'color-dim');
    this.print(`\n  >>> <span class="blue">Welcome, root@chenghao.li!</span> <<<`, 'color-accent');
    this.print(asciiArt, 'color-accent motd-ascii-art');
    this.printBuddyBox();
    this.print(`
System information at ${currentTimestamp}:
  System load:  0.15               Processes:             108
  Usage of /:   38.4% of 50GB      Users logged in:       2
  Memory usage: 12%                IPv4 address for eth0: 192.168.1.104
`, 'color-dim');
    this.print(` `);
  }

  printBuddyBox() {
    if (!buddies || buddies.length === 0) return;

    let buddiesPerRow = 5;
    let borderLength = 60;

    if (window.innerWidth < 480) {
      buddiesPerRow = 2;
      borderLength = 24;
    } else if (window.innerWidth < 768) {
      buddiesPerRow = 3;
      borderLength = 34;
    }

    const rows = [];
    for (let i = 0; i < buddies.length; i += buddiesPerRow) {
      rows.push(buddies.slice(i, i + buddiesPerRow));
    }

    let rowsHTML = '';
    rows.forEach(row => {
      let rowContentHTML = '';
      row.forEach(filename => {
        const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");
        const url = nameWithoutExt.startsWith('http://') || nameWithoutExt.startsWith('https://')
          ? nameWithoutExt
          : `https://${nameWithoutExt}`;

        rowContentHTML += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="buddy-link" title="${nameWithoutExt}"><img src="assets/images/buddies/${filename}" alt="${nameWithoutExt}" class="buddy-img" onerror="this.parentNode.style.display='none'"></a>`;
      });

      rowsHTML += `<div class="buddy-box-row"><span class="buddy-border">║</span><div class="buddy-row-content">${rowContentHTML}</div><span class="buddy-border">║</span></div>`;
    });

    const borderLine = '═'.repeat(borderLength);
    const boxHTML = `<div class="buddy-box"><div class="buddy-box-header">╔${borderLine}╗</div>${rowsHTML}<div class="buddy-box-footer">╚${borderLine}╝</div></div>`;

    this.print(boxHTML, 'color-text');
  }
}
