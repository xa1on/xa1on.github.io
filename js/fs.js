export const virtualFS = {
  "about.md": "file",
  "contact.md": "file",
  "archive": {
    // ?????
  },
  "projects.md": "file",
  "sokoban": {
    "level1.txt": "file",
    "level2.txt": "file",
    "level3.txt": "file",
    "README.md": "file"
  }
};



function deepMerge(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object') {
      if (!target[key] || typeof target[key] !== 'object') {
        target[key] = {};
      }
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

/**
 * Resolves path array to corresponding nested object or file contents in virtualFS
 */
export function getNodeByPath(vfs, pathArr) {
  let node = vfs;
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
 * Helper to resolve absolute or relative path strings based on current directory
 */
export function resolvePath(vfs, currentPath, pathStr) {
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
  if (getNodeByPath(vfs, target) === null) {
    return null;
  }
  return target;
}

/**
 * Computes the relative path from fromPath array to toPath array.
 */
export function getRelativePath(fromPath, toPath) {
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

export class FileSystem {
  constructor() {
    this.root = JSON.parse(JSON.stringify(virtualFS));
    this.userTree = {};

    // Load user filesystem from localStorage
    try {
      const saved = localStorage.getItem('vfs_user_tree');
      if (saved) {
        this.userTree = JSON.parse(saved);
        deepMerge(this.root, this.userTree);
      }
    } catch (e) {
      console.error('Failed to load user filesystem from localStorage', e);
    }
  }

  isBuiltInPath(pathArr) {
    return getNodeByPath(virtualFS, pathArr) !== null;
  }

  async readFile(pathArr) {
    if (this.isBuiltInPath(pathArr)) {
      const filePath = 'server_root/' + pathArr.join('/');
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } else {
      const node = this.getNodeByPath(pathArr);
      if (node === null) {
        throw new Error('No such file or directory');
      }
      if (typeof node === 'object') {
        throw new Error('Is a directory');
      }
      return node;
    }
  }

  writeFile(pathArr, content) {
    if (pathArr.length === 0) {
      throw new Error('Invalid path');
    }
    if (this.isBuiltInPath(pathArr)) {
      throw new Error('Permission denied: system files are read-only');
    }

    const parentPath = pathArr.slice(0, -1);
    const fileName = pathArr[pathArr.length - 1];

    const rootParent = this.getNodeByPath(parentPath);
    if (!rootParent || typeof rootParent !== 'object') {
      throw new Error('Parent directory does not exist');
    }

    // Update in-memory root tree
    rootParent[fileName] = content;

    // Update userTree
    let userParent = this.userTree;
    for (const part of parentPath) {
      if (!userParent[part] || typeof userParent[part] !== 'object') {
        userParent[part] = {};
      }
      userParent = userParent[part];
    }
    userParent[fileName] = content;

    this.saveUserFS();
  }

  createDirectory(pathArr) {
    if (pathArr.length === 0) {
      throw new Error('Invalid path');
    }
    if (this.isBuiltInPath(pathArr)) {
      throw new Error('Permission denied: cannot overwrite system paths');
    }

    const parentPath = pathArr.slice(0, -1);
    const dirName = pathArr[pathArr.length - 1];

    const rootParent = this.getNodeByPath(parentPath);
    if (!rootParent || typeof rootParent !== 'object') {
      throw new Error('Parent directory does not exist');
    }
    if (rootParent[dirName] !== undefined) {
      if (typeof rootParent[dirName] === 'object') {
        throw new Error('Directory already exists');
      } else {
        throw new Error('A file with that name already exists');
      }
    }

    // Update in-memory root tree
    rootParent[dirName] = {};

    // Update userTree
    let userParent = this.userTree;
    for (const part of parentPath) {
      if (!userParent[part] || typeof userParent[part] !== 'object') {
        userParent[part] = {};
      }
      userParent = userParent[part];
    }
    userParent[dirName] = {};

    this.saveUserFS();
  }

  deleteNode(pathArr) {
    if (pathArr.length === 0) {
      throw new Error('Cannot delete root directory');
    }
    if (this.isBuiltInPath(pathArr)) {
      throw new Error('Permission denied: system paths are read-only');
    }

    // Check recursive nested system files
    const isNestedSystemFile = (node, currentPathArr) => {
      if (!node) return false;
      if (typeof node !== 'object') {
        return this.isBuiltInPath(currentPathArr);
      }
      for (const key of Object.keys(node)) {
        if (isNestedSystemFile(node[key], [...currentPathArr, key])) {
          return true;
        }
      }
      return false;
    };

    const targetNode = this.getNodeByPath(pathArr);
    if (isNestedSystemFile(targetNode, pathArr)) {
      throw new Error('Permission denied: cannot delete directory containing system files');
    }

    const parentPath = pathArr.slice(0, -1);
    const name = pathArr[pathArr.length - 1];

    // Delete from root
    const rootParent = this.getNodeByPath(parentPath);
    if (rootParent && typeof rootParent === 'object') {
      delete rootParent[name];
    }

    // Delete from userTree
    let userParent = this.userTree;
    let found = true;
    for (const part of parentPath) {
      if (userParent[part] && typeof userParent[part] === 'object') {
        userParent = userParent[part];
      } else {
        found = false;
        break;
      }
    }
    if (found && userParent && typeof userParent === 'object') {
      delete userParent[name];
    }

    this.saveUserFS();
  }

  saveUserFS() {
    try {
      localStorage.setItem('vfs_user_tree', JSON.stringify(this.userTree));
    } catch (e) {
      console.error('Failed to save user filesystem to localStorage', e);
    }
  }

  resolveParentAndName(currentPath, pathStr) {
    let cleanPathStr = pathStr.trim();
    while (cleanPathStr.endsWith('/') && cleanPathStr.length > 1) {
      cleanPathStr = cleanPathStr.slice(0, -1);
    }

    if (cleanPathStr === '') {
      return null;
    }

    let parentPathStr = '';
    let name = cleanPathStr;
    const lastSlash = cleanPathStr.lastIndexOf('/');
    if (lastSlash !== -1) {
      parentPathStr = cleanPathStr.slice(0, lastSlash);
      name = cleanPathStr.slice(lastSlash + 1);
      if (parentPathStr === '') {
        parentPathStr = '/';
      }
    }

    const resolvedParent = this.resolvePath(currentPath, parentPathStr);
    if (resolvedParent === null) {
      return null;
    }

    return { resolvedParent, name };
  }

  resolvePath(currentPath, pathStr) {
    return resolvePath(this.root, currentPath, pathStr);
  }
  getNodeByPath(pathArr) {
    return getNodeByPath(this.root, pathArr);
  }
  getRelativePath(fromPath, toPath) {
    return getRelativePath(fromPath, toPath);
  }
}
