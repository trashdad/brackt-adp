/**
 * Netlify Function: GET /api/brackt-draft
 *
 * Proxies brackt.com's React Router v7 "single fetch" endpoint,
 * decodes the turbo-stream flat reference array, and returns pick data.
 * Netlify Functions are stateless so we set a short Cache-Control header
 * instead of in-memory caching.
 */

const BRACKT_LEAGUE_ID = '2258084d-b9ed-45f5-bb53-0a628892e23c';
const BRACKT_SEASON_ID = '053984c5-26d9-48b4-b51b-af5bbd8dee19';
const BRACKT_DATA_URL  = `https://www.brackt.com/leagues/${BRACKT_LEAGUE_ID}/draft/${BRACKT_SEASON_ID}.data`;
const BRACKT_ROUTE_KEY = 'routes/leagues/$leagueId.draft.$seasonId';
const BRACKT_TEAMS     = 14;

/**
 * Decode a React Router v7 turbo-stream flat reference array.
 * Negative indices = null. ["D", ms] = Date. Number arrays = index-ref arrays.
 */
function decodeTurboStream(arr) {
  const memo = new Map();
  function decode(idx) {
    if (typeof idx !== 'number') return idx;
    if (idx < 0) return null;
    if (memo.has(idx)) return memo.get(idx);
    const val = arr[idx];
    if (val === null || val === undefined) return val;
    if (typeof val !== 'object') return val;
    if (Array.isArray(val)) {
      if (val[0] === 'D' && val.length === 2 && typeof val[1] === 'number') return new Date(val[1]);
      if (val[0] === 'SingleFetchFallback') return null;
      if (val.length > 0 && typeof val[0] === 'number') {
        const result = [];
        memo.set(idx, result);
        for (const elemIdx of val) result.push(decode(elemIdx));
        return result;
      }
      return val;
    }
    const result = {};
    memo.set(idx, result);
    for (const [k, v] of Object.entries(val)) {
      if (!k.startsWith('_')) continue;
      const keyName = arr[parseInt(k.slice(1))];
      if (keyName !== undefined) result[keyName] = decode(v);
    }
    return result;
  }
  return decode(0);
}

export const handler = async () => {
  try {
    const upstream = await fetch(BRACKT_DATA_URL, {
      headers: { Accept: 'text/x-script, */*', 'User-Agent': 'brackt-adp/1.0' },
    });
    if (!upstream.ok) throw new Error(`brackt.com returned HTTP ${upstream.status}`);

    const text = await upstream.text();
    const arr  = JSON.parse(text);
    const decoded = decodeTurboStream(arr);

    const routeData  = decoded?.[BRACKT_ROUTE_KEY]?.data ?? {};
    const season     = routeData.season ?? {};
    const draftPicks = routeData.draftPicks ?? [];

    const picks = draftPicks
      .filter(p => p?.participant?.name)
      .map(p => ({
        pickNumber:  p.pickNumber,
        round:       p.round,
        teamIndex:   p.pickInRound - 1,
        selection:   p.participant.name,
        sport:       p.sport?.name ?? '',
        bracktValue: p.participant.expectedValue != null
          ? parseFloat(p.participant.expectedValue)
          : null,
      }));

    const payload = {
      picks,
      currentPickNumber: season.currentPickNumber ?? null,
      totalPicks: BRACKT_TEAMS * (season.draftRounds ?? 25),
      lastFetched: Date.now(),
    };

    return {
      statusCode: 200,
      // Cache at the CDN edge for 55 s so the client's 60 s poll always gets fresh data
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=55, s-maxage=55',
      },
      body: JSON.stringify(payload),
    };
  } catch (err) {
    console.error('[BRACKT] brackt-draft function error:', err.message);
    return {
      statusCode: 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};
