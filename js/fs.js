export const virtualFS = {
  "about.md": "file",
  "contact.md": "file",
  "archive": {
    // ????
  },
  "projects.md": "file"
};

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
    this.root = virtualFS;
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
