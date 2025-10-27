/*
Normalize images script (dev-only).
- Re-encodes PNG/JPG images under assets/images using Jimp to remove exotic profiles / interlacing.
- Renames files to lowercase and replaces spaces with underscores.

Usage:
  1) Install dependencies: npm install jimp glob
  2) Run: node ./scripts/normalize-images.js

This is intended for local development. Always commit or stash before running.
*/

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const glob = require('glob');

const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');

function toSafeName(name) {
  return name
    .replace(/\s+/g, '_')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
}

async function processFile(file) {
  const ext = path.extname(file).toLowerCase();
  const dir = path.dirname(file);
  const base = path.basename(file);
  const safeBase = toSafeName(base);
  const safePath = path.join(dir, safeBase);

  try {
    const image = await Jimp.read(file);
    // Force sRGB-ish by re-encoding via Jimp
    if (ext === '.jpg' || ext === '.jpeg') {
      await image.quality(90).writeAsync(safePath);
    } else {
      // PNG: write as non-interlaced PNG
      await image.rgba(true).writeAsync(safePath);
    }

    if (safePath !== file) {
      try { fs.unlinkSync(file); } catch (e) { /* ignore */ }
      console.log(`Renamed + normalized: ${base} -> ${safeBase}`);
    } else {
      console.log(`Normalized: ${base}`);
    }
  } catch (err) {
    console.error(`Failed to process ${file}:`, err.message || err);
  }
}

async function main() {
  if (!fs.existsSync(IMAGES_DIR)) {
    console.error('images dir not found:', IMAGES_DIR);
    process.exit(1);
  }

  const pattern = path.join(IMAGES_DIR, '**', '*.{png,jpg,jpeg}');
  const files = glob.sync(pattern, { nocase: true });
  if (!files.length) { console.log('No image files found.'); return; }

  console.log(`Found ${files.length} images. Processing...`);
  for (const f of files) {
    await processFile(f);
  }
  console.log('Done. Please run `npx expo start -c` and then re-run your build.');
}

main();
