import { getStore } from "@netlify/blobs";

export const handler = async (event) => {
  const store = getStore("draft_storage");
  const key = "research_data";

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

  return { statusCode: 405, body: "Method Not Allowed" };
};
