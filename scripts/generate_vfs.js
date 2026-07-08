const fs = require('fs');
const path = require('path');
const { buildVfsTree, generateManifestContent, generateCommandsIndexContent } = require('./cache_buster.js');

async function main() {
  // 1. Generate Virtual File System Manifest
  const vfsTree = buildVfsTree('.');
  const manifestContent = generateManifestContent(vfsTree);

  const destDir = path.join('js');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.writeFileSync(path.join(destDir, 'fs_manifest.js'), manifestContent, 'utf8');
  console.log('Virtual File System manifest generated successfully in js/fs_manifest.js');

  // 2. Generate Commands Index
  const indexContent = await generateCommandsIndexContent();
  const commandsDir = path.join(destDir, 'commands');
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(commandsDir, 'index.js'), indexContent, 'utf8');
  console.log('Commands index generated successfully in js/commands/index.js');
}

main().catch(console.error);
