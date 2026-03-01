import { createContext, useContext, useState, useEffect } from 'react';
import { fetchAppConfig, saveAppConfig } from '../utils/storage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('snes'); // default until server responds

  // Load theme from server on mount
  useEffect(() => {
    fetchAppConfig().then((cfg) => {
      if (cfg.theme) setTheme(cfg.theme);
    });
  }, []);

  // Apply theme to DOM and persist to server on change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    saveAppConfig({ theme });
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
