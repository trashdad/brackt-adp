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

export default function App() {
  const { entries, loading, lastUpdated, refresh } = useOddsData();
  const { boardEntries, toggleDrafted, resetDraft } = useDraftBoard(entries);

  return (
    <ScraperProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route
            index
            element={
              <Dashboard
                boardEntries={boardEntries}
                loading={loading}
                lastUpdated={lastUpdated}
                onToggleDraft={toggleDrafted}
                onRefresh={refresh}
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
            element={<Settings onResetDraft={resetDraft} />}
          />
        </Route>
      </Routes>
    </ScraperProvider>
  );
}
