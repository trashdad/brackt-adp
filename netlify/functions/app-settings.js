import { readStore, writeStore } from './_store.js';

export const handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, body: JSON.stringify(await readStore('app-settings')) };
  }

  if (event.httpMethod === 'POST') {
    let incoming;
    try {
      incoming = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    const existing = await readStore('app-settings');
    await writeStore('app-settings', { ...existing, ...incoming });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
