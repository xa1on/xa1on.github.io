// Global Shared Terminal Namespace
window.Terminal = {
  // DOM Cache (initialized below when document is parsed)
  body: null,
  output: null,
  inputLine: null,
  promptPrefix: null,
  inputDisplay: null,
  input: null,
  cursor: null,

  // Shared state
  loginState: 'BOOTING', // 'BOOTING' | 'LOGGED_IN' | 'GAME'
  currentUsername: 'root',
  currentPath: [],
  virtualFS: null, // Populated by terminal.js

  // Async input resolver
  activeInputResolver: null,

  // Modular Games/Commands Registry
  games: {},

  // Focus helper - keeps keyboard focus on terminal input
  focus() {
    if (this.input) {
      this.input.focus();
    }
  },

  // Writes a new line of text (or HTML) to the terminal history
  print(htmlContent, className = 'color-text') {
    const line = document.createElement('div');
    line.className = className;
    line.innerHTML = htmlContent;
    this.output.appendChild(line);

    // Keep DOM count under control to prevent long-term lag
    const MAX_LINES = 150;
    while (this.output.children.length > MAX_LINES) {
      this.output.removeChild(this.output.firstChild);
    }

    // Auto-scroll to bottom of terminal
    this.body.scrollTop = this.body.scrollHeight;
    return line;
  },

  // Asynchronously prompts the user for custom input inline in the shell
  readInput(promptText) {
    return new Promise((resolve) => {
      const originalPrefixHTML = this.promptPrefix.innerHTML;
      
      // Temporarily show input line so user can type
      this.inputLine.style.visibility = 'visible';
      
      this.promptPrefix.textContent = promptText;
      this.input.value = '';
      this.inputDisplay.textContent = '';
      this.focus();
      
      this.activeInputResolver = (val) => {
        // Hide input line again
        this.inputLine.style.visibility = 'hidden';
        this.promptPrefix.innerHTML = originalPrefixHTML;
        resolve(val);
      };
    });
  },

  // Simple regex-based Markdown to Terminal HTML parser
  parseMarkdown(text) {
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
};

// Initialize DOM cache immediately (loaded at bottom of body)
window.Terminal.body = document.getElementById('terminal-body');
window.Terminal.output = document.getElementById('terminal-output');
window.Terminal.inputLine = document.getElementById('input-line');
window.Terminal.promptPrefix = document.getElementById('prompt-prefix');
window.Terminal.inputDisplay = document.getElementById('input-display');
window.Terminal.input = document.getElementById('terminal-input');
window.Terminal.cursor = document.getElementById('cursor');
