/**
 * Load pipeline-generated data from public/data/.
 * These files are produced by the pipeline scheduler and copied to public/data/.
 */

const DATA_BASE = '/data';

/**
 * Load merged live odds for a sport from the pipeline.
 * Returns null if the pipeline data is not available.
 */
export async function loadLiveOdds(sportId) {
  try {
    const res = await fetch(`${DATA_BASE}/live/${sportId}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Load historical odds for a sport from the pipeline.
 * Returns null if not available.
 */
export async function loadHistoricalOdds(sportId) {
  try {
    const res = await fetch(`${DATA_BASE}/historical/${sportId}.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Load the pipeline manifest (lists available sports + metadata).
 * Returns null if the pipeline hasn't run.
 */
export async function loadManifest() {
  try {
    const res = await fetch(`${DATA_BASE}/live/manifest.json`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Load all available pipeline data for all sports.
 * Returns { liveBySport, historicalBySport, manifest }.
 */
export async function loadAllPipelineData(sportIds) {
  const manifest = await loadManifest();

  const liveBySport = {};
  const historicalBySport = {};

  await Promise.all(
    sportIds.map(async (sportId) => {
      const [live, historical] = await Promise.all([
        loadLiveOdds(sportId),
        loadHistoricalOdds(sportId),
      ]);
      if (live) liveBySport[sportId] = live;
      if (historical) historicalBySport[sportId] = historical;
    })
  );

  return { liveBySport, historicalBySport, manifest };
}
