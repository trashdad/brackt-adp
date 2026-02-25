/**
 * Pipeline scheduler entry point.
 * Reads sources.json, schedules cron jobs for each source, and triggers merges after fetches.
 *
 * Usage:
 *   node scheduler/index.js          # Run with cron scheduling
 *   node scheduler/index.js --once   # Run all sources once and exit
 */

import 'dotenv/config';
import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './logger.js';
import { runSource } from './runner.js';
import { runMerge } from '../merge/merger.js';
import { runHistoricalMerge } from '../merge/historical.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCES_CONFIG_PATH = path.join(__dirname, '..', 'config', 'sources.json');
const LOG_DIR = path.join(__dirname, '..', 'output', 'logs');

/**
 * Run all enabled sources, then merge.
 */
async function runAllSources(sources) {
  logger.info('=== Pipeline run starting ===');
  const startTime = Date.now();

  // Run Node sources in parallel, Python sources sequentially (shared browser)
  const nodeSources = sources.filter((s) => s.type === 'node' && s.enabled);
  const pythonSources = sources.filter((s) => s.type === 'python' && s.enabled);

  // Node sources can run in parallel
  if (nodeSources.length > 0) {
    logger.info(`Running ${nodeSources.length} Node sources in parallel`);
    await Promise.allSettled(nodeSources.map((s) => runSource(s)));
  }

  // Python sources run sequentially to avoid multiple browser instances
  if (pythonSources.length > 0) {
    logger.info(`Running ${pythonSources.length} Python sources sequentially`);
    for (const source of pythonSources) {
      await runSource(source);
    }
  }

  // Merge step
  logger.info('Running merge step');
  await runMerge();
  await runHistoricalMerge();

  // Copy to public/data
  try {
    const copyScript = path.join(__dirname, '..', 'scripts', 'copy-output.js');
    const { default: copyFn } = await import(`file://${copyScript.replace(/\\/g, '/')}`).catch(
      () => ({ default: null })
    );
    // copy-output.js runs as a standalone script, so we just log intent here
    logger.info('Run `npm run copy-output` to update public/data/');
  } catch {
    // not critical
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  logger.info(`=== Pipeline run complete (${elapsed}s) ===`);
}

/**
 * Main entry point.
 */
async function main() {
  // Ensure log directory exists
  await fs.mkdir(LOG_DIR, { recursive: true });

  logger.info('Brackt ADP Pipeline starting');

  // Load sources config
  const configContent = await fs.readFile(SOURCES_CONFIG_PATH, 'utf8');
  const { sources } = JSON.parse(configContent);

  const enabledSources = sources.filter((s) => s.enabled);
  logger.info(`Loaded ${enabledSources.length}/${sources.length} enabled sources`);

  const isOnce = process.argv.includes('--once');

  if (isOnce) {
    // Run all sources once and exit
    logger.info('Running in --once mode');
    await runAllSources(enabledSources);
    process.exit(0);
  }

  // Schedule each source with its own cron interval
  for (const source of enabledSources) {
    if (!cron.validate(source.interval)) {
      logger.warn(`Invalid cron expression for ${source.id}: ${source.interval}`);
      continue;
    }

    cron.schedule(source.interval, async () => {
      logger.info(`Cron triggered`, { source: source.id });
      await runSource(source);
      // Merge after each source run
      await runMerge();
      await runHistoricalMerge();
    });

    logger.info(`Scheduled: ${source.interval}`, { source: source.id });
  }

  // Run all sources immediately on startup
  logger.info('Running initial fetch on startup');
  await runAllSources(enabledSources);

  logger.info('Scheduler active — waiting for cron triggers');
}

main().catch((error) => {
  logger.error(`Fatal error: ${error.message}`, { stack: error.stack });
  process.exit(1);
});
