import fs from 'fs';

const historicalWinners = [
    // Year, Sport, Winner, Pre-Season Odds Range
    { year: 2024, sport: 'nba', name: 'Celtics', odds: '+450', rank: 1 },
    { year: 2024, sport: 'nfl', name: 'Chiefs', odds: '+600', rank: 1 },
    { year: 2024, sport: 'mlb', name: 'Dodgers', odds: '+350', rank: 1 },
    { year: 2024, sport: 'nhl', name: 'Panthers', odds: '+1000', rank: 5 },
    { year: 2024, sport: 'f1', name: 'Verstappen', odds: '-500', rank: 1 },
    { year: 2024, sport: 'indycar', name: 'Palou', odds: '+300', rank: 1 },
    { year: 2024, sport: 'afl', name: 'Brisbane', odds: '+600', rank: 3 },
    
    { year: 2023, sport: 'nba', name: 'Nuggets', odds: '+1200', rank: 5 },
    { year: 2023, sport: 'nfl', name: 'Chiefs', odds: '+600', rank: 1 },
    { year: 2023, sport: 'mlb', name: 'Rangers', odds: '+2500', rank: 12 },
    { year: 2023, sport: 'nhl', name: 'Knights', odds: '+1400', rank: 8 },
    { year: 2023, sport: 'f1', name: 'Verstappen', odds: '-150', rank: 1 },
    { year: 2023, sport: 'indycar', name: 'Palou', odds: '+500', rank: 2 },
    { year: 2023, sport: 'afl', name: 'Collingwood', odds: '+800', rank: 4 },

    { year: 2022, sport: 'nba', name: 'Warriors', odds: '+1200', rank: 4 },
    { year: 2022, sport: 'nfl', name: 'Rams', odds: '+1500', rank: 6 },
    { year: 2022, sport: 'mlb', name: 'Astros', odds: '+1000', rank: 3 },
    { year: 2022, sport: 'nhl', name: 'Avalanche', odds: '+600', rank: 1 },
    { year: 2022, sport: 'f1', name: 'Verstappen', odds: '+200', rank: 2 },
    { year: 2022, sport: 'indycar', name: 'Power', odds: '+1000', rank: 6 },
    { year: 2022, sport: 'afl', name: 'Geelong', odds: '+1200', rank: 5 },

    { year: 2021, sport: 'nba', name: 'Bucks', odds: '+1000', rank: 3 },
    { year: 2021, sport: 'nfl', name: 'Buccaneers', odds: '+1200', rank: 5 },
    { year: 2021, sport: 'mlb', name: 'Braves', odds: '+1500', rank: 8 },
    { year: 2021, sport: 'nhl', name: 'Lightning', odds: '+800', rank: 2 },
    { year: 2021, sport: 'f1', name: 'Verstappen', odds: '+400', rank: 2 },
    { year: 2021, sport: 'indycar', name: 'Palou', odds: '+2500', rank: 15 },
    { year: 2021, sport: 'afl', name: 'Melbourne', odds: '+2000', rank: 10 },
];

const sports = [...new Set(historicalWinners.map(w => w.sport))];
const stats = {};

sports.forEach(s => {
    const wins = historicalWinners.filter(w => w.sport === s);
    const avgRank = wins.reduce((sum, w) => sum + w.rank, 0) / wins.length;
    // Accuracy = 1 / avgRank (Normalized to 1.0)
    // If rank 1 wins every time, accuracy is 1.0.
    // If rank 5 wins every time, accuracy is 0.2.
    stats[s] = (1 / avgRank);
});

console.log("--- MARKET FIDELITY BACKTEST (2021-2024) ---");
console.table(Object.entries(stats).sort((a,b) => b[1] - a[1]).reduce((acc, [s, score]) => {
    acc[s.toUpperCase()] = { 
        fidelityScore: score.toFixed(3),
        interpretation: score > 0.8 ? 'Extreme' : score > 0.4 ? 'High' : score > 0.2 ? 'Moderate' : 'Low'
    };
    return acc;
}, {}));
