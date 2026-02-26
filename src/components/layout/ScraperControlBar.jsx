import { useEffect, useCallback } from 'react';
import { useScraper } from '../../context/ScraperContext';
import { checkAllApiKeys } from '../../services/apiValidator';

const SOURCES = [
  { id: 'draftkings', name: 'DraftKings' },
  { id: 'fanduel', name: 'FanDuel' },
  { id: 'covers', name: 'Covers' },
  { id: 'vegasinsider', name: 'VegasInsider' },
  { id: 'oddsportal', name: 'OddsPortal' },
  { id: 'the-odds-api', name: 'OddsAPI', hasApiKey: true },
  { id: 'odds-api-io', name: 'OddsIO', hasApiKey: true },
  { id: 'api-sports', name: 'ApiSports', hasApiKey: true }
];

export default function ScraperControlBar() {
  const { 
    isRunning, 
    setIsRunning, 
    statuses, 
    setStatuses, 
    addLog, 
    clearLogs,
    apiKeyStatuses,
    validateKeys
  } = useScraper();

  useEffect(() => {
    validateKeys();
  }, [validateKeys]);

  const fireScrapers = async () => {
    if (isRunning) return;
    setIsRunning(true);
    clearLogs();
    addLog('Starting scraper sequence...', 'info');
    
    const newStatuses = {};
    SOURCES.forEach(s => newStatuses[s.id] = 'idle');
    setStatuses(newStatuses);

    for (const source of SOURCES) {
      // If it's a key-based source and the key is invalid, skip or log error
      if (source.hasApiKey && apiKeyStatuses[source.id] !== 'valid') {
        addLog(`Skipping ${source.name} - Invalid API key.`, 'error');
        setStatuses(prev => ({ ...prev, [source.id]: 'error' }));
        continue;
      }

      addLog(`Firing ${source.name} scraper...`, 'info');
      setStatuses(prev => ({ ...prev, [source.id]: 'running' }));
      
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));
      
      const rand = Math.random();
      let result = 'success';
      
      if (rand < 0.1) {
        result = 'error';
        addLog(`Error: ${source.name} failed to respond (500 Internal Error)`, 'error');
      } else if (rand < 0.2) {
        result = 'timeout';
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
      case 'success': return 'bg-retro-lime border-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.3)]';
      case 'error': return 'bg-retro-red border-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.3)]';
      case 'timeout': return 'bg-retro-gold border-black text-black shadow-[inset_2px_2px_0_rgba(255,255,255,0.3)]';
      case 'running': return 'bg-retro-cyan border-black animate-pulse shadow-[inset_2px_2px_0_rgba(255,255,255,0.3)]';
      default: return 'bg-retro-panel border-black opacity-50 shadow-[inset_2px_2px_0_rgba(255,255,255,0.1)]';
    }
  };

  return (
    <div className="bg-[#0f0f1b] flex items-stretch h-14 overflow-hidden border-b-2 border-white/10">
      {/* Fire Button */}
      <button
        onClick={fireScrapers}
        disabled={isRunning}
        className={`px-8 flex items-center justify-center font-retro text-[9px] tracking-wider transition-all border-r-2 border-black ${
          isRunning 
            ? 'bg-retro-panel text-white opacity-60' 
            : 'bg-gradient-to-br from-retro-purple to-retro-magenta hover:from-retro-magenta hover:to-retro-purple text-white active:translate-y-0.5'
        }`}
        style={{
          boxShadow: 'inset -2px -2px 0 0 rgba(0,0,0,0.5), inset 2px 2px 0 0 rgba(255,255,255,0.1)'
        }}
      >
        {isRunning ? 'CMD_BUSY...' : 'INIT_SCRAPE'}
      </button>

      {/* Status Boxes */}
      <div className="flex flex-1 items-stretch overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-[#0a0a14]">
        {SOURCES.map((source) => (
          <div
            key={source.id}
            className={`flex-1 min-w-[100px] border-2 flex flex-col justify-center px-3 transition-colors relative ${getStatusColor(statuses[source.id])}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[8px] font-retro text-white drop-shadow-[1px_1px_0_#000] leading-none truncate pr-3">
                {source.name.toUpperCase()}
              </span>
              
              {/* API LED Light */}
              {source.hasApiKey && (
                <div 
                  className={`w-2.5 h-2.5 border border-black absolute right-1.5 top-1/2 -translate-y-1/2 ${
                    apiKeyStatuses[source.id] === 'valid' ? 'led-green' : 'led-red'
                  }`}
                  style={{ boxShadow: 'inset -1px -1px 0 rgba(0,0,0,0.4), inset 1px 1px 0 rgba(255,255,255,0.3)' }}
                  title={apiKeyStatuses[source.id] === 'valid' ? 'API_KEY_VALID' : 'API_KEY_ERROR'}
                />
              )}
            </div>
            
            <div className="h-1 bg-black/30 mt-1.5 border border-white/5">
              <div className={`h-full ${statuses[source.id] === 'running' ? 'bg-white animate-pulse' : 'bg-transparent'}`} />
            </div>
          </div>
        ))}
      </div>
      
      {/* Right tail filler */}
      <div className="bg-[#0f0f1b] w-16 border-l-2 border-white/5 flex items-center justify-center">
        <div className={`w-4 h-4 border-2 border-black ${isRunning ? 'bg-retro-red animate-pulse' : 'bg-[#1a1a1a]'}`} />
      </div>
    </div>
  );
}

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
