#!/usr/bin/env node
/**
 * scripts/seed-kv.js
 * Uploads all local server/data/ files to Cloudflare KV (BRACKT_KV).
 * Run: node scripts/seed-kv.js
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const KV_BINDING = 'f6bda5e8d29e4905b99933566bc6def1'; // BRACKT_KV namespace ID
const DATA_DIR   = new URL('../server/data', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

const pairs = [];

// Store files (store:{name})
const storeFiles = [
  'draft-state', 'manual-odds', 'app-settings',
  'research-data', 'social-scores', 'subjective-data',
];
for (const name of storeFiles) {
  const path = join(DATA_DIR, `${name}.json`);
  if (!existsSync(path)) continue;
  pairs.push({ key: `store:${name}`, value: readFileSync(path, 'utf8') });
  console.log(`  store:${name}`);
}

// Live pipeline files (pipeline:live/{sport}.json)
const liveDir = join(DATA_DIR, 'live');
if (existsSync(liveDir)) {
  for (const file of readdirSync(liveDir).filter(f => f.endsWith('.json'))) {
    pairs.push({ key: `pipeline:live/${file}`, value: readFileSync(join(liveDir, file), 'utf8') });
    console.log(`  pipeline:live/${file}`);
  }
}

// Historical pipeline files (pipeline:historical/{sport}.json)
const histDir = join(DATA_DIR, 'historical');
if (existsSync(histDir)) {
  for (const file of readdirSync(histDir).filter(f => f.endsWith('.json'))) {
    pairs.push({ key: `pipeline:historical/${file}`, value: readFileSync(join(histDir, file), 'utf8') });
    console.log(`  pipeline:historical/${file}`);
  }
}

if (pairs.length === 0) {
  console.error('No files found to upload.');
  process.exit(1);
}

// Write temp bulk file and upload
import { writeFileSync, unlinkSync } from 'fs';
const tmpFile = join(DATA_DIR, '../.kv-seed-tmp.json');
writeFileSync(tmpFile, JSON.stringify(pairs));

console.log(`\nUploading ${pairs.length} keys to BRACKT_KV...`);
try {
  execSync(
    `npx wrangler kv bulk put --namespace-id=${KV_BINDING} --remote "${tmpFile}"`,
    { stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') }
  );
  console.log('\nDone!');
} finally {
  unlinkSync(tmpFile);
}
