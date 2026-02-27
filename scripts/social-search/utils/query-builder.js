import { INDIVIDUAL_SPORTS } from '../config.js';

/**
 * Build a search query string for a given sport + optional context.
 * For social/news searches we query per-sport (not per-entry) to reduce API calls,
 * then scan results for roster name matches.
 */
export function buildSportQuery(sport, context = 'odds') {
  const year = new Date().getFullYear();

  if (context === 'rankings') {
    if (INDIVIDUAL_SPORTS.includes(sport.id)) {
      return `${sport.name} rankings ${year}`;
    }
    return `${sport.name} power rankings ${year}`;
  }

  // General buzz query
  if (INDIVIDUAL_SPORTS.includes(sport.id)) {
    return `${sport.name} odds predictions ${year}`;
  }
  return `${sport.name} championship odds ${year}`;
}

/**
 * Build a player/team-specific query for targeted searches.
 * Used when doing per-entry searches (e.g., for top-ranked entries only).
 */
export function buildEntryQuery(name, sport) {
  const year = new Date().getFullYear();

  if (INDIVIDUAL_SPORTS.includes(sport.id)) {
    return `"${name}" ${sport.name} ${year}`;
  }
  return `"${name}" ${sport.name} championship ${year}`;
}

/**
 * Normalize a name for fuzzy matching against text content.
 * Returns an array of match patterns (full name + key fragments).
 */
export function nameMatchPatterns(name) {
  const lower = name.toLowerCase().trim();
  const patterns = [lower];

  // For team names like "Kansas City Chiefs", also match "Chiefs"
  const parts = lower.split(/\s+/);
  if (parts.length >= 2) {
    // Last word is often the team name
    patterns.push(parts[parts.length - 1]);
    // Last two words for compound team names (e.g., "Red Sox", "Blue Jays")
    if (parts.length >= 3) {
      patterns.push(parts.slice(-2).join(' '));
    }
  }

  return patterns;
}

/**
 * Check if any of the name patterns appear in the given text.
 * Returns true if at least the full name or a unique fragment matches.
 */
export function nameAppearsInText(name, text) {
  const lower = text.toLowerCase();
  const fullName = name.toLowerCase().trim();

  // Full name match is always valid
  if (lower.includes(fullName)) return true;

  // For partial matches, require the last word (team nickname) to appear
  // but only if it's 4+ chars to avoid false positives ("Heat", "Jazz" are ok, "FC" is not)
  const parts = fullName.split(/\s+/);
  const lastName = parts[parts.length - 1];
  if (lastName.length >= 4 && lower.includes(lastName)) return true;

  // Two-word team names
  if (parts.length >= 3) {
    const twoWord = parts.slice(-2).join(' ');
    if (twoWord.length >= 6 && lower.includes(twoWord)) return true;
  }

  return false;
}
