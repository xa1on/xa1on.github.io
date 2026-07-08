const fs = require('fs');
const path = require('path');
const { buildVfsTree, generateManifestContent, generateCommandsIndexContent, generateBuddiesListContent } = require('./cache_buster.js');

async function main() {
  const destDir = path.join('js');
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // 1. Generate Buddies List (must be done first as commands import it)
  const buddiesContent = generateBuddiesListContent();
  fs.writeFileSync(path.join(destDir, 'buddies.js'), buddiesContent, 'utf8');
  console.log('Buddies list generated successfully in js/buddies.js');

  // 2. Generate Commands Index
  const indexContent = await generateCommandsIndexContent();
  const commandsDir = path.join(destDir, 'commands');
  if (!fs.existsSync(commandsDir)) {
    fs.mkdirSync(commandsDir, { recursive: true });
  }
  fs.writeFileSync(path.join(commandsDir, 'index.js'), indexContent, 'utf8');
  console.log('Commands index generated successfully in js/commands/index.js');

  // 3. Generate Virtual File System Manifest
  const vfsTree = buildVfsTree('.');
  const manifestContent = generateManifestContent(vfsTree);
  fs.writeFileSync(path.join(destDir, 'fs_manifest.js'), manifestContent, 'utf8');
  console.log('Virtual File System manifest generated successfully in js/fs_manifest.js');
}

main().catch(console.error);
