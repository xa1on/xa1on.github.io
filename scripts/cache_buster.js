const fs = require('fs');
const crypto = require('crypto');
const pathModule = require('path');

// Recursively find files
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = pathModule.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      if (file !== '.git' && file !== 'node_modules' && file !== 'scripts') {
        getFiles(name, fileList);
      }
    } else {
      if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css')) {
        fileList.push(pathModule.relative('.', name).replace(/\\/g, '/'));
      }
    }
  }
  return fileList;
}

function getHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 10);
}

function resolveImportPath(sourceFile, importPath) {
  const cleanImportPath = importPath.split('?')[0];
  const dir = pathModule.dirname(sourceFile);
  const resolved = pathModule.resolve(dir, cleanImportPath);
  return pathModule.relative('.', resolved).replace(/\\/g, '/');
}

const files = getFiles('.');

// Initialize file hashes with raw contents
const fileHashes = {};
const fileContents = {};

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  fileContents[file] = content;
  fileHashes[file] = getHash(content);
}

// Iterative hash propagation
let iterations = 0;
const MAX_ITERATIONS = 10;
let stable = false;

while (!stable && iterations < MAX_ITERATIONS) {
  stable = true;
  iterations++;

  for (const file of files) {
    let content = fileContents[file];
    let originalContent = content;

    if (file.endsWith('.html')) {
      // Replace CSS references
      content = content.replace(/(href=["'])(css\/.*?\.css)(?:\?v=[^"']*)?(["'])/g, (match, p1, p2, p3) => {
        const targetPath = resolveImportPath(file, p2);
        const hash = fileHashes[targetPath] || '';
        return `${p1}${p2}?v=${hash}${p3}`;
      });
      // Replace JS references
      content = content.replace(/(src=["'])(js\/.*?\.js)(?:\?v=[^"']*)?(["'])/g, (match, p1, p2, p3) => {
        const targetPath = resolveImportPath(file, p2);
        const hash = fileHashes[targetPath] || '';
        return `${p1}${p2}?v=${hash}${p3}`;
      });
    } else if (file.endsWith('.js')) {
      // Replace static imports
      content = content.replace(/(from\s+['"])((?:\.|\/|\.\.)\/.*?\.js)(?:\?v=[^'"]*)?(['"])/g, (match, p1, p2, p3) => {
        const targetPath = resolveImportPath(file, p2);
        const hash = fileHashes[targetPath] || '';
        return `${p1}${p2}?v=${hash}${p3}`;
      });
      // Replace dynamic imports
      content = content.replace(/(import\(['"])((?:\.|\/|\.\.)\/.*?\.js)(?:\?v=[^'"]*)?(['"]\))/g, (match, p1, p2, p3) => {
        const targetPath = resolveImportPath(file, p2);
        const hash = fileHashes[targetPath] || '';
        return `${p1}${p2}?v=${hash}${p3}`;
      });
    }

    if (content !== originalContent) {
      fileContents[file] = content;
      const newHash = getHash(content);
      if (newHash !== fileHashes[file]) {
        fileHashes[file] = newHash;
        stable = false; // Trigger another pass to propagate this file's updated hash to its importers
      }
    }
  }
}

const isCI = process.env.CI || process.env.GITHUB_ACTIONS || process.argv.includes('--write');

if (isCI) {
  // Write the fully updated contents to disk
  for (const file of files) {
    fs.writeFileSync(file, fileContents[file], 'utf8');
  }
  console.log(`Cache busted successfully using content hashes in ${iterations} passes.`);
} else {
  console.log(`[Dry Run] Cache buster calculated content hashes in ${iterations} passes.`);
  console.log(`Local run detected: files were NOT modified on disk.`);
  console.log(`To write these changes to your local files, run: node scripts/cache_buster.js --write`);
}
