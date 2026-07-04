import { BaseEditor, runEditor } from '../utils/editor.js';
import { audio } from '../audio.js';

export const vim = {
  name: 'vim',
  description: 'Edit a text file using the vim terminal editor.',
  category: 'filesystem',
  args: [
    { name: 'filename', description: 'File to edit or create.', required: true }
  ],
  run: async (args, shell) => {
    return runEditor(VimEditor, args, 'vim', shell);
  }
};

class VimEditor extends BaseEditor {
  static yankBuffer = '';
  static isLineYank = false;

  constructor(shell, filename, initialContent, resolvedPath, onSave, onExit, isNewFile) {
    super(shell, filename, initialContent, resolvedPath, onSave, onExit, isNewFile);

    // Modes: 'NORMAL', 'INSERT', 'COMMAND_LINE'
    this.mode = 'NORMAL';
    this.commandText = '';
    this.statusMessage = isNewFile ? `"${filename}" [New File]` : `"${filename}"`;
    this.statusTimeout = null;
    this.undoStack = [];
    this.textBeforeInsert = null;
    this.lastKeyPressed = '';
    this.isWaitingForReplaceChar = false;
    this.searchQuery = '';
  }

  start() {
    this.initDOM('vim-editor');
    super.start('.vim-content', '.vim-line', '<span class="vim-lnum">  1</span><span>&nbsp;</span>');
  }

  cleanup() {
    super.cleanup();
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
  }

  showStatus(msg) {
    this.statusMessage = msg;
    this.draw();
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
    this.statusTimeout = setTimeout(() => {
      this.statusMessage = '';
      this.draw();
    }, 4000);
  }

  moveCursor(dir, allowLineEnd = false) {
    const { rawLines, curLine, curCol } = this.getLinesAndCursor();
    const lineLen = rawLines[curLine] ? rawLines[curLine].length : 0;
    let newCol = curCol + dir;
    
    const maxCol = allowLineEnd ? lineLen : Math.max(0, lineLen - 1);
    newCol = Math.max(0, Math.min(maxCol, newCol));
    
    let newIdx = 0;
    for (let i = 0; i < curLine; i++) {
      newIdx += rawLines[i].length + 1;
    }
    newIdx += newCol;
    
    this.textarea.selectionStart = newIdx;
    this.textarea.selectionEnd = newIdx;
  }

  moveLine(dir) {
    const { rawLines, curLine, curCol } = this.getLinesAndCursor();
    const targetLine = curLine + dir;

    if (targetLine >= 0 && targetLine < rawLines.length) {
      const lineLen = rawLines[targetLine].length;
      const maxCol = Math.max(0, lineLen - 1);
      const targetCol = Math.min(curCol, maxCol);
      let newIdx = 0;
      for (let i = 0; i < targetLine; i++) {
        newIdx += rawLines[i].length + 1;
      }
      newIdx += targetCol;
      this.textarea.selectionStart = newIdx;
      this.textarea.selectionEnd = newIdx;
    }
  }

  moveWord(dir) {
    const val = this.textarea.value;
    let idx = this.textarea.selectionStart;
    
    const isAlphanumeric = (c) => /[a-zA-Z0-9_]/.test(c);
    const isWhitespace = (c) => /\s/.test(c);
    
    if (dir === 1) { // w
      if (idx >= val.length) return;
      const startClass = isAlphanumeric(val[idx]) ? 1 : (isWhitespace(val[idx]) ? 0 : 2);
      
      if (startClass !== 0) {
        while (idx < val.length) {
          const curClass = isAlphanumeric(val[idx]) ? 1 : (isWhitespace(val[idx]) ? 0 : 2);
          if (curClass !== startClass) break;
          idx++;
        }
      }
      while (idx < val.length && isWhitespace(val[idx])) {
        idx++;
      }
    } else { // b
      if (idx <= 0) return;
      idx--;
      while (idx > 0 && isWhitespace(val[idx])) {
        idx--;
      }
      const targetClass = isAlphanumeric(val[idx]) ? 1 : (isWhitespace(val[idx]) ? 0 : 2);
      while (idx > 0) {
        const prevChar = val[idx - 1];
        const prevClass = isAlphanumeric(prevChar) ? 1 : (isWhitespace(prevChar) ? 0 : 2);
        if (prevClass !== targetClass) break;
        idx--;
      }
    }
    
    this.textarea.selectionStart = this.textarea.selectionEnd = idx;
  }

