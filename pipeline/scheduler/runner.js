/**
 * Dispatches data source fetches to either Node modules or Python subprocesses.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import logger from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const NODE_SOURCES_DIR = path.join(__dirname, '..', 'node-sources');
const PYTHON_SOURCES_DIR = path.join(__dirname, '..', 'python-sources');
const SPORTS_MAPPING_PATH = path.join(__dirname, '..', 'config', 'sports-mapping.json');

let sportsMapping = null;

async function loadSportsMapping() {
  if (!sportsMapping) {
    const content = await fs.readFile(SPORTS_MAPPING_PATH, 'utf8');
    sportsMapping = JSON.parse(content);
  }
  return sportsMapping;
}

/**
 * Get the sport mappings for a specific source, filtered to its configured sports.
 */
function getMappingsForSource(sourceConfig, allMappings) {
  const result = {};
  for (const sportId of sourceConfig.sports || []) {
    const sportMap = allMappings[sportId];
    if (sportMap && sportMap[sourceConfig.id]) {
      result[sportId] = sportMap[sourceConfig.id];
    }
  }
  return result;
}

/**
 * Check if we're within the source's season window (if configured).
 */
function isInSeasonWindow(sourceConfig) {
  const window = sourceConfig.seasonWindow;
  if (!window) return true;

  const currentMonth = new Date().getMonth() + 1; // 1-12
  return currentMonth >= window.startMonth && currentMonth <= window.endMonth;
}

/**
 * Run a Node.js API source.
 */
async function runNodeSource(sourceConfig) {
  const modulePath = path.join(NODE_SOURCES_DIR, `${sourceConfig.module}.js`);

  try {
    const module = await import(`file://${modulePath.replace(/\\/g, '/')}`);
    const ClientClass = module.default;
    const client = new ClientClass();

    const allMappings = await loadSportsMapping();
    const mappings = getMappingsForSource(sourceConfig, allMappings);

    if (Object.keys(mappings).length === 0) {
      logger.warn('No sport mappings found', { source: sourceConfig.id });
      return;
    }

    logger.info(`Running Node source (${Object.keys(mappings).length} sports)`, {
      source: sourceConfig.id,
    });

    const results = await client.fetchAll(mappings);
    const total = Object.values(results).reduce((sum, n) => sum + n, 0);
    logger.info(`Completed: ${total} entries across ${Object.keys(results).length} sports`, {
      source: sourceConfig.id,
    });
  } catch (error) {
    logger.error(`Node source failed: ${error.message}`, { source: sourceConfig.id });
  }
}

/**
 * Run a Python scraper as a subprocess.
 */
function runPythonSource(sourceConfig) {
  return new Promise(async (resolve) => {
    const scriptPath = path.join(PYTHON_SOURCES_DIR, sourceConfig.script);

    const allMappings = await loadSportsMapping();
    const mappings = getMappingsForSource(sourceConfig, allMappings);

    if (Object.keys(mappings).length === 0) {
      logger.warn('No sport mappings found', { source: sourceConfig.id });
      resolve();
      return;
    }

    // Write temp mappings file for the Python script
    const tempMappingPath = path.join(PYTHON_SOURCES_DIR, `_temp_${sourceConfig.id}_mappings.json`);
    await fs.writeFile(tempMappingPath, JSON.stringify(mappings));

    logger.info(`Running Python source (${Object.keys(mappings).length} sports)`, {
      source: sourceConfig.id,
    });

    const proc = spawn('python', [scriptPath, tempMappingPath], {
      cwd: PYTHON_SOURCES_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', async (code) => {
      // Clean up temp file
      try {
        await fs.unlink(tempMappingPath);
      } catch {
        // ignore
      }

      if (code === 0) {
        logger.info(`Python source completed`, { source: sourceConfig.id });
        if (stdout.trim()) {
          logger.debug(stdout.trim(), { source: sourceConfig.id });
        }
      } else {
        logger.error(`Python source exited with code ${code}`, {
          source: sourceConfig.id,
          stderr: stderr.trim().slice(0, 500),
        });
      }
      resolve();
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      proc.kill('SIGTERM');
      logger.warn('Python source timed out (5m)', { source: sourceConfig.id });
      resolve();
    }, 5 * 60 * 1000);
  });
}

/**
 * Run a source based on its type.
 */
export async function runSource(sourceConfig) {
  if (!sourceConfig.enabled) {
    logger.debug(`Source disabled, skipping`, { source: sourceConfig.id });
    return;
  }

  if (!isInSeasonWindow(sourceConfig)) {
    logger.info(`Outside season window, skipping`, { source: sourceConfig.id });
    return;
  }

  if (sourceConfig.type === 'node') {
    await runNodeSource(sourceConfig);
  } else if (sourceConfig.type === 'python') {
    await runPythonSource(sourceConfig);
  } else {
    logger.warn(`Unknown source type: ${sourceConfig.type}`, { source: sourceConfig.id });
  }
}

export default runSource;
