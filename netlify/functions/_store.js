/**
 * _store.js — Shared file-based storage helper for Netlify Functions.
 *
 * On Netlify Lambda, process.cwd() = /var/task (project root).
 * - Bundled read-only data lives at /var/task/server/data/ (via included_files in netlify.toml).
 * - Writable temp storage uses /tmp/brackt-data/ (ephemeral within warm Lambda instances).
 *
 * On localhost (Express handles /api/* directly — these functions never run).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const WRITE_DIR = '/tmp/brackt-data';
const BUNDLED_DIR = join(process.cwd(), 'server', 'data');

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJson(filePath) {
  if (!existsSync(filePath)) return null;
  try { return JSON.parse(readFileSync(filePath, 'utf8')); } catch { return null; }
}

/** Read a top-level store file (e.g. 'draft-state' → draft-state.json) */
export function readStore(name) {
  return (
    readJson(join(WRITE_DIR, `${name}.json`)) ??
    readJson(join(BUNDLED_DIR, `${name}.json`)) ??
    {}
  );
}

/** Write a top-level store file */
export function writeStore(name, data) {
  const filePath = join(WRITE_DIR, `${name}.json`);
  ensureDir(filePath);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/**
 * Read pipeline data. subPath is relative within server/data/, e.g.:
 *   'live/nfl.json', 'historical/nfl.json', 'live/manifest.json'
 */
export function readPipelineFile(subPath) {
  return (
    readJson(join(WRITE_DIR, 'pipeline', subPath)) ??
    readJson(join(BUNDLED_DIR, subPath)) ??
    null
  );
}

/** Write pipeline data to /tmp/brackt-data/pipeline/{subPath} */
export function writePipelineFile(subPath, data) {
  const filePath = join(WRITE_DIR, 'pipeline', subPath);
  ensureDir(filePath);
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}