  async writeToClipboard(text, isLine) {
    VimEditor.yankBuffer = text;
    VimEditor.isLineYank = isLine;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch (err) {
      // Fall back to internal buffer quietly
    }
  }

  async handlePut(key) {
    let clipText = VimEditor.yankBuffer;
    let isLine = VimEditor.isLineYank;

    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const systemText = await navigator.clipboard.readText();
        if (systemText) {
          clipText = systemText;
          isLine = systemText.endsWith('\n');
        }
      }
    } catch (err) {
      // Fall back to internal buffer quietly
    }

    if (!clipText) return;

    this.pushUndoState();
    const val = this.textarea.value;
    const selStart = this.textarea.selectionStart;

    if (isLine) {
      const { rawLines, curLine } = this.getLinesAndCursor();
      const insertLine = key === 'p' ? curLine + 1 : curLine;
      let insertIdx = 0;
      for (let i = 0; i < insertLine && i < rawLines.length; i++) {
        insertIdx += rawLines[i].length + 1;
      }
      this.textarea.value = val.slice(0, insertIdx) + clipText + val.slice(insertIdx);
      this.textarea.selectionStart = this.textarea.selectionEnd = insertIdx;
    } else {
      const insertIdx = key === 'p' ? selStart + 1 : selStart;
      this.textarea.value = val.slice(0, insertIdx) + clipText + val.slice(insertIdx);
      this.textarea.selectionStart = this.textarea.selectionEnd = insertIdx + clipText.length;
    }
    this.draw();
  }

  pushUndoState() {
    this.undoStack.push({
      value: this.textarea.value,
      selStart: this.textarea.selectionStart,
      selEnd: this.textarea.selectionEnd
    });
    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }
  }

  handleKeydown(e) {
    const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];
    if (!ignoredKeys.includes(e.key) && !e.repeat) {
      audio.playKeyclick(e.key);
    }

    if (this.mode === 'NORMAL') {
      e.preventDefault();

      if (this.isWaitingForReplaceChar) {
        this.isWaitingForReplaceChar = false;
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          this.pushUndoState();
          const val = this.textarea.value;
          const idx = this.textarea.selectionStart;
          if (idx < val.length && val[idx] !== '\n') {
            this.textarea.value = val.slice(0, idx) + e.key + val.slice(idx + 1);
            this.textarea.selectionStart = this.textarea.selectionEnd = idx;
            this.draw();
          }
        }
        return;
      }

      const key = e.key;
      const lowerKey = key.toLowerCase();

      if (key === 'Escape') {
        this.searchQuery = '';
        this.draw();
        return;
      }

      if (key === 'i' || key === 'I') {
        this.textBeforeInsert = this.textarea.value;
        this.mode = 'INSERT';
        this.statusMessage = '';
        this.draw();
        return;
      }

      if (key === 'a') {
        this.textBeforeInsert = this.textarea.value;
        this.moveCursor(1, true);
        this.mode = 'INSERT';
        this.statusMessage = '';
        this.draw();
        return;
      }

      if (key === 'A') {
        this.textBeforeInsert = this.textarea.value;
        const { rawLines, curLine } = this.getLinesAndCursor();
        let idx = 0;
        for (let i = 0; i < curLine; i++) {
          idx += rawLines[i].length + 1;
        }
        idx += rawLines[curLine].length;
        this.textarea.selectionStart = this.textarea.selectionEnd = idx;
        this.mode = 'INSERT';
        this.statusMessage = '';
        this.draw();
        return;
      }

      if (key === ':') {
        this.mode = 'COMMAND_LINE';
        this.commandText = ':';
        this.draw();
        return;
      }

      if (key === '/') {
        this.mode = 'COMMAND_LINE';
        this.commandText = '/';
        this.draw();
        return;
      }

      // Cursor movement
      if (key === 'ArrowLeft' || lowerKey === 'h') {
        this.moveCursor(-1);
      } else if (key === 'ArrowRight' || lowerKey === 'l') {
        this.moveCursor(1);
      } else if (key === 'ArrowDown' || lowerKey === 'j') {
        this.moveLine(1);
      } else if (key === 'ArrowUp' || lowerKey === 'k') {
        this.moveLine(-1);
      } else if (key === '0') {
        const { rawLines, curLine } = this.getLinesAndCursor();
        let idx = 0;
        for (let i = 0; i < curLine; i++) {
          idx += rawLines[i].length + 1;
        }
        this.textarea.selectionStart = this.textarea.selectionEnd = idx;
      } else if (key === '$') {
        const { rawLines, curLine } = this.getLinesAndCursor();
        let idx = 0;
        for (let i = 0; i < curLine; i++) {
          idx += rawLines[i].length + 1;
        }
        idx += Math.max(0, rawLines[curLine].length - 1);
        this.textarea.selectionStart = this.textarea.selectionEnd = idx;
      } else if (key === 'w') {
        this.moveWord(1);
      } else if (key === 'b') {
        this.moveWord(-1);
      } else if (key === 'g') {
        if (this.lastKeyPressed === 'g') {
          this.textarea.selectionStart = this.textarea.selectionEnd = 0;
          this.lastKeyPressed = '';
        } else {
          this.lastKeyPressed = 'g';
          return;
        }
      } else if (key === 'G') {
        const { rawLines } = this.getLinesAndCursor();
        let idx = 0;
        for (let i = 0; i < rawLines.length - 1; i++) {
          idx += rawLines[i].length + 1;
        }
        this.textarea.selectionStart = this.textarea.selectionEnd = idx;
      } else if (key === 'x') {
        const val = this.textarea.value;
        const idx = this.textarea.selectionStart;
        if (val.length > 0 && idx < val.length && val[idx] !== '\n') {
          this.pushUndoState();
          this.textarea.value = val.slice(0, idx) + val.slice(idx + 1);
          
          const newVal = this.textarea.value;
          let newIdx = idx;
          if ((newVal[newIdx] === '\n' || newIdx === newVal.length) && newIdx > 0 && newVal[newIdx - 1] !== '\n') {
            newIdx--;
          }
          this.textarea.selectionStart = this.textarea.selectionEnd = newIdx;
        }
      } else if (key === 'd') {
        if (this.lastKeyPressed === 'd') {
          this.pushUndoState();
          const { rawLines, curLine } = this.getLinesAndCursor();
          rawLines.splice(curLine, 1);
          if (rawLines.length === 0) rawLines.push('');
          this.textarea.value = rawLines.join('\n');
          let idx = 0;
          const targetLine = Math.min(curLine, rawLines.length - 1);
          for (let i = 0; i < targetLine; i++) {
            idx += rawLines[i].length + 1;
          }
          this.textarea.selectionStart = this.textarea.selectionEnd = idx;
          this.lastKeyPressed = '';
        } else {
          this.lastKeyPressed = 'd';
          return;
        }
      } else if (key === 'y') {
        const selStart = this.textarea.selectionStart;
        const selEnd = this.textarea.selectionEnd;
        if (selStart !== selEnd) {
          const yankedText = this.textarea.value.slice(Math.min(selStart, selEnd), Math.max(selStart, selEnd));
          this.writeToClipboard(yankedText, false);
          this.showStatus(`${yankedText.length} characters yanked`);
          this.lastKeyPressed = '';
        } else if (this.lastKeyPressed === 'y') {
          const { rawLines, curLine } = this.getLinesAndCursor();
          const yankedText = rawLines[curLine] + '\n';
          this.writeToClipboard(yankedText, true);
          this.showStatus('1 line yanked');
          this.lastKeyPressed = '';
        } else {
          this.lastKeyPressed = 'y';
          return;
        }
      } else if (key === 'p' || key === 'P') {
        this.handlePut(key);
      } else if (key === 'r') {
        this.isWaitingForReplaceChar = true;
        return;
      } else if (key === 'D' || key === 'C') {
        this.pushUndoState();
        const val = this.textarea.value;
        const selStart = this.textarea.selectionStart;
        const { rawLines, curLine, curCol } = this.getLinesAndCursor();
        const lineLen = rawLines[curLine] ? rawLines[curLine].length : 0;
        const charsToDelete = lineLen - curCol;
        
        this.textarea.value = val.slice(0, selStart) + val.slice(selStart + charsToDelete);
        this.textarea.selectionStart = this.textarea.selectionEnd = selStart;
        
        if (key === 'C') {
          this.mode = 'INSERT';
          this.textBeforeInsert = this.textarea.value;
        } else {
          if (selStart > 0 && this.textarea.value[selStart] === '\n') {
            this.textarea.selectionStart = this.textarea.selectionEnd = selStart - 1;
          }
        }
      } else if (lowerKey === 'o') {
        this.pushUndoState();
        const { rawLines, curLine } = this.getLinesAndCursor();
        let idx = 0;
        if (key === 'o') {
          for (let i = 0; i <= curLine; i++) {
            idx += rawLines[i].length + 1;
          }
          rawLines.splice(curLine + 1, 0, '');
        } else {
          for (let i = 0; i < curLine; i++) {
            idx += rawLines[i].length + 1;
          }
          rawLines.splice(curLine, 0, '');
        }
        this.textarea.value = rawLines.join('\n');
        this.textarea.selectionStart = this.textarea.selectionEnd = idx;
        this.textBeforeInsert = this.textarea.value;
        this.mode = 'INSERT';
        this.statusMessage = '';
      } else if (key === 'u') {
        if (this.undoStack.length > 0) {
          const prevState = this.undoStack.pop();
          this.textarea.value = prevState.value;
          this.textarea.selectionStart = prevState.selStart;
          this.textarea.selectionEnd = prevState.selEnd;
          this.showStatus('1 change; before...');
        } else {
          this.showStatus('Already at oldest change');
        }
      }

      if (key !== 'g' && key !== 'd' && key !== 'y') {
        this.lastKeyPressed = '';
      }

      this.draw();
      return;
    }

    if (this.mode === 'INSERT') {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (this.textarea.value !== this.textBeforeInsert) {
          this.undoStack.push({
            value: this.textBeforeInsert,
            selStart: this.textarea.selectionStart,
            selEnd: this.textarea.selectionStart
          });
        }
        this.textBeforeInsert = null;
        this.mode = 'NORMAL';
        
        const { curCol } = this.getLinesAndCursor();
        if (curCol > 0) {
          this.moveCursor(-1);
        }
        
        this.draw();
      }
      return;
    }

    if (this.mode === 'COMMAND_LINE') {
      e.preventDefault();
      if (e.key === 'Escape') {
        this.mode = 'NORMAL';
        this.commandText = '';
        this.draw();
        return;
      }

      if (e.key === 'Backspace') {
        this.commandText = this.commandText.slice(0, -1);
        if (this.commandText === '') {
          this.mode = 'NORMAL';
        }
        this.draw();
        return;
      }

      if (e.key === 'Enter') {
        const type = this.commandText[0];
        const cmd = this.commandText.slice(1);
        if (type === ':') {
          this.executeVimCommand(cmd.trim());
        } else if (type === '/') {
          this.executeVimSearch(cmd);
        }
        return;
      }

      if (e.key.length === 1) {
        this.commandText += e.key;
        this.draw();
      }
    }
  }

  executeVimCommand(cmd) {
    this.mode = 'NORMAL';
    this.commandText = '';

    if (cmd === 'w') {
      const result = this.onSave(this.textarea.value);
      if (result === true) {
        this.content = this.textarea.value;
        this.isModified = false;
        const linesArr = this.textarea.value.split('\n');
        this.showStatus(`"${this.filename}" ${linesArr.length}L, ${this.textarea.value.length}C written`);
      } else {
        this.showStatus(`Error: ${result}`);
      }
    } else if (cmd === 'q') {
      const currentVal = this.textarea.value;
      if (currentVal !== this.content) {
        this.showStatus('E37: No write since last change (add ! to override)');
      } else {
        this.cleanup();
        this.onExit();
      }
    } else if (cmd === 'wq' || cmd === 'x') {
      const result = this.onSave(this.textarea.value);
      if (result === true) {
        this.cleanup();
        this.onExit();
      } else {
        this.showStatus(`Error: ${result}`);
      }
    } else if (cmd === 'q!') {
      this.cleanup();
      this.onExit();
    } else {
      this.showStatus(`E492: Not an editor command: :${cmd}`);
    }
  }

  executeVimSearch(text) {
    this.mode = 'NORMAL';
    this.commandText = '';
    this.searchQuery = text;
    if (text) {
      const val = this.textarea.value;
      const start = val.toLowerCase().indexOf(text.toLowerCase(), this.textarea.selectionStart + 1);
      const idx = start !== -1 ? start : val.toLowerCase().indexOf(text.toLowerCase());
      if (idx !== -1) {
        this.textarea.selectionStart = this.textarea.selectionEnd = idx;
        this.showStatus(`Search: /${text}`);
      } else {
        this.showStatus(`Pattern not found: ${text}`);
      }
    }
    this.draw();
  }

  draw() {
    const { rawLines, curLine, curCol, selStart, selEnd, totalLines } = this.getLinesAndCursor();
    const currentVal = this.textarea.value;
    this.isModified = currentVal !== this.content;

    this.adjustScroll(curLine);

    if (this.mode === 'INSERT') {
      this.container.classList.add('vim-insert-mode');
    } else {
      this.container.classList.remove('vim-insert-mode');
    }

    let contentEl = this.container.querySelector('.vim-content');
    let footerEl = this.container.querySelector('.vim-footer');

    if (!contentEl || !footerEl) {
      this.container.innerHTML = `
        <div class="vim-content"></div>
        <div class="vim-footer"></div>
      `;
      contentEl = this.container.querySelector('.vim-content');
      footerEl = this.container.querySelector('.vim-footer');
    }

    const maxVisibleLines = this.maxVisibleLines || 24;
    const startLine = this.scrollTopLine;
    const endLine = Math.min(totalLines, startLine + maxVisibleLines);

    let html = '';
    let currentIdx = 0;
    for (let i = 0; i < startLine; i++) {
      currentIdx += rawLines[i].length + 1; // +1 for \n
    }

    for (let i = startLine; i < endLine; i++) {
      const lineText = rawLines[i];
      const lineNum = String(i + 1).padStart(3, ' ');
      let escaped = this.escapeLine(lineText, currentIdx, selStart, selEnd);
      if (this.searchQuery) {
        escaped = highlightSearchMatches(escaped, this.searchQuery);
      }
      html += `<div class="vim-line"><span class="vim-lnum">${lineNum}</span>${escaped}</div>`;
      currentIdx += lineText.length + 1;
    }

    const visibleLineCount = endLine - startLine;
    for (let i = visibleLineCount; i < maxVisibleLines; i++) {
      html += `<div class="vim-line"><span class="blue">~</span></div>`;
    }
    contentEl.innerHTML = html;

    const changedText = this.isModified ? ' [+]' : '';
    const fileText = ` "${this.filename}"${changedText}`;

    let pctText = 'All';
    if (totalLines > maxVisibleLines) {
      if (startLine === 0) {
        pctText = 'Top';
      } else if (endLine === totalLines) {
        pctText = 'Bot';
      } else {
        pctText = `${Math.round((endLine / totalLines) * 100)}%`;
      }
    }
    const cursorText = `${curLine + 1},${curCol + 1}          ${pctText} `;

    let bottomText = '&nbsp;';
    if (this.mode === 'COMMAND_LINE') {
      bottomText = this.commandText;
    } else if (this.mode === 'INSERT') {
      bottomText = '<span class="color-accent">-- INSERT --</span>';
    } else if (this.statusMessage) {
      bottomText = this.statusMessage;
    }

    let statusBarEl = footerEl.querySelector('.vim-status-bar');
    let commandLineEl = footerEl.querySelector('.vim-command-line');
    if (!statusBarEl || !commandLineEl) {
      footerEl.innerHTML = `
        <div class="vim-status-bar">
          <div class="vim-status-left"></div>
          <div class="vim-status-right"></div>
        </div>
        <div class="vim-command-line"></div>
      `;
      statusBarEl = footerEl.querySelector('.vim-status-bar');
      commandLineEl = footerEl.querySelector('.vim-command-line');
    }

    const statusLeftEl = statusBarEl.querySelector('.vim-status-left');
    const statusRightEl = statusBarEl.querySelector('.vim-status-right');
    
    if (statusLeftEl && statusLeftEl.innerHTML !== fileText) {
      statusLeftEl.innerHTML = fileText;
    }
    if (statusRightEl && statusRightEl.innerHTML !== cursorText) {
      statusRightEl.innerHTML = cursorText;
    }
    if (commandLineEl && commandLineEl.innerHTML !== bottomText) {
      commandLineEl.innerHTML = bottomText;
    }
  }
}

function highlightSearchMatches(htmlStr, query) {
  if (!query) return htmlStr;
  
  const htmlEscapedQuery = query
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const regexEscaped = htmlEscapedQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(regexEscaped, 'gi');
  
  const parts = htmlStr.split(/(<[^>]+>)/g);
  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i]) {
      parts[i] = parts[i].replace(regex, (match) => `<span class="vim-search-match">${match}</span>`);
    }
  }
  return parts.join('');
}
