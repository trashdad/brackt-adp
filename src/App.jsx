import { useCallback, useState, useRef, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import SportView from './pages/SportView';
import PlayerDetail from './pages/PlayerDetail';
import ParsePage from './pages/ParsePage';
import Settings from './pages/Settings';
import useOddsData from './hooks/useOddsData';
import useDraftBoard from './hooks/useDraftBoard';
import { ScraperProvider } from './context/ScraperContext';
import { LockProvider } from './context/LockContext';
import { fetchAppConfig, saveAppConfig } from './utils/storage';
import { exportBoard, importBoard } from './utils/csvManager';

export default function App() {
  const [scarcityModifier, setScarcityModifier] = useState(0.5); // default; overwritten from server

  // Load scarcity modifier from server on mount
  useEffect(() => {
    fetchAppConfig().then((cfg) => {
      if (cfg.scarcityModifier != null) setScarcityModifier(cfg.scarcityModifier);
    });
  }, []);
  const { entries, loading, lastUpdated, refresh } = useOddsData(scarcityModifier);
  const { boardEntries, toggleDrafted, resetDraft, syncDraft } = useDraftBoard(entries);

  // Import state lifted to App so Header can trigger it
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = useCallback(() => exportBoard(boardEntries), [boardEntries]);

  const handleScarcityChange = useCallback((val) => {
    setScarcityModifier(val);
    saveAppConfig({ scarcityModifier: val });
  }, []);

  const handleImport = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportStatus('loading');
    try {
      const { manualCount, draftedCount } = await importBoard(file);
      setImportStatus(`ok:${manualCount}:${draftedCount}`);
      await refresh();
      if (syncDraft) await syncDraft();
      setTimeout(() => setImportStatus(null), 4000);
    } catch {
      setImportStatus('error');
      setTimeout(() => setImportStatus(null), 4000);
    }
  }, [refresh, syncDraft]);

  const handleClearAll = useCallback(async () => {
    resetDraft();
    await fetch('/api/manual-odds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).catch((err) => {
      console.warn('[BRACKT] Failed to clear manual odds on server:', err.message);
    });
    await refresh();
  }, [resetDraft, refresh]);

  return (
    <ScraperProvider>
    <LockProvider>
      <Routes>
        <Route element={
          <Layout
            onExport={handleExport}
            onImportClick={() => fileInputRef.current?.click()}
            importStatus={importStatus}
          />
        }>
          <Route
            index
            element={
              <Dashboard
                boardEntries={boardEntries}
                loading={loading}
                lastUpdated={lastUpdated}
                onToggleDraft={toggleDrafted}
                onRefresh={refresh}
                onSyncDraft={syncDraft}
                scarcityModifier={scarcityModifier}
                onScarcityChange={handleScarcityChange}
              />
            }
          />
          <Route
            path="sport/:id"
            element={<SportView boardEntries={boardEntries} onToggleDraft={toggleDrafted} />}
          />
          <Route
            path="player/:id"
            element={<PlayerDetail boardEntries={boardEntries} onToggleDraft={toggleDrafted} />}
          />
          <Route
            path="parse"
            element={<ParsePage onOddsSubmitted={refresh} />}
          />
          <Route
            path="settings"
            element={<Settings onClearAll={handleClearAll} />}
          />
        </Route>
      </Routes>
      {/* Hidden file input for CSV import — shared across header/dashboard */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleImport}
      />
    </LockProvider>
    </ScraperProvider>
  );
}
