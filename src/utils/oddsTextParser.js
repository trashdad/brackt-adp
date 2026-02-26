import ROSTERS from '../data/rosters';

const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();

/**
 * Normalize unicode dashes/minuses to ASCII hyphen-minus,
 * strip zero-width and non-breaking spaces, and trim.
 */
function sanitizeLine(line) {
  return line
    .replace(/[\u2212\u2013\u2014\u2015\uFE58\uFF0D]/g, '-')  // unicode minus/dash → ASCII
    .replace(/[\u00A0\u200B\u200C\u200D\uFEFF]/g, ' ')         // non-breaking/zero-width → space
    .trim();
}

/**
 * Returns true if a string is purely numeric (possibly with a sign).
 */
function isNumericOnly(s) {
  return /^[+-]?\d+$/.test(s.trim());
}

/**
 * Parse pasted odds text into [{nameText, odds}] pairs.
 * Handles: "Team Name +150", "Team Name\n+150", mixed layouts,
 * unicode minus signs, and "EVEN"/"EV" as +100.
 */
export function parseOddsText(text) {
  const lines = text.split(/\r?\n/).map(sanitizeLine).filter(Boolean);
  const oddsPattern = /([+-]\d{3,5}|\b\d{3,5}\b)/;
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle "EVEN" / "EV" as +100
    if (/^(EVEN|EV)$/i.test(line)) {
      if (results.length > 0 && !results[results.length - 1].odds) {
        results[results.length - 1].odds = '+100';
      }
      continue;
    }

    const match = line.match(oddsPattern);

    if (match) {
      // Odds found on this line — extract name from same line (text before odds)
      const oddsIdx = line.indexOf(match[0]);
      const namePart = line.slice(0, oddsIdx).trim();
      const oddsVal = match[0].startsWith('+') || match[0].startsWith('-') ? match[0] : '+' + match[0];

      if (namePart.length > 1 && !isNumericOnly(namePart)) {
        results.push({ nameText: namePart, odds: oddsVal });
      } else if (results.length > 0 && !results[results.length - 1].odds) {
        // Previous line was a name-only line, attach odds to it
        results[results.length - 1].odds = oddsVal;
      }
    } else {
      // No odds on this line — could be a team name for the next line
      const cleaned = line.replace(/[^\w\s'-]/g, '').trim();
      // Skip lines that are just numbers (stray odds fragments, rankings, etc.)
      if (cleaned.length > 1 && !isNumericOnly(cleaned)) {
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
