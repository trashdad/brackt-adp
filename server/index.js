import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readStore, writeStore } from './store.js';
import { readSportOdds, mergeSportOdds, getAllVersions } from './services/oddsStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PIPELINE_OUTPUT = join(__dirname, 'data');
const PROJECT_ROOT = join(__dirname, '..');

// In-memory pipeline run state (reset on server restart)
let pipelineState = { running: false, sources: {}, lastRun: null };

// ── Brackt.com draft live sync ─────────────────────────────────────────────
// brackt.com uses React Router v7 "single fetch" (.data endpoint).
// The response is Content-Type: text/x-script — a flat reference array
// (turbo-stream format) that we decode before extracting pick data.
const BRACKT_LEAGUE_ID = '2258084d-b9ed-45f5-bb53-0a628892e23c';
const BRACKT_SEASON_ID = '053984c5-26d9-48b4-b51b-af5bbd8dee19';
const BRACKT_DATA_URL  = `https://www.brackt.com/leagues/${BRACKT_LEAGUE_ID}/draft/${BRACKT_SEASON_ID}.data`;
const BRACKT_ROUTE_KEY = 'routes/leagues/$leagueId.draft.$seasonId';
const BRACKT_TEAMS     = 14;
const BRACKT_TTL_MS    = 60_000; // re-fetch brackt.com at most once per minute
let bracktCache    = null;
let bracktCacheTs  = 0;

/**
 * Decode a React Router v7 turbo-stream flat reference array.
 * Format: arr[0] = root descriptor {_keyIdx: valIdx, ...}
 * Negative indices = null/undefined.
 * Special arrays: ["D", ms] = Date, ["SingleFetchFallback"] = null.
 * Number arrays = arrays of index refs that each get decoded.
 */
function decodeTurboStream(arr) {
  const memo = new Map();
  function decode(idx) {
    if (typeof idx !== 'number') return idx;
    if (idx < 0) return null;
    if (memo.has(idx)) return memo.get(idx);
    const val = arr[idx];
    if (val === null || val === undefined) return val;
    if (typeof val !== 'object') return val;
    if (Array.isArray(val)) {
      if (val[0] === 'D' && val.length === 2 && typeof val[1] === 'number') return new Date(val[1]);
      if (val[0] === 'SingleFetchFallback') return null;
      // Array of number indices → decode each element
      if (val.length > 0 && typeof val[0] === 'number') {
        const result = [];
        memo.set(idx, result);
        for (const elemIdx of val) result.push(decode(elemIdx));
        return result;
      }
      return val;
    }
    // Object with {_kIdx: vIdx} reference pairs
    const result = {};
    memo.set(idx, result);
    for (const [k, v] of Object.entries(val)) {
      if (!k.startsWith('_')) continue;
      const keyName = arr[parseInt(k.slice(1))];
      if (keyName !== undefined) result[keyName] = decode(v);
    }
    return result;
  }
  return decode(0);
}

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

// ── Unified Odds Store ───────────────────────────────────────────────────────
// GET  /api/odds/versions     → { sportId: version } for all sports
// GET  /api/odds/:sportId     → full pre-computed odds for a sport
// PATCH /api/odds/:sportId    → merge source-specific odds

const SPORT_IDS = [
  'afl', 'csgo', 'darts', 'fifa', 'f1', 'indycar', 'llws',
  'mlb', 'nba', 'ncaab', 'ncaaf', 'ncaaw', 'nfl', 'nhl',
  'pga', 'snooker', 'tennis_m', 'tennis_w', 'ucl', 'wnba',
];

app.get('/api/odds/versions', async (_req, res) => {
  const versions = await getAllVersions(
    (name) => Promise.resolve(readStore(name)),
    SPORT_IDS
  );
  res.json(versions);
});

app.get('/api/odds/:sportId', async (req, res) => {
  if (!SAFE_ID_PATTERN.test(req.params.sportId)) {
    return res.status(400).json({ error: 'Invalid sport ID' });
  }
  const data = await readSportOdds(
    (name) => Promise.resolve(readStore(name)),
    req.params.sportId
  );
  res.json(data);
});

