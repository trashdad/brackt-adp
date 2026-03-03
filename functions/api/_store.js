/**
 * _store.js — Cloudflare Workers KV storage helper for Pages Functions.
 *
 * All functions receive `env` from the Pages Function context:
 *   export async function onRequest({ request, env }) { ... }
 *
 * KV namespace binding (set in wrangler.toml / CF Pages dashboard):
 *   BRACKT_KV — used for all store data (store:* and pipeline:* keys)
 *
 * Store keys:
 *   "store:{name}"        → readStore / writeStore
 *   "pipeline:{subPath}"  → readPipelineFile / writePipelineFile
 */

export async function readStore(name, env) {
  try {
    if (env?.BRACKT_KV) {
      const val = await env.BRACKT_KV.get(`store:${name}`, { type: 'json' });
      if (val != null) return val;
    }
  } catch (err) {
    console.warn(`[STORE] KV read failed for "${name}":`, err.message);
  }
  return {};
}

export async function writeStore(name, data, env) {
  if (env?.BRACKT_KV) {
    await env.BRACKT_KV.put(`store:${name}`, JSON.stringify(data));
  }
}

export async function readPipelineFile(subPath, env) {
  try {
    if (env?.BRACKT_KV) {
      return await env.BRACKT_KV.get(`pipeline:${subPath}`, { type: 'json' });
    }
  } catch (err) {
    console.warn(`[STORE] KV pipeline read failed for "${subPath}":`, err.message);
  }
  return null;
}

export async function writePipelineFile(subPath, data, env) {
  if (env?.BRACKT_KV) {
    await env.BRACKT_KV.put(`pipeline:${subPath}`, JSON.stringify(data));
  }
}
