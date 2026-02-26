import { getStore } from "@netlify/blobs";

export const handler = async (event, context) => {
  const store = getStore("draft_storage");
  const key = "manual_odds";

  // GET: Read from Blobs
  if (event.httpMethod === "GET") {
    try {
      const data = await store.get(key, { type: "json" });
      return {
        statusCode: 200,
        body: JSON.stringify(data || {}),
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST: Write to Blobs
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body);
      await store.setJSON(key, body);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true }),
      };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
