import { createContext, useContext, useState, useCallback } from 'react';
import { checkAllApiKeys } from '../services/apiValidator';

const ScraperContext = createContext();

export function ScraperProvider({ children }) {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [statuses, setStatuses] = useState({});
  const [apiKeyStatuses, setApiKeyStatuses] = useState({});

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 50));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const validateKeys = useCallback(async () => {
    addLog('SYSTEM_BOOT: VALIDATING API_ACCESS_KEYS...', 'info');
    const results = await checkAllApiKeys();
    setApiKeyStatuses(results);
    
    Object.entries(results).forEach(([id, status]) => {
      if (status === 'invalid') {
        const name = id === 'the-odds-api' ? 'The Odds API' : id === 'odds-api-io' ? 'Odds API IO' : 'API-Sports';
        addLog(`ERROR: ${name.toUpperCase()} KEY_INVALID_OR_MISSING`, 'error');
        setStatuses(prev => ({ ...prev, [id]: 'error' }));
      } else {
        const name = id === 'the-odds-api' ? 'The Odds API' : id === 'odds-api-io' ? 'Odds API IO' : 'API-Sports';
        addLog(`SUCCESS: ${name.toUpperCase()} AUTH_ESTABLISHED`, 'success');
      }
    });
  }, [addLog]);

  return (
    <ScraperContext.Provider value={{ 
      logs, 
      addLog, 
      clearLogs, 
      isRunning, 
      setIsRunning, 
      statuses, 
      setStatuses,
      apiKeyStatuses,
      setApiKeyStatuses,
      validateKeys
    }}>
      {children}
    </ScraperContext.Provider>
  );
}

export function useScraper() {
  const context = useContext(ScraperContext);
  if (!context) {
    throw new Error('useScraper must be used within a ScraperProvider');
  }
  return context;
}
