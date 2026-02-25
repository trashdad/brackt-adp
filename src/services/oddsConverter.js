/**
 * Convert American odds to implied probability.
 * Negative odds: probability = |odds| / (|odds| + 100)
 * Positive odds: probability = 100 / (odds + 100)
 */
export function americanToImpliedProbability(american) {
  const odds = typeof american === 'string' ? parseFloat(american) : american;
  if (isNaN(odds)) return 0;
  if (odds < 0) {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
  return 100 / (odds + 100);
}

/**
 * Convert American odds to decimal odds.
 */
export function americanToDecimal(american) {
  const odds = typeof american === 'string' ? parseFloat(american) : american;
  if (isNaN(odds)) return 0;
  if (odds < 0) {
    return 1 + 100 / Math.abs(odds);
  }
  return 1 + odds / 100;
}

/**
 * Format American odds with +/- prefix.
 */
export function formatAmericanOdds(odds) {
  const n = typeof odds === 'string' ? parseFloat(odds) : odds;
  if (isNaN(n)) return '--';
  return n > 0 ? `+${n}` : `${n}`;
}
