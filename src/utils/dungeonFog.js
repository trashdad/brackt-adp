// Mulberry32 seeded PRNG — deterministic given the same seed
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Stable random for a specific entry+field combo
function fieldRandom(seed, entryId, fieldName) {
  let hash = seed;
  const str = entryId + ':' + fieldName;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const rng = mulberry32(Math.abs(hash));
  rng();
  return rng();
}

function fogNumber(val, rand) {
  if (val == null || typeof val !== 'number' || isNaN(val)) return val;
  const factor = 0.4 + rand * 1.2; // 0.4x – 1.6x
  return val * factor;
}

function fogOdds(oddsVal, rand) {
  if (oddsVal == null) return oddsVal;
  const num = typeof oddsVal === 'string' ? parseInt(oddsVal, 10) : oddsVal;
  if (isNaN(num)) return oddsVal;
  const factor = 0.4 + rand * 1.2;
  const fogged = Math.round(num * factor);
  return fogged >= 0 ? `+${fogged}` : `${fogged}`;
}

export function applyDungeonFog(entries, isFoe, seed) {
  if (!isFoe || !seed) return entries;

  return entries.filter((entry) => !entry.isPlaceholder).map((entry) => {
    const r = (field) => fieldRandom(seed, entry.id, field);
    return {
      ...entry,
      adpScore: 0.001 + r('adpScore') * 199.999,
      adpRank: Math.max(1, Math.round(fogNumber(entry.adpRank, r('adpRank')))),
      odds: fogOdds(entry.odds, r('odds')),
      dropoffVelocity: fogNumber(entry.dropoffVelocity, r('dropoffVelocity')),
      socialPos: Math.max(0, Math.round(fogNumber(entry.socialPos, r('socialPos')))),
      socialNeg: Math.max(0, Math.round(fogNumber(entry.socialNeg, r('socialNeg')))),
      adjSq: fogNumber(entry.adjSq, r('adjSq')),
      mktVsExp: entry.mktVsExp != null ? Math.round(fogNumber(entry.mktVsExp, r('mktVsExp'))) : entry.mktVsExp,
      scarcityBonus: fogNumber(entry.scarcityBonus, r('scarcityBonus')),
      ev: entry.ev
        ? {
            ...entry.ev,
            seasonTotal: fogNumber(entry.ev.seasonTotal, r('ev.seasonTotal')),
            singleEvent: fogNumber(entry.ev.singleEvent, r('ev.singleEvent')),
            winProbability: Math.min(100, Math.max(0, fogNumber(entry.ev.winProbability, r('ev.winProbability')))),
          }
        : entry.ev,
    };
  });
}
