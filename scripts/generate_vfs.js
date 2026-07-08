const fs = require('fs');
const path = require('path');
const { buildVfsTree, generateManifestContent } = require('./cache_buster.js');

const vfsTree = buildVfsTree('.');
const outputContent = generateManifestContent(vfsTree);

const destDir = path.join('js');
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}
fs.writeFileSync(path.join(destDir, 'fs_manifest.js'), outputContent, 'utf8');
console.log('Virtual File System manifest generated successfully in js/fs_manifest.js');
