import { createContext, useContext, useState, useCallback } from 'react';

const DUNGEON_FRIENDS = ['chris', 'dadmin'];
const STORAGE_KEY = 'brackt_dungeon_gate';

const DungeonGateContext = createContext();

export function DungeonGateProvider({ children }) {
  const [gateState, setGateState] = useState(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (stored?.resolved) return stored;
    } catch { /* ignore */ }
    return { resolved: false, userName: null, isFoe: false, seed: null };
  });

  const resolveGate = useCallback((name) => {
    const isFoe = !DUNGEON_FRIENDS.includes(name.toLowerCase().trim());
    const seed = isFoe ? Math.floor(Math.random() * 2147483647) : null;
    const state = { resolved: true, userName: name, isFoe, seed };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Full reload to ensure all components pick up the new state cleanly
    window.location.reload();
  }, []);

  const cancelGate = useCallback(() => {
    window.location.href = 'https://sackotime.trash.farm/';
  }, []);

  const reopenGate = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    // Full reload to clear all cached/memoized data
    window.location.reload();
  }, []);

  return (
    <DungeonGateContext.Provider value={{ ...gateState, resolveGate, cancelGate, reopenGate }}>
      {children}
    </DungeonGateContext.Provider>
  );
}

export const useDungeonGate = () => useContext(DungeonGateContext);
