import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import SportView from './pages/SportView';
import PlayerDetail from './pages/PlayerDetail';
import ParsePage from './pages/ParsePage';
import DraftPage from './pages/DraftPage';
import Settings from './pages/Settings';
import SPORTS from './data/sports';
import useOddsData from './hooks/useOddsData';
import useDraftBoard from './hooks/useDraftBoard';
import { ScraperProvider } from './context/ScraperContext';
import { LockProvider } from './context/LockContext';
import { useDungeonGate } from './context/DungeonGateContext';
import { applyDungeonFog } from './utils/dungeonFog';
import { fetchAppConfig, saveAppConfig } from './utils/storage';
import { exportBoard, importBoard } from './utils/csvManager';
import { computeIkynEV } from './utils/ikynEV';
import { enrichWithConfidence } from './utils/confidenceScore';

export default function App() {
  const [scarcityModifier, setScarcityModifier] = useState(0.5); // default; overwritten from server
  const [leagueSize, setLeagueSize] = useState(12); // default; overwritten from server

  // Load settings from server on mount
  useEffect(() => {
    fetchAppConfig().then((cfg) => {
      if (cfg.scarcityModifier != null) setScarcityModifier(cfg.scarcityModifier);
      if (cfg.leagueSize != null) setLeagueSize(cfg.leagueSize);
    });
  }, []);
  const { entries, loading, lastUpdated, refresh } = useOddsData(scarcityModifier, leagueSize);
  const { boardEntries, toggleDrafted, resetDraft, syncDraft } = useDraftBoard(entries);

  // ikyn_EV: computed from entries (odds data), not boardEntries — draft toggles don't
  // affect adpScore/winProbability so recomputing 300k-sim PL-MC on every draft is wasted.
  const ikynEVMap = useMemo(() => computeIkynEV(entries), [entries]);

  // Pre-enrich entries with ikynEV + waEV + wizardEV + confidence data
  // This avoids duplicating the enrichment in Dashboard/SportView/etc.
  const enrichedEntries = useMemo(() => {
    const enriched = boardEntries.map(e => {
      const d = ikynEVMap[e.id];
      return { ...e, ikynEV: d?.ev ?? null, waEV: d?.waEV ?? null, wizardEV: d?.wizardEV ?? null, ikynDetail: d ?? null };
    });
    enrichWithConfidence(enriched, ikynEVMap);
    return enriched;
  }, [boardEntries, ikynEVMap]);

  // DUNGEON_FOE: randomize display values for non-friends (never mutates real data)
  const { isFoe, seed } = useDungeonGate();
  const displayEntries = applyDungeonFog(enrichedEntries, isFoe, seed);

  // Import state lifted to App so Header can trigger it
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

  const handleExport = useCallback(() => exportBoard(displayEntries), [displayEntries]);

  const handleScarcityChange = useCallback((val) => {
    setScarcityModifier(val);
    saveAppConfig({ scarcityModifier: val });
  }, []);

  const handleLeagueSizeChange = useCallback((val) => {
    setLeagueSize(val);
    saveAppConfig({ leagueSize: val });
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
    // Clear all per-sport odds stores via DELETE
    const clearCalls = SPORTS.filter(s => s.active).map(s =>
      fetch(`/api/odds/${s.id}`, { method: 'DELETE' }).catch(() => {})
    );
    // Also clear legacy manual-odds store
    clearCalls.push(
      fetch('/api/manual-odds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {})
    );
    await Promise.all(clearCalls);
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
            leagueSize={leagueSize}
            onLeagueSizeChange={handleLeagueSizeChange}
          />
        }>
          <Route
            index
            element={
              <Dashboard
                boardEntries={displayEntries}
                ikynEVMap={ikynEVMap}
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
            element={<SportView boardEntries={displayEntries} ikynEVMap={ikynEVMap} onToggleDraft={toggleDrafted} />}
          />
          <Route
            path="player/:id"
            element={<PlayerDetail boardEntries={displayEntries} onToggleDraft={toggleDrafted} />}
          />
          <Route
            path="parse"
            element={<ParsePage onOddsSubmitted={refresh} />}
          />
          <Route
            path="draft"
            element={<DraftPage boardEntries={displayEntries} ikynEVMap={ikynEVMap} />}
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