app.patch('/api/odds/:sportId', async (req, res) => {
  if (!SAFE_ID_PATTERN.test(req.params.sportId)) {
    return res.status(400).json({ error: 'Invalid sport ID' });
  }
  const { source, entries, tournament } = req.body;
  if (!source || typeof source !== 'string') {
    return res.status(400).json({ error: 'Missing "source" field' });
  }
  if (!entries || typeof entries !== 'object') {
    return res.status(400).json({ error: 'Missing "entries" object' });
  }

  const store = await mergeSportOdds(
    (name) => Promise.resolve(readStore(name)),
    (name, data) => { writeStore(name, data); return Promise.resolve(); },
    req.params.sportId,
    source,
    entries,
    tournament || null
  );
  res.json({ ok: true, version: store.version });
});

app.delete('/api/odds/:sportId', (req, res) => {
  if (!SAFE_ID_PATTERN.test(req.params.sportId)) {
    return res.status(400).json({ error: 'Invalid sport ID' });
  }
  writeStore(`odds-${req.params.sportId}`, { version: 0, lastModified: null, entries: {} });
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

// ── App Settings ──────────────────────────────────────────────────────────────
// GET  /api/app-settings        → return stored settings
// POST /api/app-settings        → merge partial update into stored settings

app.get('/api/app-settings', (_req, res) => {
  res.json(readStore('app-settings'));
});

app.post('/api/app-settings', (req, res) => {
  if (typeof req.body !== 'object' || req.body === null) {
    return res.status(400).json({ error: 'Expected JSON object' });
  }
  const existing = readStore('app-settings');
  writeStore('app-settings', { ...existing, ...req.body });
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

// ── Consolidated Data ────────────────────────────────────────────────────────
// Read-only endpoints for social scores, research data, and subjective data.

app.get('/api/social-scores', (_req, res) => {
  const data = readPipelineJson(join(__dirname, 'data', 'social-scores.json'));
  data ? res.json(data) : res.status(404).json({});
});

app.get('/api/research-data', (_req, res) => {
  const data = readPipelineJson(join(__dirname, 'data', 'research-data.json'));
  data ? res.json(data) : res.status(404).json({});
});

app.get('/api/subjective-data', (_req, res) => {
  const data = readPipelineJson(join(__dirname, 'data', 'subjective-data.json'));
  data ? res.json(data) : res.status(404).json({});
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

// ── Brackt Draft Sync ─────────────────────────────────────────────────────
// Proxies brackt.com's React Router data-loader so the DraftPage can poll
// for new picks without hitting brackt.com from the browser (CORS).
// Cached for 60 s server-side to avoid hammering the upstream.

app.get('/api/brackt-draft', async (_req, res) => {
  const now = Date.now();
  if (bracktCache && now - bracktCacheTs < BRACKT_TTL_MS) {
    return res.json(bracktCache);
  }

  try {
    const upstream = await fetch(BRACKT_DATA_URL, {
      headers: { Accept: 'text/x-script, */*', 'User-Agent': 'brackt-adp/1.0' },
    });
    if (!upstream.ok) throw new Error(`brackt.com returned HTTP ${upstream.status}`);

    // Decode turbo-stream flat reference array → plain JS object
    const text = await upstream.text();
    const arr  = JSON.parse(text);
    const decoded = decodeTurboStream(arr);

    // Path: decoded[routeKey].data.{season, draftPicks, ...}
    const routeData  = decoded?.[BRACKT_ROUTE_KEY]?.data ?? {};
    const season     = routeData.season ?? {};
    const draftPicks = routeData.draftPicks ?? [];

    // Normalise pick array into the same shape used by DraftPage FALLBACK_PICKS
    const picks = draftPicks
      .filter(p => p?.participant?.name)
      .map(p => ({
        pickNumber:  p.pickNumber,
        round:       p.round,
        // pickInRound is 1-indexed column position (same for all rounds)
        teamIndex:   p.pickInRound - 1,
        selection:   p.participant.name,
        sport:       p.sport?.name ?? '',
        bracktValue: p.participant.expectedValue != null
          ? parseFloat(p.participant.expectedValue)
          : null,
      }));

    bracktCache = {
      picks,
      currentPickNumber: season.currentPickNumber ?? null,
      totalPicks: BRACKT_TEAMS * (season.draftRounds ?? 25),
      lastFetched: now,
    };
    bracktCacheTs = now;
    res.json(bracktCache);
  } catch (err) {
    console.error('[BRACKT] brackt-draft sync error:', err.message);
    // Return stale cache rather than a hard error so the UI doesn't break
    if (bracktCache) return res.json({ ...bracktCache, stale: true });
    res.status(502).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Brackt API server running on http://localhost:${PORT}`);
});
