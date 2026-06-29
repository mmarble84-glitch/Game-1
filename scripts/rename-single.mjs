/**
 * After a single-file build, copy dist/index.html to dist/ORBIS.html so the
 * deliverable has an obvious, drag-and-drop-friendly name.
 */
import { copyFileSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'dist/index.html');
const dest = resolve(root, 'dist/ORBIS.html');

if (!existsSync(src)) {
  console.error('Single-file build output not found at', src);
  process.exit(1);
}
copyFileSync(src, dest);
const kb = (statSync(dest).size / 1024).toFixed(0);
console.log(`Wrote standalone ORBIS.html (${kb} kB) -> ${dest}`);
