/**
 * fetch-odds.js — Web-based odds and commentary fetcher for Brackt ADP.
 *
 * Reads fetch-config.json for source URLs, fetches each page,
 * caches raw content in server/data/ingest/raw/, and writes
 * structured ingest files to server/data/ingest/objective/ and subjective/.
 *
 * Usage:
 *   node scripts/fetch-odds.js                     # fetch all sports
 *   node scripts/fetch-odds.js nfl nba             # fetch specific sports only
 *   node scripts/fetch-odds.js --sport nfl         # same with flag
 *   node scripts/fetch-odds.js --dry-run           # preview without writing
 *   node scripts/fetch-odds.js --force             # re-fetch already-cached URLs
 *
 * Requires: GOOGLE_SEARCH_API_KEY and GOOGLE_CSE_ID env vars for search queries
 * (fallback: direct URL fetching only — no search queries).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SERVER_DATA = join(__dirname, '..', 'server', 'data');
const INGEST_DIR = join(SERVER_DATA, 'ingest');
const RAW_DIR = join(INGEST_DIR, 'raw');
const OBJECTIVE_DIR = join(INGEST_DIR, 'objective');
const SUBJECTIVE_DIR = join(INGEST_DIR, 'subjective');
const CACHE_DIR = join(INGEST_DIR, 'cache');
const META_DIR = join(INGEST_DIR, 'metadata');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');
const FETCH_TIMEOUT_MS = 15000;

// Parse sport filters from args
const sportArgs = process.argv.slice(2)
  .filter(a => !a.startsWith('--'))
  .flatMap(a => a.split(','));

function readJson(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

function writeJson(path, data) {
  if (DRY_RUN) { console.log(`  [DRY RUN] Would write ${path}`); return; }
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function writeRaw(subdir, filename, content) {
  if (DRY_RUN) return;
  const dir = join(RAW_DIR, subdir);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, filename), content, 'utf8');
}

function urlHash(url) {
  return createHash('md5').update(url).digest('hex').slice(0, 12);
}

function makeSafeFilename(url) {
  return url.replace(/https?:\/\//,'').replace(/[^a-z0-9]/gi, '_').slice(0, 80);
}

function nowIso() {
  return new Date().toISOString().replace(/:/g, '-').replace(/\..+/, 'Z');
}

function isCachedUrl(url) {
  if (FORCE) return false;
  const hash = urlHash(url);
  return existsSync(join(CACHE_DIR, `url_${hash}.txt`));
}

function markCachedUrl(url) {
  if (DRY_RUN) return;
  if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(join(CACHE_DIR, `url_${urlHash(url)}.txt`), url + '\n', 'utf8');
}

// ── Fetch a URL with timeout ──────────────────────────────────────────────

async function fetchUrl(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BracktADP/1.0; +https://brackt.app)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ── Odds parsing from HTML/text content ──────────────────────────────────

function extractAmericanOdds(text) {
  // Matches name-like text followed by American odds: "Team Name +1200" or "-200"
  const results = [];
  const lines = text.split(/[\n\r|]+/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const americanPattern = /([A-Z][A-Za-z\s.'''-]{2,30})\s+([+-]\d{3,5})/g;
    let m;
    while ((m = americanPattern.exec(line)) !== null) {
      const name = m[1].trim();
      const odds = m[2];
      // Filter out obvious noise (headings, labels, etc.)
      if (name.length > 2 && name.length < 40 && !name.match(/^(Odds|Bet|Pick|View|More|NFL|NBA|MLB|NHL|Team|Player)$/)) {
        results.push({ name, odds });
      }
    }
  }
  return results;
}

function extractFractionalOdds(text) {
  const results = [];
  const fracPattern = /([A-Z][A-Za-z\s.'''-]{2,30})\s+(\d{1,4}\/\d{1,4})/g;
  let m;
  while ((m = fracPattern.exec(text)) !== null) {
    const american = fractionalToAmerican(m[2]);
    if (american != null) {
      results.push({ name: m[1].trim(), odds: formatAmerican(american) });
    }
  }
  return results;
}

function fractionalToAmerican(frac) {
  const [num, den] = frac.split('/').map(Number);
  if (!den || den === 0) return null;
  const decimal = num / den;
  return decimal >= 1 ? Math.round(decimal * 100) : Math.round(-100 / decimal);
}

function formatAmerican(n) {
  if (n == null || isNaN(n)) return null;
  return n > 0 ? `+${n}` : `${n}`;
}

// ── Sentiment extraction from text ───────────────────────────────────────

const POSITIVE_PATTERNS = [
  /\b(favorite|favou?rite|dominant|dominate|top contender|best chance|title contend|strong case|leading|front.?runner|overperform|breakout|emerging|elite|championship caliber|undervalued|strong value|best value|clear choice|best bet)\b/gi,
  /\b(young core|championship experience|depth|healthy|injury.free|key addition|key recruit|star power|hot streak|momentum|winning form|improving|trending up|rising)\b/gi,
  /\b(defending champion|back.to.back|dynasty|dominant form|unbeaten|undefeated)\b/gi,
];

const NEGATIVE_PATTERNS = [
  /\b(longshot|long shot|dark horse|avoid|fade|overrated|overpriced|underperform|regression|decline|aging|injury|suspended|questionable|doubt)\b/gi,
  /\b(roster issues|cap problems|key losses|lost .{3,25} (to|from)|depart|transfer|leaving|exit|fired|coach.{0,10}(gone|left|leav|depart)|trade request)\b/gi,
  /\b(rebuilding|rebuild|sell.off|fire sale|tanking|last place|bottom|worst odds|massive underdog)\b/gi,
];

function classifySentiment(text) {
  let posScore = 0;
  let negScore = 0;
  for (const p of POSITIVE_PATTERNS) {
    const matches = text.match(p);
    if (matches) posScore += matches.length;
  }
  for (const p of NEGATIVE_PATTERNS) {
    const matches = text.match(p);
    if (matches) negScore += matches.length;
  }
  if (posScore > negScore * 1.5) return 'positive';
  if (negScore > posScore * 1.5) return 'negative';
  return 'neutral';
}

function extractSentences(text, maxChars = 200) {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .match(/[A-Z][^.!?]*[.!?]/g)
    ?.filter(s => s.length > 30 && s.length < maxChars) || [];
}

// ── Write ingest file ─────────────────────────────────────────────────────

function writeObjectiveFile(category, source, oddsEntries, context) {
  if (oddsEntries.length === 0) return 0;

  const valueStr = oddsEntries.map(e => `${e.name} ${e.odds}`).join(', ');
  const ts = nowIso();
  const safeCategory = category.replace(/[^a-z0-9]/gi, '_');
  const safeSource = source.replace(/[^a-z0-9]/gi, '_');
  const filename = `${safeCategory}_${safeSource}_${ts}.json`;

  const data = {
    source,
    category,
    timestamp: ts,
    data: [{
      type: 'objective',
      key: `${context} Odds`,
      value: valueStr,
      context,
    }],
  };

  writeJson(join(OBJECTIVE_DIR, filename), data);
  return oddsEntries.length;
}

function writeSubjectiveFile(category, source, signals) {
  if (signals.length === 0) return 0;

  const ts = nowIso();
  const safeCategory = category.replace(/[^a-z0-9]/gi, '_');
  const safeSource = source.replace(/[^a-z0-9]/gi, '_');
  const filename = `${safeCategory}_${safeSource}_${ts}.json`;

  const data = {
    source,
    category,
    timestamp: ts,
    data: signals.map(s => ({
      type: 'subjective',
      key: `${s.entityName} Outlook`,
      value: s.sentence,
      sentiment: s.sentiment,
    })),
  };

  writeJson(join(SUBJECTIVE_DIR, filename), data);
  return signals.length;
}

// ── Main fetch loop ────────────────────────────────────────────────────────

async function fetchSport(sportId, sportConfig) {
  console.log(`\n  [${sportId.toUpperCase()}] Fetching odds and commentary...`);

  const allUrls = [
    ...Object.entries(sportConfig.targetUrls || {}).flatMap(([cat, urls]) =>
      urls.map(u => ({ url: u, sourceCategory: cat }))
    ),
  ];

  let totalOdds = 0;
  let totalSignals = 0;
  let pagesFetched = 0;

  for (const { url, sourceCategory } of allUrls) {
    if (isCachedUrl(url)) {
      console.log(`    SKIP (cached): ${url}`);
      continue;
    }

    let html = '';
    try {
      console.log(`    FETCH: ${url}`);
      html = await fetchUrl(url);
    } catch (err) {
      console.warn(`    WARN: Failed to fetch ${url} — ${err.message}`);
      continue;
    }

    pagesFetched++;

    // Cache raw content
    const rawSubdir = sourceCategory;
    const rawFilename = `${sportId}_${makeSafeFilename(url)}_${nowIso()}.html`;
    writeRaw(rawSubdir, rawFilename, html);
    markCachedUrl(url);

    // Strip HTML to plain text for parsing
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ');

    // Extract odds
    const americanOdds = extractAmericanOdds(text);
    const fractionalOdds = extractFractionalOdds(text);
    const allOdds = [...americanOdds, ...fractionalOdds];

    if (allOdds.length > 0) {
      const source = new URL(url).hostname.replace(/^www\./, '');
      const written = writeObjectiveFile(
        sportConfig.category,
        source,
        allOdds,
        `${sportConfig.championship} ${sportConfig.season}`
      );
      totalOdds += written;
    }

    // Extract subjective signals from sentences containing entity names
    const sentences = extractSentences(text);
    const signals = [];

    for (const sentence of sentences.slice(0, 50)) { // limit per page
      const hasSportContext = new RegExp(sportConfig.championship.split(' ')[0], 'i').test(sentence);
      if (!hasSportContext) continue;

      const sentiment = classifySentiment(sentence);
      if (sentiment !== 'neutral') {
        // Try to find entity name within sentence
        const entityMatch = sentence.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+){0,3})\b/);
        const entityName = entityMatch ? entityMatch[1] : sportConfig.label;
        signals.push({ entityName, sentence, sentiment });
      }
    }

    if (signals.length > 0) {
      const source = new URL(url).hostname.replace(/^www\./, '');
      const written = writeSubjectiveFile(sportConfig.category, source, signals);
      totalSignals += written;
    }
  }

  console.log(`    → ${pagesFetched} pages fetched, ${totalOdds} odds entries, ${totalSignals} sentiment signals`);
  return { totalOdds, totalSignals, pagesFetched };
}

async function main() {
  const config = readJson(join(META_DIR, 'fetch-config.json'));
  if (!config) {
    console.error('ERROR: fetch-config.json not found in', META_DIR);
    process.exit(1);
  }

  // Ensure output dirs exist
  for (const dir of [OBJECTIVE_DIR, SUBJECTIVE_DIR, CACHE_DIR, RAW_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
  for (const sub of ['analyst', 'mainstream', 'niche']) {
    const d = join(RAW_DIR, sub);
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }

  const sportsToFetch = sportArgs.length > 0
    ? sportArgs.filter(s => config.sports[s])
    : Object.keys(config.sports);

  if (sportArgs.length > 0 && sportsToFetch.length === 0) {
    console.error('ERROR: No matching sports found for:', sportArgs.join(', '));
    console.error('Available:', Object.keys(config.sports).join(', '));
    process.exit(1);
  }

  console.log(`\nFetching ${sportsToFetch.length} sport(s): ${sportsToFetch.join(', ')}`);
  if (DRY_RUN) console.log('[DRY RUN mode — no files will be written]\n');

  let grandTotalOdds = 0;
  let grandTotalSignals = 0;
  let grandTotalPages = 0;

  for (const sportId of sportsToFetch) {
    const sportConfig = config.sports[sportId];
    try {
      const result = await fetchSport(sportId, sportConfig);
      grandTotalOdds += result.totalOdds;
      grandTotalSignals += result.totalSignals;
      grandTotalPages += result.pagesFetched;
    } catch (err) {
      console.error(`  ERROR processing ${sportId}:`, err.message);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`COMPLETE: ${grandTotalPages} pages fetched`);
  console.log(`  Odds entries written: ${grandTotalOdds}`);
  console.log(`  Sentiment signals written: ${grandTotalSignals}`);
  console.log(`\nNext step: node scripts/refine-ingest.js --force`);
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
