import { readStore, writeStore } from './_store.js';

export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    return Response.json(await readStore('app-settings', env));
  }

  if (request.method === 'POST') {
    let incoming;
    try { incoming = await request.json(); } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const existing = await readStore('app-settings', env);
    await writeStore('app-settings', { ...existing, ...incoming }, env);
    return Response.json({ ok: true });
  }

  return new Response('Method Not Allowed', { status: 405 });
}
