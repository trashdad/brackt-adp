import { createContext, useContext, useState, useCallback } from 'react';

const ScraperContext = createContext();

export function ScraperProvider({ children }) {
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [statuses, setStatuses] = useState({});

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 50));
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return (
    <ScraperContext.Provider value={{ 
      logs, 
      addLog, 
      clearLogs, 
      isRunning, 
      setIsRunning, 
      statuses, 
      setStatuses 
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
