/**
 * _store.js — Shared storage helper for Netlify Functions.
 *
 * Backend selection via STORAGE_BACKEND env var:
 *   "blobs"  → Netlify Blobs (durable, auto-authenticated in Lambda)
 *   "kv"     → Cloudflare Workers KV (stub — ready for future implementation)
 *   default  → ephemeral /tmp file-based (legacy / local function testing)
 *
 * Bundled read-only seed data in server/data/ (via netlify.toml included_files)
 * is used as a fallback when a key hasn't been written to durable storage yet.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const BACKEND = process.env.STORAGE_BACKEND || 'file';
const BUNDLED_DIR = join(process.cwd(), 'server', 'data');

// ── Bundled file fallback (shared across all backends) ──────────────

function readBundledJson(filePath) {
  if (!existsSync(filePath)) return null;
  try { return JSON.parse(readFileSync(filePath, 'utf8')); } catch { return null; }
}

// ── Netlify Blobs backend ───────────────────────────────────────────

async function getBlobStore(storeName) {
  const { getStore } = await import('@netlify/blobs');
  return getStore(storeName);
}

const blobsBackend = {
  async readStore(name) {
    try {
      const store = await getBlobStore('brackt');
      const data = await store.get(name, { type: 'json' });
      if (data != null) return data;
    } catch (err) {
      console.warn(`[STORE] Blobs read failed for "${name}":`, err.message);
    }
    return readBundledJson(join(BUNDLED_DIR, `${name}.json`)) ?? {};
  },

  async writeStore(name, data) {
    const store = await getBlobStore('brackt');
    await store.setJSON(name, data);
  },

  async readPipelineFile(subPath) {
    try {
      const store = await getBlobStore('brackt-pipeline');
      const data = await store.get(subPath, { type: 'json' });
      if (data != null) return data;
    } catch (err) {
      console.warn(`[STORE] Blobs pipeline read failed for "${subPath}":`, err.message);
    }
    return readBundledJson(join(BUNDLED_DIR, subPath)) ?? null;
  },

  async writePipelineFile(subPath, data) {
    const store = await getBlobStore('brackt-pipeline');
    await store.setJSON(subPath, data);
  },
};

// ── Cloudflare Workers KV backend (stub) ────────────────────────────

const kvBackend = {
  async readStore() { throw new Error('STORAGE_BACKEND=kv not yet implemented. Wire up Cloudflare KV bindings here.'); },
  async writeStore() { throw new Error('STORAGE_BACKEND=kv not yet implemented.'); },
  async readPipelineFile() { throw new Error('STORAGE_BACKEND=kv not yet implemented.'); },
  async writePipelineFile() { throw new Error('STORAGE_BACKEND=kv not yet implemented.'); },
};

// ── Legacy /tmp file backend (ephemeral) ────────────────────────────

const WRITE_DIR = '/tmp/brackt-data';

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const fileBackend = {
  async readStore(name) {
    return (
      readBundledJson(join(WRITE_DIR, `${name}.json`)) ??
      readBundledJson(join(BUNDLED_DIR, `${name}.json`)) ??
      {}
    );
  },

  async writeStore(name, data) {
    const filePath = join(WRITE_DIR, `${name}.json`);
    ensureDir(filePath);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  },

  async readPipelineFile(subPath) {
    return (
      readBundledJson(join(WRITE_DIR, 'pipeline', subPath)) ??
      readBundledJson(join(BUNDLED_DIR, subPath)) ??
      null
    );
  },

  async writePipelineFile(subPath, data) {
    const filePath = join(WRITE_DIR, 'pipeline', subPath);
    ensureDir(filePath);
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  },
};

// ── Select backend ─────────────────────────────────────────────────

const backend =
  BACKEND === 'blobs' ? blobsBackend :
  BACKEND === 'kv' ? kvBackend :
  fileBackend;

// ── Public API (async — all backends return promises) ───────────────

export function readStore(name) {
  return backend.readStore(name);
}

export function writeStore(name, data) {
  return backend.writeStore(name, data);
}

export function readPipelineFile(subPath) {
  return backend.readPipelineFile(subPath);
}

export function writePipelineFile(subPath, data) {
  return backend.writePipelineFile(subPath, data);
}
