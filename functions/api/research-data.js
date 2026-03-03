import { readStore } from './_store.js';

export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    return Response.json(await readStore('research-data', env));
  }
  return new Response('Method Not Allowed', { status: 405 });
}
