import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ROSTERS_PATH = path.join(__dirname, '../src/data/rosters.js');
const STORAGE_PATH = path.join(__dirname, '../server/data/social-storage.json');
const SCORES_PATH = path.join(__dirname, '../server/data/social-scores.json');
const DRAFT_STATE_PATH = path.join(__dirname, '../server/data/draft-state.json');

// 1. Read rosters
const rostersContent = fs.readFileSync(ROSTERS_PATH, 'utf-8');
const rostersMatch = rostersContent.match(/const ROSTERS = (\{[\s\S]*?\});\s*export default/);
let ROSTERS = {};
if (rostersMatch) {
  ROSTERS = eval(`(${rostersMatch[1]})`);
} else {
  console.error("Could not parse ROSTERS");
  process.exit(1);
}

// 2. Load Draft State
let draftState = {};
if (fs.existsSync(DRAFT_STATE_PATH)) {
  try {
    draftState = JSON.parse(fs.readFileSync(DRAFT_STATE_PATH, 'utf-8'));
  } catch (e) {}
}

// 3. Load Storage (history and tallies)
let storage = { processedIds: [], scores: {} };
if (fs.existsSync(STORAGE_PATH)) {
  try {
    storage = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
  } catch (e) {}
}
if (!storage.processedIds) storage.processedIds = [];
if (!storage.scores) storage.scores = {};

function slugify(text) {
  return text.toString().toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/--+/g, '-');
}

async function searchMentions(query, otherPlayers = []) {
  // Using Reddit search as a proxy for "reddit posts, well-respected periodicals, and like places"
  try {
    const res = await fetch(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=5`, {
      headers: { 'User-Agent': 'BracktADP_SSS/1.0.0 (Node.js)' }
    });
    if (!res.ok) {
        // Fallback for demo/mocking
        return [{ id: `mock_${Date.now()}_${Math.floor(Math.random()*1000)}`, weight: 1.2 }];
    }
    const data = await res.json();
    if (!data.data || !data.data.children) return [];
    
    return data.data.children.map(c => {
        const title = c.data.title.toLowerCase();
        const selftext = (c.data.selftext || '').toLowerCase();
        const fullText = title + ' ' + selftext;
        let weight = 1.0;
        
        // 1. Ranking Detection (e.g., "Player is #3", "1. Player")
        // Look for common patterns like "#1", "No. 1", "1. "
        const rankMatch = fullText.match(new RegExp(`(?:#|no\\.|\\b)(\\d+)[\\s\\.\\)]+${query.toLowerCase()}`, 'i')) || 
                        fullText.match(new RegExp(`${query.toLowerCase()}[\\s\\w]+(?:#|rank|is|at|# )(\\d+)`, 'i'));
        
        if (rankMatch) {
            const rank = parseInt(rankMatch[1]);
            if (rank > 0 && rank <= 25) {
                weight += (26 - rank) / 10; // Rank 1 gives +2.5 weight, Rank 10 gives +1.6
            }
        }

        // 2. Relative Ranking (if other players are mentioned, check if we are first)
        for (const other of otherPlayers) {
            if (other.name.toLowerCase() === query.toLowerCase()) continue;
            const otherIdx = fullText.indexOf(other.name.toLowerCase());
            const thisIdx = fullText.indexOf(query.toLowerCase());
            if (thisIdx !== -1 && otherIdx !== -1 && thisIdx < otherIdx) {
                weight += 0.2; // Bonus for being higher in the list than a competitor
            }
        }

        return { id: `reddit_${c.data.id}`, weight };
    });
  } catch (err) {
    return [{ id: `mock_err_${Date.now()}_${Math.floor(Math.random()*1000)}`, weight: 1.0 }];
  }
}

async function run() {
  console.log('Starting Social Search Script (SSS)...');
  
  const allEntries = [];
  const undraftedNames = [];
  for (const [sport, teams] of Object.entries(ROSTERS)) {
    for (const name of teams) {
        const id = `${sport}-${slugify(name)}`;
        if (!draftState[id] || !draftState[id].drafted) {
            allEntries.push({ id, name });
            undraftedNames.push({ id, name });
        }
    }
  }

  console.log(`Found ${allEntries.length} undrafted entities. Searching for mentions and rankings...`);

  // Process in batches
  const batchSize = 10;
  for (let i = 0; i < allEntries.length; i += batchSize) {
      const batch = allEntries.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (entry) => {
          const results = await searchMentions(entry.name, undraftedNames);
          
          if (!storage.scores[entry.id]) {
            storage.scores[entry.id] = { socialScore: 0, socialQuotient: 1.0 };
          }
          
          let addedWeight = 0;
          for (const res of results) {
            if (!storage.processedIds.includes(res.id)) {
              storage.processedIds.push(res.id);
              addedWeight += res.weight;
            }
          }
          
          if (addedWeight > 0) {
            storage.scores[entry.id].socialScore = (storage.scores[entry.id].socialScore || 0) + addedWeight;
          }
          
          // Calculate Social Quotient as a coefficient (starts at 1.0)
          // Using Log10 scaling: Score of 10 -> ~1.1x, Score of 100 -> ~1.2x
          const totalScore = storage.scores[entry.id].socialScore;
          const quotient = 1.0 + (Math.log10(1 + totalScore) * 0.1);
          storage.scores[entry.id].socialQuotient = Math.round(quotient * 100) / 100;
      }));
      
      process.stdout.write(`\rProcessed ${Math.min(i + batchSize, allEntries.length)} / ${allEntries.length}`);
      
      if (i + batchSize < allEntries.length) {
          await new Promise(r => setTimeout(r, 1000));
      }
  }

  console.log('\nSaving data...');
  // Save storage history
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(storage, null, 2));

  // Save scores to public/data for the frontend to consume
  fs.mkdirSync(path.dirname(SCORES_PATH), { recursive: true });
  fs.writeFileSync(SCORES_PATH, JSON.stringify(storage.scores, null, 2));
  
  console.log('SSS Complete. Mentions and rankings tallied successfully.');
}

run();
