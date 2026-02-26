import { getStore } from "@netlify/blobs";

/**
 * Serves pipeline data (manifest, live odds, historical odds) from Netlify Blobs.
 * Data is uploaded by running: node scripts/upload-pipeline-output.js
 *
 * Routes handled (via netlify.toml redirect /api/pipeline/* → this function):
 *   GET /api/pipeline/manifest
 *   GET /api/pipeline/live/:sportId
 *   GET /api/pipeline/historical/:sportId
 */
export const handler = async (event) => {
  const store = getStore("pipeline_data");

  // Extract the sub-path after /api/pipeline/
  // event.path will be something like "/api/pipeline/live/nfl"
  const subPath = event.path.replace(/^\/api\/pipeline\/?/, ''); // "live/nfl", "manifest", etc.

  if (!subPath) {
    return { statusCode: 400, body: JSON.stringify({ error: "No path" }) };
  }

  // Convert path to a Blobs key: "live/nfl" → "live_nfl", "manifest" → "manifest"
  const key = subPath.replace(/\//g, '_');

  try {
    const data = await store.get(key, { type: "json" });
    if (data === null) {
      return { statusCode: 404, body: JSON.stringify(null) };
    }
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
