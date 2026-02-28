import fs from 'fs';

const rawData = fs.readFileSync('full_undrafted_analysis.json', 'utf16le');
// Clean potential BOM or encoding noise
const cleanData = rawData.replace(/^\uFEFF/, '');
const data = JSON.parse(cleanData);

const summary = {};
data.forEach(e => {
    if (!summary[e.sport]) {
        summary[e.sport] = { 
            count: 0, 
            avgDPS: 0, 
            topDPS: 0, 
            bottomDPS: 1000,
            bestEntry: '',
            worstEntry: ''
        };
    }
    summary[e.sport].count++;
    summary[e.sport].avgDPS += e.dps;
    if (e.dps > summary[e.sport].topDPS) {
        summary[e.sport].topDPS = e.dps;
        summary[e.sport].bestEntry = e.name;
    }
    if (e.dps < summary[e.sport].bottomDPS) {
        summary[e.sport].bottomDPS = e.dps;
        summary[e.sport].worstEntry = e.name;
    }
});

Object.keys(summary).forEach(s => {
    summary[s].avgDPS = (summary[s].avgDPS / summary[s].count).toFixed(2);
});

console.log("--- FULL UNDRAFTED BOARD ANALYSIS ---");
console.table(Object.entries(summary).sort((a,b) => b[1].avgDPS - a[1].avgDPS).reduce((acc, [sport, stats]) => {
    acc[sport.toUpperCase()] = stats;
    return acc;
}, {}));

console.log("\n--- TOP 5 ENTRIES ---");
console.table(data.slice(0, 5));

console.log("\n--- BOTTOM 5 ENTRIES ---");
console.table(data.slice(-5));

// Find specific clusters
console.log("\n--- 'THE NO MAN'S LAND' (DPS 20-30) ---");
const midTier = data.filter(e => e.dps >= 20 && e.dps <= 30);
console.log(`Count: ${midTier.length} entries`);
console.log(`Common Sports: ${[...new Set(midTier.map(e => e.sport.toUpperCase()))].join(', ')}`);
