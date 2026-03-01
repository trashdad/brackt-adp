import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { DungeonGateProvider } from './context/DungeonGateContext';
import DungeonGateOverlay from './components/DungeonGateOverlay';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <DungeonGateProvider>
          <App />
          <DungeonGateOverlay />
        </DungeonGateProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
