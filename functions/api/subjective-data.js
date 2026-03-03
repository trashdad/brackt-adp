import { readStore } from './_store.js';

export async function onRequest({ request, env }) {
  if (request.method === 'GET') {
    return Response.json(await readStore('subjective-data', env));
  }
  return new Response('Method Not Allowed', { status: 405 });
}
