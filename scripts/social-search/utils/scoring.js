import { QUOTIENT, WEIGHTS } from '../config.js';

/**
 * Calculate the social quotient (EV multiplier) from a raw social score.
 * Uses log10 scaling clamped to a max of 1.35x.
 */
export function calculateQuotient(totalScore) {
  if (totalScore <= 0) return 1.0;
  const raw = 1.0 + (Math.log10(1 + totalScore) * QUOTIENT.coefficient);
  return Math.round(Math.min(raw, QUOTIENT.maxQuotient) * 100) / 100;
}

/**
 * Apply decay to existing accumulated scores so stale mentions fade.
 */
export function applyDecay(scores) {
  for (const id of Object.keys(scores)) {
    const entry = scores[id];
    if (entry.sources) {
      // Decay per-source accumulated scores (not rankings — those are replaced)
      for (const src of ['reddit', 'bluesky', 'news']) {
        if (entry.sources[src]) {
          entry.sources[src].score = parseFloat((entry.sources[src].score * QUOTIENT.decayFactor).toFixed(2));
          entry.sources[src].mentions = Math.round(entry.sources[src].mentions * QUOTIENT.decayFactor);
        }
      }
    }
    // Decay the total socialScore
    entry.socialScore = parseFloat((entry.socialScore * QUOTIENT.decayFactor).toFixed(2));
  }
  return scores;
}

/**
 * Calculate ranking weight from a position.
 * Rank 1 of 32 → 5.0, Rank 32 of 32 → 2.0
 */
export function rankingWeight(rank, maxRank) {
  return WEIGHTS.rankingsBase + ((maxRank - rank) / maxRank) * (WEIGHTS.rankingsMax - WEIGHTS.rankingsBase);
}

/**
 * Detect ranking position in text for a given query name.
 * Returns { rank, bonus } or null.
 */
export function detectRanking(text, queryName) {
  const lower = text.toLowerCase();
  const name = queryName.toLowerCase();

  // Patterns: "#1 Team Name", "No. 3 Team Name", "1. Team Name", "Team Name is ranked #5"
  const beforePatterns = [
    new RegExp(`(?:#|no\\.?\\s*|rank\\s*)(\\d+)[\\s.):-]+${escapeRegex(name)}`, 'i'),
    new RegExp(`(\\d+)\\.\\s+${escapeRegex(name)}`, 'i'),
  ];
  const afterPatterns = [
    new RegExp(`${escapeRegex(name)}[\\s\\w]*(?:#|rank(?:ed)?|at|is)\\s*(\\d+)`, 'i'),
  ];

  for (const re of [...beforePatterns, ...afterPatterns]) {
    const match = lower.match(re);
    if (match) {
      const rank = parseInt(match[1]);
      if (rank > 0 && rank <= 50) {
        // Rank 1 → +2.5 bonus, Rank 25 → +0.1 bonus
        const bonus = Math.max(0, (26 - Math.min(rank, 25)) / 10);
        return { rank, bonus };
      }
    }
  }
  return null;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
