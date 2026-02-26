import express from 'express';
import cors from 'cors';
import { readStore, writeStore } from './store.js';

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

app.listen(PORT, () => {
  console.log(`Brackt API server running on http://localhost:${PORT}`);
});
