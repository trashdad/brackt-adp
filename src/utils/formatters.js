/**
 * Format a number to a fixed number of decimal places.
 */
export function formatNumber(n, decimals = 1) {
  if (n == null || isNaN(n)) return '--';
  return Number(n).toFixed(decimals);
}

/**
 * Format a percentage value.
 */
export function formatPercent(n) {
  if (n == null || isNaN(n)) return '--';
  return `${Number(n).toFixed(1)}%`;
}

/**
 * Slugify a string for use as an ID.
 */
export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
