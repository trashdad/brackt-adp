import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readStore, writeStore } from './store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_OUTPUT = join(__dirname, '..', 'pipeline', 'output');
const PROJECT_ROOT = join(__dirname, '..');

// In-memory pipeline run state (reset on server restart)
let pipelineState = { running: false, sources: {}, lastRun: null };

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ── Manual Odds ──────────────────────────────────────────────────────────────
// GET  /api/manual-odds        → return full manual odds dict
// POST /api/manual-odds        → replace full manual odds dict (body = new dict)

app.get('/api/manual-odds', (_req, res) => {
  res.json(readStore('manual-odds'));
});

app.post('/api/manual-odds', (req, res) => {
  if (typeof req.body !== 'object' || req.body === null) {
    return res.status(400).json({ error: 'Expected JSON object' });
  }
  writeStore('manual-odds', req.body);
  res.json({ ok: true });
});

// ── Draft State ───────────────────────────────────────────────────────────────
// GET  /api/draft-state        → return full draft state dict
// POST /api/draft-state        → replace full draft state dict

app.get('/api/draft-state', (_req, res) => {
  res.json(readStore('draft-state'));
});

app.post('/api/draft-state', (req, res) => {
  if (typeof req.body !== 'object' || req.body === null) {
    return res.status(400).json({ error: 'Expected JSON object' });
  }
  writeStore('draft-state', req.body);
  res.json({ ok: true });
});

// ── Pipeline Data Serving ─────────────────────────────────────────────────────
// Serve pipeline output files directly so the frontend doesn't need a manual copy step.

const SAFE_ID_PATTERN = /^[a-z0-9_-]+$/i;

function readPipelineJson(filePath) {
  if (!existsSync(filePath)) return null;
  try { return JSON.parse(readFileSync(filePath, 'utf8')); } catch { return null; }
}

app.get('/api/pipeline/manifest', (_req, res) => {
  const data = readPipelineJson(join(PIPELINE_OUTPUT, 'live', 'manifest.json'));
  data ? res.json(data) : res.status(404).json(null);
});

app.get('/api/pipeline/live/:sportId', (req, res) => {
  if (!SAFE_ID_PATTERN.test(req.params.sportId)) {
    return res.status(400).json({ error: 'Invalid sport ID' });
  }
  const data = readPipelineJson(join(PIPELINE_OUTPUT, 'live', `${req.params.sportId}.json`));
  data ? res.json(data) : res.status(404).json(null);
});

app.get('/api/pipeline/historical/:sportId', (req, res) => {
  if (!SAFE_ID_PATTERN.test(req.params.sportId)) {
    return res.status(400).json({ error: 'Invalid sport ID' });
  }
  const data = readPipelineJson(join(PIPELINE_OUTPUT, 'historical', `${req.params.sportId}.json`));
  data ? res.json(data) : res.status(404).json(null);
});

// ── Pipeline Runner ───────────────────────────────────────────────────────────

app.get('/api/pipeline/status', (_req, res) => {
  res.json(pipelineState);
});

app.post('/api/run-pipeline', (_req, res) => {
  if (pipelineState.running) {
    return res.json({ ok: false, message: 'Pipeline already running' });
  }

  pipelineState = { running: true, sources: {}, lastRun: new Date().toISOString() };
  res.json({ ok: true });

  const PIPELINE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

  const proc = spawn('node', ['pipeline/scheduler/index.js', '--once'], {
    cwd: PROJECT_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // Kill the process if it exceeds the timeout
  const timeoutTimer = setTimeout(() => {
    if (pipelineState.running) {
      console.warn('[BRACKT] Pipeline timed out after 10 minutes, killing process');
      proc.kill('SIGTERM');
      setTimeout(() => {
        try { proc.kill('SIGKILL'); } catch { /* already dead */ }
      }, 5000);
    }
  }, PIPELINE_TIMEOUT_MS);

  // Parse Winston console output: "TIMESTAMP LEVEL [sourceId]: message"
  // Strip ANSI codes, extract sourceId + message, classify status.
  function parseLine(line) {
    const clean = line.replace(/\x1b\[[0-9;]*m/g, '').trim();
    if (!clean) return;
    const match = clean.match(/\[([^\]/]+)(?:\/[^\]]*)?]:\s+(.+)/);
    if (!match) return;
    const [, sourceId, message] = match;
    const lower = message.toLowerCase();
    if (lower.includes('running')) {
      pipelineState.sources[sourceId] = 'running';
    } else if (lower.includes('completed') || lower.includes('success')) {
      pipelineState.sources[sourceId] = 'success';
    } else if (lower.includes('failed') || lower.includes('error') || lower.includes('exited')) {
      pipelineState.sources[sourceId] = 'error';
    } else if (lower.includes('timed out') || lower.includes('timeout')) {
      pipelineState.sources[sourceId] = 'timeout';
    }
  }

  let buf = '';
  const onData = (data) => {
    buf += data.toString();
    const lines = buf.split('\n');
    buf = lines.pop();
    for (const line of lines) parseLine(line);
  };

  proc.stdout.on('data', onData);
  proc.stderr.on('data', onData);

  proc.on('close', () => {
    clearTimeout(timeoutTimer);
    if (buf) parseLine(buf);
    pipelineState.running = false;
  });

  proc.on('error', (err) => {
    clearTimeout(timeoutTimer);
    console.error('[BRACKT] Pipeline process error:', err.message);
    pipelineState.running = false;
  });
});

app.listen(PORT, () => {
  console.log(`Brackt API server running on http://localhost:${PORT}`);
});
