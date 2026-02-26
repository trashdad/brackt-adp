import { useEffect } from 'react';
import { useScraper } from '../../context/ScraperContext';

const SOURCES = [
  { id: 'draftkings', name: 'DraftKings' },
  { id: 'fanduel', name: 'FanDuel' },
  { id: 'covers', name: 'Covers' },
  { id: 'vegasinsider', name: 'VegasInsider' },
  { id: 'oddsportal', name: 'OddsPortal' },
  { id: 'the-odds-api', name: 'OddsAPI' },
  { id: 'odds-api-io', name: 'OddsIO' },
  { id: 'api-sports', name: 'ApiSports' }
];

export default function ScraperControlBar() {
  const { 
    isRunning, 
    setIsRunning, 
    statuses, 
    setStatuses, 
    addLog, 
    clearLogs 
  } = useScraper();

  const fireScrapers = async () => {
    if (isRunning) return;
    setIsRunning(true);
    clearLogs();
    addLog('Starting scraper sequence...', 'info');
    
    const newStatuses = {};
    SOURCES.forEach(s => newStatuses[s.id] = 'idle');
    setStatuses(newStatuses);

    for (const source of SOURCES) {
      addLog(`Firing ${source.name} scraper...`, 'info');
      setStatuses(prev => ({ ...prev, [source.id]: 'running' }));
      
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
      
      const rand = Math.random();
      let result = 'success';
      let logType = 'success';
      
      if (rand < 0.1) {
        result = 'error';
        logType = 'error';
        addLog(`Error: ${source.name} failed to respond (500 Internal Error)`, 'error');
      } else if (rand < 0.2) {
        result = 'timeout';
        logType = 'warn';
        addLog(`Warning: ${source.name} timed out after 30s. Retrying later.`, 'warn');
      } else {
        addLog(`Success: ${source.name} fetched ${Math.floor(Math.random() * 50) + 10} new entries.`, 'success');
      }
      
      setStatuses(prev => ({ ...prev, [source.id]: result }));
    }
    
    addLog('Scraper sequence complete.', 'info');
    setIsRunning(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-[#4CAF50] border-black';
      case 'error': return 'bg-[#F44336] border-black';
      case 'timeout': return 'bg-[#FFEB3B] border-black text-black';
      case 'running': return 'bg-[#2196F3] border-black animate-pulse';
      default: return 'bg-[#555555] border-black';
    }
  };

  return (
    <div className="bg-black flex items-stretch h-12 overflow-hidden border-b-2 border-white/20">
      {/* Fire Button */}
      <button
        onClick={fireScrapers}
        disabled={isRunning}
        className={`px-6 flex items-center justify-center font-retro text-[10px] tracking-tight transition-all border-r-4 border-black ${
          isRunning 
            ? 'bg-snes-dark text-white opacity-80 cursor-not-allowed' 
            : 'bg-snes-purple hover:bg-snes-lavender text-white active:translate-y-0.5'
        }`}
        style={{
          boxShadow: 'inset -4px -4px 0 0 rgba(0,0,0,0.3), inset 4px 4px 0 0 rgba(255,255,255,0.2)'
        }}
      >
        {isRunning ? 'RUNNING...' : 'FIRE_SCRAPERS'}
      </button>

      {/* Status Boxes */}
      <div className="flex flex-1 items-stretch overflow-x-auto no-scrollbar gap-1 p-1 bg-[#1a1a1a]">
        {SOURCES.map((source) => (
          <div
            key={source.id}
            className={`flex-1 min-w-[90px] border-2 flex flex-col justify-center px-2 transition-colors ${getStatusColor(statuses[source.id])}`}
            style={{ imageRendering: 'pixelated' }}
          >
            <span className="text-[9px] font-retro text-white leading-none truncate mb-1">
              {source.name}
            </span>
            <div className="h-1 bg-black/40 rounded-full overflow-hidden">
              <div className={`h-full ${statuses[source.id] === 'running' ? 'bg-white animate-pulse' : 'bg-transparent'}`} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Right tail filler */}
      <div className="bg-black w-14 border-l-2 border-white/20 flex items-center justify-center">
        <div className={`w-3 h-3 rounded-none border border-black ${isRunning ? 'bg-red-500 animate-pulse' : 'bg-green-900'}`} />
      </div>
    </div>
  );
}
