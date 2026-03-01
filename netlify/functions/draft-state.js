import { readStore, writeStore } from './_store.js';

export const handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, body: JSON.stringify(readStore('draft-state')) };
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }
    writeStore('draft-state', body);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
