import { readStore } from './_store.js';

export const handler = async (event) => {
  if (event.httpMethod === 'GET') {
    return { statusCode: 200, body: JSON.stringify(readStore('subjective-data')) };
  }

  return { statusCode: 405, body: 'Method Not Allowed' };
};
