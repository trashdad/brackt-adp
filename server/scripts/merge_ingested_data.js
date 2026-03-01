import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const INGEST_DIR = 'server/data/ingest';
const SUBJECTIVE_INGEST = join(INGEST_DIR, 'subjective');
const OBJECTIVE_INGEST = join(INGEST_DIR, 'objective');

const RESEARCH_DATA_PATH = 'server/data/research-data.json';
const SUBJECTIVE_DATA_PATH = 'server/data/subjective-data.json';

function mergeData() {
  let researchData = existsSync(RESEARCH_DATA_PATH) ? JSON.parse(readFileSync(RESEARCH_DATA_PATH, 'utf8')) : {};
  let subjectiveData = existsSync(SUBJECTIVE_DATA_PATH) ? JSON.parse(readFileSync(SUBJECTIVE_DATA_PATH, 'utf8')) : {};

  // Merge Objective -> Research
  if (existsSync(OBJECTIVE_INGEST)) {
    const files = readdirSync(OBJECTIVE_INGEST);
    files.forEach(file => {
      const content = JSON.parse(readFileSync(join(OBJECTIVE_INGEST, file), 'utf8'));
      const { category, data } = content;
      if (!researchData[category]) researchData[category] = [];
      researchData[category].push(...data.map(d => ({ ...d, source: content.source, timestamp: content.timestamp })));
    });
  }

  // Merge Subjective -> Subjective
  if (existsSync(SUBJECTIVE_INGEST)) {
    const files = readdirSync(SUBJECTIVE_INGEST);
    files.forEach(file => {
      const content = JSON.parse(readFileSync(join(SUBJECTIVE_INGEST, file), 'utf8'));
      const { category, data } = content;
      if (!subjectiveData[category]) subjectiveData[category] = [];
      subjectiveData[category].push(...data.map(d => ({ ...d, source: content.source, timestamp: content.timestamp })));
    });
  }

  writeFileSync(RESEARCH_DATA_PATH, JSON.stringify(researchData, null, 2));
  writeFileSync(SUBJECTIVE_DATA_PATH, JSON.stringify(subjectiveData, null, 2));

  console.log('Successfully merged ingested data into server/data/');
}

mergeData();
