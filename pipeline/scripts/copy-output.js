/**
 * Copy pipeline output to public/data/ for Vite to serve.
 * Run with: node pipeline/scripts/copy-output.js
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PIPELINE_OUTPUT = path.join(__dirname, '..', 'output');
const PUBLIC_DATA = path.join(__dirname, '..', '..', 'public', 'data');

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    // Skip hidden dirs like .raw and logs
    if (entry.name.startsWith('.') || entry.name === 'logs') continue;

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else if (entry.name.endsWith('.json')) {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function main() {
  console.log(`Copying pipeline output → public/data/`);
  console.log(`  Source: ${PIPELINE_OUTPUT}`);
  console.log(`  Dest:   ${PUBLIC_DATA}`);

  try {
    await copyDir(PIPELINE_OUTPUT, PUBLIC_DATA);
    console.log('Done.');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('No pipeline output found — skipping copy.');
    } else {
      throw error;
    }
  }
}

main();
