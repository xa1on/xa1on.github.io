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

    this.selectionHandler = () => {
      if (document.activeElement === this.textarea) {
        this.draw();
      }
    };
  }

  start() {
    this.initDOM('vim-editor');
    this.draw();

    this.textarea.addEventListener('input', () => {
      this.draw();
    });

    this.textarea.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });

    document.addEventListener('selectionchange', this.selectionHandler);
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

  moveCursor(dir) {
    const val = this.textarea.value;
    const nextIdx = Math.max(0, Math.min(val.length, this.textarea.selectionStart + dir));
    this.textarea.selectionStart = nextIdx;
    this.textarea.selectionEnd = nextIdx;
  }

  moveLine(dir) {
    const { lines, curLine, curCol } = this.getLinesAndCursor();
    const targetLine = curLine + dir;

    if (targetLine >= 0 && targetLine < lines.length) {
      const targetCol = Math.min(curCol, lines[targetLine].text.length);
      let newIdx = 0;
      for (let i = 0; i < targetLine; i++) {
        newIdx += lines[i].text.length + 1; // +1 for \n
      }
      newIdx += targetCol;
      this.textarea.selectionStart = newIdx;
      this.textarea.selectionEnd = newIdx;
    }
  }

  handleKeydown(e) {
    const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];
    if (!ignoredKeys.includes(e.key)) {
      audio.playKeyclick(e.key);
    }

    if (this.mode === 'NORMAL') {
      e.preventDefault();
      const key = e.key.toLowerCase();

      if (e.key === 'i' || e.key === 'I') {
        this.mode = 'INSERT';
        this.statusMessage = '';
        this.draw();
        return;
      }

      if (e.key === ':') {
        this.mode = 'COMMAND_LINE';
        this.commandText = ':';
        this.draw();
        return;
      }

      // Cursor movement
      if (e.key === 'ArrowLeft' || key === 'h') {
        this.moveCursor(-1);
      } else if (e.key === 'ArrowRight' || key === 'l') {
        this.moveCursor(1);
      } else if (e.key === 'ArrowDown' || key === 'j') {
        this.moveLine(1);
      } else if (e.key === 'ArrowUp' || key === 'k') {
        this.moveLine(-1);
      }
      this.draw();
      return;
    }

    if (this.mode === 'INSERT') {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.mode = 'NORMAL';
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

      // Add character to command
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
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
  }

  draw() {
    const { lines, curLine, curCol, totalLines } = this.getLinesAndCursor();
    const currentVal = this.textarea.value;
    this.isModified = currentVal !== this.content;

    let html = '<div class="vim-content">';

    // Vim line viewport rendering (max 20 lines)
    const maxVisibleLines = 20;
    const startLine = Math.max(0, curLine - Math.floor(maxVisibleLines / 2));
    const endLine = Math.min(totalLines, startLine + maxVisibleLines);

    for (let i = startLine; i < endLine; i++) {
      const lineNum = String(i + 1).padStart(3, ' ');
      html += `<div class="vim-line"><span class="vim-lnum">${lineNum}</span>${lines[i].html}</div>`;
    }

    // Fill remaining viewport with blue vim tildes (~)
    const visibleLineCount = endLine - startLine;
    for (let i = visibleLineCount; i < maxVisibleLines; i++) {
      html += `<div class="vim-line"><span class="blue">~</span></div>`;
    }

    html += '</div>';

    // Status line info (Inverted bar in Vim)
    const changedText = this.isModified ? ' [+]' : '';
    const fileText = ` "${this.filename}"${changedText}`;

    // Calculate cursor percentage (All, Top, Bot, or XX%)
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

    html += '<div class="vim-footer">';

    // 1. Status Bar (Always present above command line)
    html += `
      <div class="vim-status-bar">
        <div class="vim-status-left">${fileText}</div>
        <div class="vim-status-right">${cursorText}</div>
      </div>
    `;

    // 2. Command Line (Displays mode, status messages, or colon commands)
    let bottomText = '&nbsp;';
    if (this.mode === 'COMMAND_LINE') {
      bottomText = this.commandText;
    } else if (this.mode === 'INSERT') {
      bottomText = '<span class="color-accent">-- INSERT --</span>';
    } else if (this.statusMessage) {
      bottomText = this.statusMessage;
    }

    html += `<div class="vim-command-line">${bottomText}</div>`;
    html += '</div>';

    this.container.innerHTML = html;
  }
}
