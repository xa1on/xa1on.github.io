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
    this.textarea.selectionStart = 0;
    this.textarea.selectionEnd = 0;

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

  // Get raw lines, cursor indices, and offsets
  getLinesAndCursor() {
    const text = this.textarea.value;
    const selStart = this.textarea.selectionStart;
    const selEnd = this.textarea.selectionEnd;

    const rawLines = text.split('\n');
    let curLine = 0;
    let curCol = 0;

    // Find the cursor line and column based on selectionStart (active typing cursor)
    let currentIdx = 0;
    for (let i = 0; i < rawLines.length; i++) {
      const lineLen = rawLines[i].length;
      if (selStart >= currentIdx && selStart <= currentIdx + lineLen) {
        curLine = i;
        curCol = selStart - currentIdx;
        break;
      }
      currentIdx += lineLen + 1; // +1 for \n
    }

    return {
      rawLines,
      curLine,
      curCol,
      selStart,
      selEnd,
      totalLines: rawLines.length,
      totalChars: text.length
    };
  }

  // Escape a single line and inject selection and cursor highlights
  escapeLine(lineStr, lineStartIdx, selStart, selEnd) {
    const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lineEndIdx = lineStartIdx + lineStr.length;

    // Case 1: No selection (cursor only)
    if (selStart === selEnd) {
      if (selStart >= lineStartIdx && selStart <= lineEndIdx) {
        const curCol = selStart - lineStartIdx;
        const before = lineStr.slice(0, curCol);
        const charAtCursor = lineStr.slice(curCol, curCol + 1) || ' ';
        const after = lineStr.slice(curCol + 1);
        return escape(before) + `<span class="terminal-cursor">${escape(charAtCursor)}</span>` + escape(after);
      }
      return escape(lineStr);
    }

    // Case 2: Selection exists
    const s = Math.min(selStart, selEnd);
    const e = Math.max(selStart, selEnd);

    // Check if selection overlaps with this line
    const overlapStart = Math.max(s, lineStartIdx);
    const overlapEnd = Math.min(e, lineEndIdx);

    if (overlapStart < overlapEnd) {
      const relStart = overlapStart - lineStartIdx;
      const relEnd = overlapEnd - lineStartIdx;

      const before = lineStr.slice(0, relStart);
      const selected = lineStr.slice(relStart, relEnd);
      const after = lineStr.slice(relEnd);

      // Render cursor at 'selStart' (active boundary in textareas)
      if (selStart >= lineStartIdx && selStart <= lineEndIdx) {
        const curCol = selStart - lineStartIdx;
        if (curCol === relStart) {
          const charAtCursor = selected.slice(0, 1) || ' ';
          const rest = selected.slice(1);
          return escape(before) + 
                 `<span class="terminal-cursor">${escape(charAtCursor)}</span>` + 
                 `<span class="terminal-selection">${escape(rest)}</span>` + 
                 escape(after);
        } else if (curCol === relEnd) {
          const charAtCursor = after.slice(0, 1) || ' ';
          const rest = after.slice(1);
          return escape(before) + 
                 `<span class="terminal-selection">${escape(selected)}</span>` + 
                 `<span class="terminal-cursor">${escape(charAtCursor)}</span>` + 
                 escape(rest);
        }
      }

      return escape(before) + `<span class="terminal-selection">${escape(selected)}</span>` + escape(after);
    } else {
      // Selection doesn't overlap line text.
      // If the active cursor is at the start of the line, render it.
      if (selStart === lineStartIdx && selStart >= lineStartIdx && selStart <= lineEndIdx) {
        const charAtCursor = lineStr.slice(0, 1) || ' ';
        const rest = lineStr.slice(1);
        return `<span class="terminal-cursor">${escape(charAtCursor)}</span>` + escape(rest);
      }
      // If the active cursor is at the end of the line, render it.
      if (selStart === lineEndIdx && selStart >= lineStartIdx && selStart <= lineEndIdx) {
        return escape(lineStr) + `<span class="terminal-cursor"> </span>`;
      }
      return escape(lineStr);
    }
  }
}

