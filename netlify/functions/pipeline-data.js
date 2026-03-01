import { readPipelineFile } from './_store.js';

/**
 * Serves pipeline data (manifest, live odds, historical odds) from JSON files.
 * Reads from /tmp/brackt-data/pipeline/ (written by run-pipeline) or falls back
 * to bundled server/data/ files (included_files in netlify.toml).
 *
 * Routes handled (via netlify.toml redirect /api/pipeline/* → this function):
 *   GET /api/pipeline/manifest        → live/manifest.json
 *   GET /api/pipeline/live/:sportId   → live/{sportId}.json
 *   GET /api/pipeline/historical/:sportId → historical/{sportId}.json
 */
export const handler = async (event) => {
  const subPath = event.path.replace(/^\/api\/pipeline\/?/, '');

  if (!subPath) {
    return { statusCode: 400, body: JSON.stringify({ error: 'No path' }) };
  }

  // Map URL sub-path to file path (same layout as server/data/)
  // "manifest" → "live/manifest.json", "live/nfl" → "live/nfl.json"
  const filePath = subPath === 'manifest' ? 'live/manifest.json' : `${subPath}.json`;

  const data = await readPipelineFile(filePath);
  if (data === null) {
    return { statusCode: 404, body: JSON.stringify(null) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  };
};
