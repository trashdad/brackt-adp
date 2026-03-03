import { readPipelineFile } from '../_store.js';

/**
 * GET /api/pipeline/:path
 *
 * Routes:
 *   /api/pipeline/manifest               → live/manifest.json
 *   /api/pipeline/live/:sportId          → live/{sportId}.json
 *   /api/pipeline/historical/:sportId    → historical/{sportId}.json
 */
export async function onRequest({ request, env, params }) {
  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // params.path is an array of path segments for [[path]] catch-all routes
  const segments = Array.isArray(params.path) ? params.path : [params.path];
  const subPath  = segments.join('/');

  if (!subPath) {
    return Response.json({ error: 'No path' }, { status: 400 });
  }

  const filePath = subPath === 'manifest' ? 'live/manifest.json' : `${subPath}.json`;
  const data = await readPipelineFile(filePath, env);

  if (data === null) {
    return Response.json(null, { status: 404 });
  }

  return Response.json(data);
}
