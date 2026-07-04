import { BaseEditor } from '../utils/editor.js';
import { audio } from '../audio.js';

export const nano = {
  helpText: 'Edit a file using GNU nano.',
  run: async (args, shell) => {
    if (args.length === 0) {
      shell.print('nano: missing filename operand. Usage: nano [filename]', 'color-error');
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
      // Resolve parent path for a potential new file
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
        shell.print(`nano: cannot open '${fileArg}': No such file or directory`, 'color-error');
        return;
      }
      resolved = [...resolvedParent, name];
      isNewFile = true;
    } else {
      const node = shell.fileSystem.getNodeByPath(resolved);
      if (node && typeof node === 'object') {
        shell.print(`nano: '${fileArg}' is a directory`, 'color-error');
        return;
      }
      try {
        initialContent = await shell.fileSystem.readFile(resolved);
      } catch (err) {
        shell.print(`nano: error reading '${fileArg}': ${err.message}`, 'color-error');
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

      const editor = new NanoEditor(shell, fileArg, initialContent, resolved, onSave, onExit);
      editor.start();
    });
  }
};

class NanoEditor extends BaseEditor {
  constructor(shell, filename, initialContent, resolvedPath, onSave, onExit) {
    super(shell, filename, initialContent, onSave, onExit);
    this.resolvedPath = resolvedPath;
    this.isPromptingSave = false;
    this.statusMessage = '';
    this.statusTimeout = null;
    this.cutBuffer = '';

    this.selectionHandler = () => {
      if (document.activeElement === this.textarea) {
        this.draw();
      }
    };
  }

