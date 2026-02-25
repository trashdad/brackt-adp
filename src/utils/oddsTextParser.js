import ROSTERS from '../data/rosters';

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

/**
 * Parse pasted odds text into [{nameText, odds}] pairs.
 * Handles: "Team Name +150", "Team Name\n+150", and mixed layouts.
 */
export function parseOddsText(text) {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const oddsPattern = /([+-]?\d{3,5})/;
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(oddsPattern);

    if (match) {
      // Odds found on this line — extract name from same line (text before odds)
      const oddsIdx = line.indexOf(match[0]);
      const namePart = line.slice(0, oddsIdx).trim();

      if (namePart.length > 1) {
        results.push({ nameText: namePart, odds: match[0] });
      } else if (results.length > 0 && !results[results.length - 1].odds) {
        // Previous line was a name-only line, attach odds to it
        results[results.length - 1].odds = match[0];
      }
    } else {
      // No odds on this line — could be a team name for the next line
      const cleaned = line.replace(/[^\w\s'-]/g, '').trim();
      if (cleaned.length > 1) {
        results.push({ nameText: cleaned, odds: null });
      }
    }
  }

  // Filter out entries without odds
  return results.filter((r) => r.odds);
}

/**
 * Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Score how well `input` matches `roster` name.
 * Returns confidence 0-1.
 */
function scoreMatch(input, rosterName) {
  const normInput = normalize(input);
  const normRoster = normalize(rosterName);

  // Exact match
  if (normInput === normRoster) return 1.0;

  // Substring containment
  if (normRoster.includes(normInput) || normInput.includes(normRoster)) {
    const ratio = Math.min(normInput.length, normRoster.length) / Math.max(normInput.length, normRoster.length);
    return Math.max(0.7, ratio);
  }

  // Token overlap
  const inputTokens = normInput.split(/\s+/);
  const rosterTokens = normRoster.split(/\s+/);
  let matched = 0;
  for (const token of inputTokens) {
    if (rosterTokens.some((rt) => rt === token || (token.length > 3 && rt.includes(token)))) {
      matched++;
    }
  }
  const tokenScore = matched / Math.max(inputTokens.length, rosterTokens.length);
  if (tokenScore > 0) return Math.min(0.9, 0.4 + tokenScore * 0.5);

  // Levenshtein tolerance for typos
  const dist = levenshtein(normInput, normRoster);
  const maxLen = Math.max(normInput.length, normRoster.length);
  const tolerance = maxLen * 0.3;
  if (dist <= tolerance) {
    return Math.max(0.5, 1 - dist / maxLen);
  }

  return 0;
}

/**
 * Fuzzy-match parsed lines against ROSTERS[sportId].
 * Returns [{ nameText, odds, matchedName, confidence }]
 */
export function matchTeams(parsedLines, sportId) {
  const roster = ROSTERS[sportId] || [];

  return parsedLines.map((line) => {
    let bestMatch = null;
    let bestScore = 0;

    for (const name of roster) {
      const score = scoreMatch(line.nameText, name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = name;
      }
    }

    return {
      ...line,
      matchedName: bestScore >= 0.5 ? bestMatch : null,
      confidence: bestScore,
    };
  });
}
