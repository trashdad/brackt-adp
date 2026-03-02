import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import { useTheme } from '../../context/ThemeContext';

export default function Layout({ onExport, onImportClick, importStatus }) {
  const { theme } = useTheme();

  return (
    <div className={`flex flex-col h-screen relative overflow-hidden ${theme === 'win95' ? 'bg-[#c0c0c0]' : 'bg-retro-bg'}`} data-theme={theme}>
      {/* Global scanline overlay */}
      {theme !== 'win95' && (
        <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
      )}

      <Header onExport={onExport} onImportClick={onImportClick} importStatus={importStatus} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6 lg:p-10 relative">
          <div className="max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
