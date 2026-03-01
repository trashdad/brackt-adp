import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  const store = getStore("draft_storage");
  const key = "app_settings";

  // GET: return stored settings (merge with defaults)
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

  // POST: merge incoming partial update with existing settings
  if (event.httpMethod === "POST") {
    let incoming;
    try {
      incoming = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
    }
    try {
      const existing = await store.get(key, { type: "json" }) || {};
      await store.setJSON(key, { ...existing, ...incoming });
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
  }

  return { statusCode: 405, body: "Method Not Allowed" };
};
