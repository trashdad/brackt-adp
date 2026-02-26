/**
 * Stub for /api/run-pipeline on Netlify.
 * The pipeline runner spawns a child process and can only run on the local dev server.
 * This function returns a clear error so the UI handles it gracefully.
 */
export const handler = async () => ({
  statusCode: 503,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ok: false,
    message: "PIPELINE_RUNNER_LOCAL_ONLY: Run npm run dev:all locally to fire scrapers",
  }),
});
