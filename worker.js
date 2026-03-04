/**
 * worker.js — Cloudflare Workers + Assets entry point.
 *
 * Routes /api/* requests to handlers, then falls through to
 * static assets (SPA fallback handled by not_found_handling in wrangler.toml).
 */

import { onRequest as appSettings }    from './functions/api/app-settings.js';
import { onRequest as manualOdds }     from './functions/api/manual-odds.js';
import { onRequest as draftState }     from './functions/api/draft-state.js';
import { onRequest as socialScores }   from './functions/api/social-scores.js';
import { onRequest as researchData }   from './functions/api/research-data.js';
import { onRequest as subjectiveData } from './functions/api/subjective-data.js';
import { onRequest as bracktDraft }    from './functions/api/brackt-draft.js';
import { onRequest as runPipeline }    from './functions/api/run-pipeline.js';
import { readPipelineFile }            from './functions/api/_store.js';

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    // ── API routing ──────────────────────────────────────────────────────────
    if (pathname === '/api/app-settings')    return appSettings({ request, env });
    if (pathname === '/api/manual-odds')     return manualOdds({ request, env });
    if (pathname === '/api/draft-state')     return draftState({ request, env });
    if (pathname === '/api/social-scores')   return socialScores({ request, env });
    if (pathname === '/api/research-data')   return researchData({ request, env });
    if (pathname === '/api/subjective-data') return subjectiveData({ request, env });
    if (pathname === '/api/brackt-draft')    return bracktDraft({ request, env });
    if (pathname === '/api/run-pipeline')    return runPipeline({ request, env });

    if (pathname.startsWith('/api/pipeline/')) {
      if (request.method !== 'GET') return new Response('Method Not Allowed', { status: 405 });
      const sub      = pathname.slice('/api/pipeline/'.length);
      const filePath = sub === 'manifest' ? 'live/manifest.json' : `${sub}.json`;
      const data     = await readPipelineFile(filePath, env);
      return data != null
        ? Response.json(data)
        : Response.json(null, { status: 404 });
    }

    // ── Static assets ────────────────────────────────────────────────────────
    return env.ASSETS.fetch(request);
  },
};
