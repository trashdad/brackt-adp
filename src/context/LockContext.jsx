import { createContext, useContext, useState, useCallback } from 'react';

const LockContext = createContext();

export function LockProvider({ children }) {
  // Site is locked by default — 5 wizard clicks to unlock (toggles each 5 clicks)
  const [isUnlocked, setIsUnlocked] = useState(false);
  // Controls visibility of ScraperControlBar + sidebar kernel log
  const [showDevPanel, setShowDevPanel] = useState(false);
  // Tracks progress toward 5-click unlock
  const [wizardClicks, setWizardClicks] = useState(0);

  const toggleDevPanel = useCallback(() => setShowDevPanel((p) => !p), []);

  const handleWizardClick = useCallback(() => {
    setWizardClicks((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        setIsUnlocked((u) => !u);
        return 0;
      }
      return next;
    });
  }, []);

  return (
    <LockContext.Provider value={{ isUnlocked, showDevPanel, toggleDevPanel, handleWizardClick, wizardClicks }}>
      {children}
    </LockContext.Provider>
  );
}

export const useLock = () => useContext(LockContext);
