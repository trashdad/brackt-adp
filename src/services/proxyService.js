import { loadSettings } from '../utils/storage';

/**
 * BRACKT_ADP_16BIT - Proxy Logic
 * 
 * Determines whether to hit APIs directly or use the Cloudflare Worker Node.
 */

const USE_PROXY = true; // Set to true to route through worker
const LOCAL_WORKER_URL = "http://localhost:8787";
const PROD_WORKER_URL = "https://brackt-adp-worker.yoursubdomain.workers.dev"; // Update after deployment

export function getProxyUrl(target, path) {
  if (!USE_PROXY) {
    if (target === 'odds-api') return `https://api.the-odds-api.com/v4${path}`;
    if (target === 'odds-io') return `https://api.odds-api.io/v1${path}`;
    if (target === 'api-sports') return `https://v3.football.api-sports.io${path}`;
    return path;
  }

  const baseUrl = window.location.hostname === 'localhost' ? LOCAL_WORKER_URL : PROD_WORKER_URL;
  return `${baseUrl}/${target}${path}`;
}
