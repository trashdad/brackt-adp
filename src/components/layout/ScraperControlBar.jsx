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
      case 'success': return 'bg-green-500 border-green-600';
      case 'error': return 'bg-red-500 border-red-600';
      case 'timeout': return 'bg-yellow-500 border-yellow-600';
      case 'running': return 'bg-blue-400 border-blue-500 animate-pulse';
      default: return 'bg-gray-700 border-gray-600';
    }
  };

  return (
    <div className="bg-gray-900 border-b border-gray-800 flex items-stretch h-10 overflow-hidden">
      {/* Fire Button */}
      <button
        onClick={fireScrapers}
        disabled={isRunning}
        className={`px-4 flex items-center justify-center text-[11px] font-black uppercase tracking-tighter transition-colors ${
          isRunning 
            ? 'bg-orange-600 text-white cursor-not-allowed' 
            : 'bg-brand-500 hover:bg-brand-400 text-white active:bg-brand-600'
        }`}
      >
        {isRunning ? 'Scraping...' : 'Fire Scrapers'}
      </button>

      {/* Status Boxes */}
      <div className="flex flex-1 items-stretch overflow-x-auto no-scrollbar">
        {SOURCES.map((source) => (
          <div
            key={source.id}
            className={`flex-1 min-w-[100px] border-r border-gray-800 flex flex-col justify-center px-3 transition-colors ${getStatusColor(statuses[source.id])}`}
          >
            <span className="text-[10px] font-bold text-white leading-tight uppercase truncate">
              {source.name}
            </span>
            <span className="text-[8px] text-white/70 font-medium leading-tight uppercase">
              {statuses[source.id] || 'Ready'}
            </span>
          </div>
        ))}
      </div>
      
      {/* Right tail filler */}
      <div className="bg-gray-900 w-12 border-l border-gray-800 flex items-center justify-center">
        <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-ping' : 'bg-gray-700'}`} />
      </div>
    </div>
  );
}