  start() {
    this.initDOM('nano-editor');
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
    }, 3000);
  }

  handleKeydown(e) {
    const ignoredKeys = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Escape'];
    if (!ignoredKeys.includes(e.key)) {
      audio.playKeyclick(e.key);
    }

    const key = e.key.toLowerCase();

    if (this.isPromptingSave) {
      e.preventDefault();
      const val = key;
      if (val === 'y') {
        const result = this.onSave(this.textarea.value);
        if (result === true) {
          this.cleanup();
          this.onExit();
        } else {
          this.isPromptingSave = false;
          this.showStatus(result);
        }
      } else if (val === 'n') {
        this.cleanup();
        this.onExit();
      } else if (e.ctrlKey && val === 'c') {
        this.isPromptingSave = false;
        this.draw();
      }
      return;
    }

    // Ctrl+O Save
    if (e.ctrlKey && key === 'o') {
      e.preventDefault();
      const result = this.onSave(this.textarea.value);
      if (result === true) {
        this.content = this.textarea.value;
        this.isModified = false;
        this.showStatus('Wrote file to virtual filesystem.');
      } else {
        this.showStatus(result);
      }
      return;
    }

    // Ctrl+X Exit
    if (e.ctrlKey && key === 'x') {
      e.preventDefault();
      const currentVal = this.textarea.value;
      if (currentVal !== this.content) {
        this.isPromptingSave = true;
        this.draw();
      } else {
        this.cleanup();
        this.onExit();
      }
      return;
    }

    // Ctrl+K Cut Line
    if (e.ctrlKey && key === 'k') {
      e.preventDefault();
      const val = this.textarea.value;
      const selStart = this.textarea.selectionStart;
      const lines = val.split('\n');
      let currentIdx = 0;
      let curLine = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const lineEndIdx = currentIdx + lines[i].length;
        if (selStart >= currentIdx && selStart <= lineEndIdx + 1) {
          curLine = i;
          break;
        }
        currentIdx = lineEndIdx + 1;
      }

      this.cutBuffer = lines[curLine] + '\n';
      lines.splice(curLine, 1);
      if (lines.length === 0) lines.push('');
      
      this.textarea.value = lines.join('\n');
      
      // Keep cursor at start of line
      let newIdx = 0;
      for (let i = 0; i < curLine && i < lines.length; i++) {
        newIdx += lines[i].length + 1;
      }
      this.textarea.selectionStart = this.textarea.selectionEnd = newIdx;
      this.draw();
      this.showStatus('Cut 1 line');
      return;
    }

    // Ctrl+U Paste Line
    if (e.ctrlKey && key === 'u') {
      e.preventDefault();
      if (this.cutBuffer) {
        const val = this.textarea.value;
        const selStart = this.textarea.selectionStart;
        this.textarea.value = val.slice(0, selStart) + this.cutBuffer + val.slice(selStart);
        this.textarea.selectionStart = this.textarea.selectionEnd = selStart + this.cutBuffer.length;
        this.draw();
      }
      return;
    }

    // Ctrl+G Help
    if (e.ctrlKey && key === 'g') {
      e.preventDefault();
      alert(`GNU Nano Shortcuts Help:
  Ctrl+G: Show Help
  Ctrl+O: Save File (Write Out)
  Ctrl+R: Read & Insert File
  Ctrl+X: Exit Nano
  Ctrl+K: Cut Line
  Ctrl+U: Paste Line
  Ctrl+W: Search Text (Where Is)
  Ctrl+C: Show Location
  Ctrl+/: Go to Line`);
      return;
    }

    // Ctrl+W Where Is (Search)
    if (e.ctrlKey && key === 'w') {
      e.preventDefault();
      const query = prompt("Search for:");
      if (query) {
        const val = this.textarea.value;
        const start = val.indexOf(query, this.textarea.selectionStart);
        const idx = start !== -1 ? start : val.indexOf(query); // Search from start if not found after cursor
        if (idx !== -1) {
          this.textarea.selectionStart = idx;
          this.textarea.selectionEnd = idx + query.length;
          this.draw();
        } else {
          this.showStatus(`"${query}" not found`);
        }
      }
      return;
    }

    // Ctrl+R Read File (Insert File)
    if (e.ctrlKey && key === 'r') {
      e.preventDefault();
      const pathArg = prompt("Insert file:");
      if (pathArg) {
        const resolved = this.shell.fileSystem.resolvePath(this.shell.currentPath, pathArg);
        if (resolved) {
          this.shell.fileSystem.readFile(resolved).then(fileContent => {
            const val = this.textarea.value;
            const selStart = this.textarea.selectionStart;
            this.textarea.value = val.slice(0, selStart) + fileContent + val.slice(selStart);
            this.textarea.selectionStart = this.textarea.selectionEnd = selStart + fileContent.length;
            this.draw();
            this.showStatus(`Inserted file ${pathArg}`);
          }).catch(err => {
            this.showStatus(`Error: ${err.message}`);
          });
        } else {
          this.showStatus("File not found");
        }
      }
      return;
    }

    // Ctrl+C Location Info
    if (e.ctrlKey && key === 'c') {
      e.preventDefault();
      const { curLine, curCol, totalLines, totalChars } = this.getLinesAndCursor();
      const val = this.textarea.value;
      const lines = val.split('\n');
      const lineLen = lines[curLine] ? lines[curLine].length : 0;
      const charIdx = this.textarea.selectionStart;

      const linePct = totalLines > 0 ? Math.round(((curLine + 1) / totalLines) * 100) : 0;
      const colPct = lineLen > 0 ? Math.round(((curCol + 1) / (lineLen + 1)) * 100) : 0;
      const charPct = totalChars > 0 ? Math.round((charIdx / totalChars) * 100) : 0;

      const msg = `line ${curLine + 1}/${totalLines} (${linePct}%), col ${curCol + 1}/${lineLen + 1} (${colPct}%), char ${charIdx}/${totalChars} (${charPct}%)`;
      this.showStatus(msg);
      return;
    }

    // Ctrl+/ Go To Line
    if (e.ctrlKey && key === '/') {
      e.preventDefault();
      const lineNumStr = prompt("Enter line number:");
      if (lineNumStr) {
        const targetLine = parseInt(lineNumStr, 10) - 1;
        const lines = this.textarea.value.split('\n');
        if (targetLine >= 0 && targetLine < lines.length) {
          let newIdx = 0;
          for (let i = 0; i < targetLine; i++) {
            newIdx += lines[i].length + 1;
          }
          this.textarea.selectionStart = this.textarea.selectionEnd = newIdx;
          this.draw();
        } else {
          this.showStatus("Invalid line number");
        }
      }
      return;
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

    const modifiedText = this.isModified ? 'Modified' : '';
    let html = `
      <div class="nano-header">
        <span>GNU nano 6.7</span>
        <span>${this.filename}</span>
        <span>${modifiedText}</span>
      </div>
    `;

    html += '<div class="nano-content">';

    // Display window constraints
    const maxVisibleLines = 18;
    const startLine = Math.max(0, curLine - Math.floor(maxVisibleLines / 2));
    const endLine = Math.min(totalLines, startLine + maxVisibleLines);

    for (let i = startLine; i < endLine; i++) {
      const isCurrent = i === curLine;
      const lineNum = String(i + 1).padStart(3, ' ');
      html += `<div class="nano-line ${isCurrent ? 'nano-line-active' : ''}"><span class="color-dim">${lineNum} │ </span>${lines[i].html}</div>`;
    }
    html += '</div>';

    // Status message or legend
    if (this.statusMessage) {
      html += `<div class="nano-status color-accent">${this.statusMessage}</div>`;
    } else if (this.isPromptingSave) {
      html += `<div class="nano-prompt color-accent">Save modified buffer? (Answering "No" will DISCARD changes.) [y/n/ctrl+c] </div>`;
    } else {
      html += `
        <div class="nano-footer">
          <div class="nano-shortcuts-grid">
            <div class="nano-shortcut"><span class="nano-key">^G</span><span class="nano-desc">Help</span></div>
            <div class="nano-shortcut"><span class="nano-key">^O</span><span class="nano-desc">Write Out</span></div>
            <div class="nano-shortcut"><span class="nano-key">^W</span><span class="nano-desc">Where Is</span></div>
            <div class="nano-shortcut"><span class="nano-key">^K</span><span class="nano-desc">Cut</span></div>
            <div class="nano-shortcut"><span class="nano-key">^T</span><span class="nano-desc">Execute</span></div>
            <div class="nano-shortcut"><span class="nano-key">^C</span><span class="nano-desc">Location</span></div>
            <div class="nano-shortcut"><span class="nano-key">M-U</span><span class="nano-desc">Undo</span></div>
            <div class="nano-shortcut"><span class="nano-key">M-A</span><span class="nano-desc">Set Mark</span></div>
            <div class="nano-shortcut"><span class="nano-key">^X</span><span class="nano-desc">Exit</span></div>
            <div class="nano-shortcut"><span class="nano-key">^R</span><span class="nano-desc">Read File</span></div>
            <div class="nano-shortcut"><span class="nano-key">^\\</span><span class="nano-desc">Replace</span></div>
            <div class="nano-shortcut"><span class="nano-key">^U</span><span class="nano-desc">Paste</span></div>
            <div class="nano-shortcut"><span class="nano-key">^J</span><span class="nano-desc">Justify</span></div>
            <div class="nano-shortcut"><span class="nano-key">^/</span><span class="nano-desc">Go To Line</span></div>
            <div class="nano-shortcut"><span class="nano-key">M-E</span><span class="nano-desc">Redo</span></div>
            <div class="nano-shortcut"><span class="nano-key">M-6</span><span class="nano-desc">Copy</span></div>
          </div>
        </div>
      `;
    }

    this.container.innerHTML = html;
  }
}
