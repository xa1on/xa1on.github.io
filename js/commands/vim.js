import { BaseEditor } from '../utils/editor.js';
import { audio } from '../audio.js';

export const vim = {
  helpText: 'Edit a file using Vim.',
  run: async (args, shell) => {
    if (args.length === 0) {
      shell.print('vim: missing filename operand. Usage: vim [filename]', 'color-error');
      return;
    }

    let fileArg = args[0].trim();
    while (fileArg.endsWith('/') && fileArg.length > 1) {
      fileArg = fileArg.slice(0, -1);
    }
    let resolved = shell.fileSystem.resolvePath(shell.currentPath, fileArg);
    let initialContent = '';
    let isNewFile = false;

    if (resolved === null) {
      // Resolve parent path for potential new file
      let parentPathStr = '';
      let name = fileArg;
      const lastSlash = fileArg.lastIndexOf('/');
      if (lastSlash !== -1) {
        parentPathStr = fileArg.slice(0, lastSlash);
        name = fileArg.slice(lastSlash + 1);
        if (parentPathStr === '') {
          parentPathStr = '/';
        }
      }

      const resolvedParent = shell.fileSystem.resolvePath(shell.currentPath, parentPathStr);
      if (resolvedParent === null) {
        shell.print(`vim: cannot open '${fileArg}': No such file or directory`, 'color-error');
        return;
      }
      resolved = [...resolvedParent, name];
      isNewFile = true;
    } else {
      const node = shell.fileSystem.getNodeByPath(resolved);
      if (node && typeof node === 'object') {
        shell.print(`vim: '${fileArg}' is a directory`, 'color-error');
        return;
      }
      try {
        initialContent = await shell.fileSystem.readFile(resolved);
      } catch (err) {
        shell.print(`vim: error reading '${fileArg}': ${err.message}`, 'color-error');
        return;
      }
    }

    return new Promise((resolve) => {
      const onSave = (content) => {
        try {
          shell.fileSystem.writeFile(resolved, content);
          return true;
        } catch (err) {
          return err.message;
        }
      };

      const onExit = () => {
        resolve();
      };

      const editor = new VimEditor(shell, fileArg, initialContent, resolved, onSave, onExit, isNewFile);
      editor.start();
    });
  }
};

class VimEditor extends BaseEditor {
  constructor(shell, filename, initialContent, resolvedPath, onSave, onExit, isNewFile) {
    super(shell, filename, initialContent, onSave, onExit);
    this.resolvedPath = resolvedPath;
    this.isNewFile = isNewFile;

    // Modes: 'NORMAL', 'INSERT', 'COMMAND_LINE'
    this.mode = 'NORMAL';
    this.commandText = '';
    this.statusMessage = isNewFile ? `"${filename}" [New File]` : `"${filename}"`;
    this.statusTimeout = null;
    this.scrollTopLine = 0;
    this.undoStack = [];
    this.textBeforeInsert = null;
    this.lastKeyPressed = '';

    this.lastSelectionStart = null;
    this.lastSelectionEnd = null;

    this.selectionHandler = () => {
      if (document.activeElement === this.textarea) {
        const selStart = this.textarea.selectionStart;
        const selEnd = this.textarea.selectionEnd;
        if (selStart !== this.lastSelectionStart || selEnd !== this.lastSelectionEnd) {
          this.lastSelectionStart = selStart;
          this.lastSelectionEnd = selEnd;
          this.draw();
        }
      }
    };
  }

  start() {
    this.initDOM('vim-editor');
    this.measureLayout();
    this.draw();

    this.textarea.addEventListener('input', () => {
      this.draw();
    });

    this.textarea.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    document.addEventListener('selectionchange', this.selectionHandler);

    this.resizeObserver = new ResizeObserver(() => {
      this.measureLayout();
      this.draw();
    });
    this.resizeObserver.observe(this.container);
  }

  measureLayout() {
    const contentEl = this.container ? this.container.querySelector('.vim-content') : null;
    if (contentEl) {
      const rect = contentEl.getBoundingClientRect();
      let testLine = contentEl.querySelector('.vim-line');
      let createdTestLine = false;
      if (!testLine) {
        testLine = document.createElement('div');
        testLine.className = 'vim-line';
        testLine.innerHTML = '<span class="vim-lnum">  1</span><span>&nbsp;</span>';
        contentEl.appendChild(testLine);
        createdTestLine = true;
      }
      const lineHeight = testLine.getBoundingClientRect().height;
      if (createdTestLine) {
        testLine.remove();
      }
      if (rect.height > 0 && lineHeight > 0) {
        this.maxVisibleLines = Math.floor((rect.height - 10) / (lineHeight + 1));
      }
    }
    if (!this.maxVisibleLines || this.maxVisibleLines <= 0) {
      this.maxVisibleLines = 24;
    }
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
        newIdx += rawLines[i].length + 1; // +1 for \n
      }
      newIdx += targetCol;
      this.textarea.selectionStart = newIdx;
      this.textarea.selectionEnd = newIdx;
    }
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

  adjustScroll(curLine) {
    const maxVisibleLines = this.maxVisibleLines || 24;
    const { totalLines } = this.getLinesAndCursor();
    if (curLine < this.scrollTopLine) {
      this.scrollTopLine = curLine;
    } else if (curLine >= this.scrollTopLine + maxVisibleLines) {
      this.scrollTopLine = curLine - maxVisibleLines + 1;
    }
    if (this.scrollTopLine + maxVisibleLines > totalLines) {
      this.scrollTopLine = Math.max(0, totalLines - maxVisibleLines);
    }
  }

  handleKeydown(e) {
    const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];
    if (!ignoredKeys.includes(e.key) && !e.repeat) {
      audio.playKeyclick(e.key);
    }

    if (this.mode === 'NORMAL') {
      e.preventDefault();
      const key = e.key;

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

      // Cursor movement
      const lowerKey = key.toLowerCase();
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

      if (key !== 'g' && key !== 'd') {
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
        
        const { rawLines, curLine, curCol } = this.getLinesAndCursor();
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
        const cmd = this.commandText.slice(1).trim(); // Strip ':'
        this.executeVimCommand(cmd);
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

  cleanup() {
    super.cleanup();
    document.removeEventListener('selectionchange', this.selectionHandler);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
  }

  draw() {
    const { rawLines, curLine, curCol, selStart, selEnd, totalLines } = this.getLinesAndCursor();
    const currentVal = this.textarea.value;
    this.isModified = currentVal !== this.content;

    this.adjustScroll(curLine);

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
      const escaped = this.escapeLine(lineText, currentIdx, selStart, selEnd);
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

    footerEl.innerHTML = `
      <div class="vim-status-bar">
        <div class="vim-status-left">${fileText}</div>
        <div class="vim-status-right">${cursorText}</div>
      </div>
      <div class="vim-command-line">${bottomText}</div>
    `;
  }
}

