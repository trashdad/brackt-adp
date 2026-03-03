import { readStore, writeStore } from './_store.js';

export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    return Response.json(await readStore('draft-state', env));
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    await writeStore('draft-state', body, env);
    return Response.json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
