export class BaseEditor {
  constructor(shell, filename, initialContent, onSave, onExit) {
    this.shell = shell;
    this.filename = filename;
    this.content = initialContent;
    this.onSave = onSave;
    this.onExit = onExit;
    this.isModified = false;

    this.container = null;
    this.textarea = null;

    this.originalState = this.shell.loginState;
    this.shell.loginState = 'GAME'; // Bypass shell typing listener
  }

  initDOM(editorClassName) {
    // Hide terminal output & input line
    this.shell.output.style.display = 'none';
    this.shell.inputLine.style.display = 'none';
    
    // Prevent terminal body from scrolling
    this.shell.body.style.overflowY = 'hidden';

    // Create editor container
    this.container = document.createElement('div');
    this.container.className = `terminal-editor ${editorClassName}`;
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.width = '100%';
    this.container.style.height = '100%';

    // Create hidden textarea
    this.textarea = document.createElement('textarea');
    this.textarea.style.position = 'absolute';
    this.textarea.style.left = '0';
    this.textarea.style.top = '0';
    this.textarea.style.opacity = '0';
    this.textarea.style.width = '100%';
    this.textarea.style.height = '100%';
    this.textarea.style.pointerEvents = 'none';
    this.textarea.style.zIndex = '-1';
    this.textarea.spellcheck = false;
    this.textarea.autocomplete = 'off';
    this.textarea.value = this.content;

    this.shell.body.appendChild(this.container);
    this.shell.body.appendChild(this.textarea);

    // Focus on click
    this.container.addEventListener('click', () => {
      this.textarea.focus();
    });

    this.textarea.focus();
  }

  cleanup() {
    if (this.container) this.container.remove();
    if (this.textarea) this.textarea.remove();

    this.shell.output.style.display = 'flex';
    this.shell.inputLine.style.display = 'flex';
    this.shell.body.style.overflowY = '';
    this.shell.loginState = this.originalState;
    this.shell.updatePrompt();
    this.shell.focus();
  }

  // Helper to split text by cursor and wrap active character
  getLinesAndCursor() {
    const text = this.textarea.value;
    const selStart = this.textarea.selectionStart;

    const lines = [];
    let curLine = 0;
    let curCol = 0;

    let currentIdx = 0;
    const rawLines = text.split('\n');

    for (let i = 0; i < rawLines.length; i++) {
      const lineStr = rawLines[i];
      const lineStartIdx = currentIdx;
      const lineEndIdx = currentIdx + lineStr.length; // excluding newline character

      let html = '';
      let isCursorOnThisLine = false;

      if (selStart >= lineStartIdx && selStart <= lineEndIdx) {
        isCursorOnThisLine = true;
        curLine = i;
        curCol = selStart - lineStartIdx;

        const before = lineStr.slice(0, curCol);
        const charAtCursor = lineStr.slice(curCol, curCol + 1) || ' ';
        const after = lineStr.slice(curCol + 1);

        const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html = escape(before) + `<span class="terminal-cursor">${escape(charAtCursor)}</span>` + escape(after);
      } else {
        const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        html = escape(lineStr);
      }

      lines.push({
        text: lineStr,
        html: html,
        isCursor: isCursorOnThisLine
      });

      currentIdx = lineEndIdx + 1; // +1 for the newline character
    }

    return {
      lines,
      curLine,
      curCol,
      totalLines: rawLines.length,
      totalChars: text.length
    };
  }
}
