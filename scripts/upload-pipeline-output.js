/**
 * Uploads local pipeline output to Netlify Blobs so the deployed site
 * can serve live odds data without a redeploy.
 *
 * Usage:
 *   NETLIFY_SITE_ID=<your-site-id> NETLIFY_TOKEN=<your-pat> node scripts/upload-pipeline-output.js
 *
 * Or add to your .env.local:
 *   NETLIFY_SITE_ID=...
 *   NETLIFY_TOKEN=...
 * Then run with: node --env-file=.env.local scripts/upload-pipeline-output.js
 *
 * Get your token at: https://app.netlify.com/user/applications#personal-access-tokens
 * Get your site ID at: Site settings > General > Site details > Site ID
 */

import { getStore } from "@netlify/blobs";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "..", "pipeline", "output");

const { NETLIFY_SITE_ID, NETLIFY_TOKEN } = process.env;

if (!NETLIFY_SITE_ID || !NETLIFY_TOKEN) {
  console.error(
    "Missing env vars. Set NETLIFY_SITE_ID and NETLIFY_TOKEN before running.\n" +
    "  NETLIFY_SITE_ID=xxx NETLIFY_TOKEN=yyy node scripts/upload-pipeline-output.js"
  );
  process.exit(1);
}

const store = getStore({
  name: "pipeline_data",
  siteID: NETLIFY_SITE_ID,
  token: NETLIFY_TOKEN,
});

async function upload() {
  let uploaded = 0;

  // Manifest
  const manifestPath = join(OUTPUT, "live", "manifest.json");
  if (existsSync(manifestPath)) {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    await store.setJSON("manifest", manifest);
    console.log("✓ manifest");
    uploaded++;
  }

  // Live files
  const liveDir = join(OUTPUT, "live");
  if (existsSync(liveDir)) {
    for (const file of readdirSync(liveDir)) {
      if (!file.endsWith(".json") || file === "manifest.json") continue;
      const sportId = basename(file, ".json");
      const data = JSON.parse(readFileSync(join(liveDir, file), "utf8"));
      await store.setJSON(`live_${sportId}`, data);
      console.log(`✓ live/${sportId}`);
      uploaded++;
    }
  }

  // Historical files
  const histDir = join(OUTPUT, "historical");
  if (existsSync(histDir)) {
    for (const file of readdirSync(histDir)) {
      if (!file.endsWith(".json")) continue;
      const sportId = basename(file, ".json");
      const data = JSON.parse(readFileSync(join(histDir, file), "utf8"));
      await store.setJSON(`historical_${sportId}`, data);
      console.log(`✓ historical/${sportId}`);
      uploaded++;
    }
  }

  console.log(`\nDone — uploaded ${uploaded} file(s) to Netlify Blobs.`);
}

upload().catch((err) => {
  console.error("Upload failed:", err.message);
  process.exit(1);
});
