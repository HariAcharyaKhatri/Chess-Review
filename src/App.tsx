import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { AnalysisPage } from './pages/AnalysisPage';
import { SessionAnalysisPage } from './pages/SessionAnalysisPage';
import { ReviewPage } from './pages/ReviewPage';
import { PlayerPage } from './pages/PlayerPage';
import { ComparePage } from './pages/ComparePage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

export const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/analysis/session/:sessionId" element={<SessionAnalysisPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/player" element={<PlayerPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/guide" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>Chess Player Analytics &amp; Review System</span>
            <span>Powered by Stockfish WASM • GPLv3 Compliant • 100% Client-Side</span>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
};

export default App;
