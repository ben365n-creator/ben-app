const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const screenshotsDir = 'C:\\Users\\Benjamin-Pers\\AppData\\Roaming\\Microsoft\\Windows\\Screenshots';

if (!fs.existsSync(screenshotsDir)) {
  console.error(`Error: Directory not found: ${screenshotsDir}`);
  process.exit(1);
}

console.log(`Watching ${screenshotsDir} for new IMG_*.PNG files...`);
console.log('Press Ctrl+C to stop.\n');

const processed = new Set();

fs.watch(screenshotsDir, (eventType, filename) => {
  if (eventType === 'rename' && filename && filename.match(/^IMG_\d+\.PNG$/i)) {
    setTimeout(() => {
      const filePath = path.join(screenshotsDir, filename);
      if (processed.has(filename) || !fs.existsSync(filePath) || filename.includes('_small')) return;
      processed.add(filename);

      const baseName = filename.replace(/\.PNG$/i, '');
      const outputFile = `${baseName}_small.PNG`;
      const outputPath = path.join(screenshotsDir, outputFile);

      if (fs.existsSync(outputPath)) {
        console.log(`⏭️  ${filename} → ${outputFile} (already exists)`);
        return;
      }

      try {
        console.log(`⏳ Compressing ${filename}...`);
        execSync(`magick "${filePath}" -resize 50% "${outputPath}"`, { stdio: 'pipe' });
        console.log(`✅ ${filename} → ${outputFile}\n`);
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
        processed.delete(filename);
      }
    }, 500);
  }
});

process.on('SIGINT', () => {
  console.log('\n\nStopped. Goodbye!');
  process.exit(0);
});
