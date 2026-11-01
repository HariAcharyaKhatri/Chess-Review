import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { HomePage } from './pages/HomePage';
import { ImportPage } from './pages/ImportPage';
import { AnalysisPage } from './pages/AnalysisPage';
import { SessionAnalysisPage } from './pages/SessionAnalysisPage';
import { ReviewPage } from './pages/ReviewPage';
import { GameReportPage } from './pages/GameReportPage';
import { DrillsPage } from './pages/DrillsPage';
import { OpeningsPage } from './pages/OpeningsPage';
import { PlayerPage } from './pages/PlayerPage';
import { ComparePage } from './pages/ComparePage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';

export const App: React.FC = () => {
  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
        <Navbar />
        <main className="flex-1 pb-16 md:pb-0">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/import" element={<ImportPage />} />
            <Route path="/analysis" element={<AnalysisPage />} />
            <Route path="/analysis/session/:sessionId" element={<SessionAnalysisPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/report" element={<GameReportPage />} />
            <Route path="/report/:gameId" element={<GameReportPage />} />
            <Route path="/drills" element={<DrillsPage />} />
            <Route path="/openings" element={<OpeningsPage />} />
            <Route path="/player" element={<PlayerPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/guide" element={<AboutPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <MobileBottomNav />
        <footer className="border-t border-slate-800/80 bg-slate-950 py-4 text-center text-xs text-slate-500 hidden md:block">
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
