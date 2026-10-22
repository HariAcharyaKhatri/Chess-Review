import React, { useState, useEffect } from 'react';
import { GameMetadata, GameAnalysisResult } from '../types/chess';
import { storageService } from '../storage/indexedDb';
import { PlayerAnalytics } from '../services/playerAnalytics';
import {
  Scale,
  AlertCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const ComparePage: React.FC = () => {
  const [games, setGames] = useState<GameMetadata[]>([]);
  const [resultsMap, setResultsMap] = useState<Map<string, GameAnalysisResult>>(new Map());
  const [username, setUsername] = useState('');
  const [sampleSize, setSampleSize] = useState(25);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedGames = await storageService.getAllGames();
    const loadedResults = await storageService.getAllAnalysisResults();
    setGames(loadedGames);

    const map = new Map<string, GameAnalysisResult>();
    loadedResults.forEach((r) => map.set(r.gameId, r));
    setResultsMap(map);

    if (loadedGames.length > 0) {
      const counts: Record<string, number> = {};
      loadedGames.forEach((g) => {
        counts[g.white] = (counts[g.white] || 0) + 1;
        counts[g.black] = (counts[g.black] || 0) + 1;
      });
      const topUser = Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b
      );
      setUsername(topUser);
    }
  };

  const comparison =
    username && games.length > 0
      ? PlayerAnalytics.compareOldestVsRecent(username, games, resultsMap, sampleSize)
      : null;

  const chartData = comparison
    ? [
        {
          metric: 'Accuracy (%)',
          Oldest: comparison.oldestSample.avgAccuracy,
          Recent: comparison.recentSample.avgAccuracy,
        },
        {
          metric: 'Win Rate (%)',
          Oldest: comparison.oldestSample.winRate,
          Recent: comparison.recentSample.winRate,
        },
        {
          metric: 'Avg CPL (cp)',
          Oldest: comparison.oldestSample.avgAcpl,
          Recent: comparison.recentSample.avgAcpl,
        },
        {
          metric: 'Blunders/Game (x10)',
          Oldest: comparison.oldestSample.blundersPerGame * 10,
          Recent: comparison.recentSample.blundersPerGame * 10,
        },
      ]
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Scale className="h-7 w-7 text-emerald-400" />
            <span>Oldest vs. Recent Games Comparison</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Quantify your chess growth by comparing your earliest saved games against your most recent games.
          </p>
        </div>

        {/* Sample size buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Sample:</span>
          {[10, 25, 50, 100].map((size) => (
            <button
              key={size}
              onClick={() => setSampleSize(size)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                sampleSize === size
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {size} vs {size}
            </button>
          ))}
        </div>
      </div>

      {/* Overlap alert if applicable */}
      {comparison?.hasOverlap && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-300 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold">Sample Overlap Notice:</span> You have a total of {games.length} games. The oldest {comparison.oldestSample.gameCount} and recent {comparison.recentSample.gameCount} samples share {comparison.overlapCount} overlapping games. Import more historical games for completely independent comparison cohorts.
          </div>
        </div>
      )}

      {comparison ? (
        <>
          {/* Side by side comparison cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Oldest Sample Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                  {comparison.oldestSample.label}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {comparison.oldestSample.dateRange.from} — {comparison.oldestSample.dateRange.to}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-xs text-slate-400 block mb-1">Average Accuracy</span>
                  <span className="text-2xl font-extrabold text-white font-mono">
                    {comparison.oldestSample.avgAccuracy}%
                  </span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-xs text-slate-400 block mb-1">Win Rate</span>
                  <span className="text-2xl font-extrabold text-white font-mono">
                    {comparison.oldestSample.winRate}%
                  </span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-xs text-slate-400 block mb-1">Avg Centipawn Loss</span>
                  <span className="text-2xl font-extrabold text-slate-300 font-mono">
                    {comparison.oldestSample.avgAcpl} cp
                  </span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <span className="text-xs text-slate-400 block mb-1">Blunders / Game</span>
                  <span className="text-2xl font-extrabold text-rose-400 font-mono">
                    {comparison.oldestSample.blundersPerGame}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Sample Card */}
            <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-md relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {comparison.recentSample.label}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {comparison.recentSample.dateRange.from} — {comparison.recentSample.dateRange.to}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 block mb-1">Average Accuracy</span>
                    {comparison.deltaAccuracy !== 0 && (
                      <span
                        className={`text-xs font-bold font-mono flex items-center ${
                          comparison.deltaAccuracy > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {comparison.deltaAccuracy > 0 ? '+' : ''}
                        {comparison.deltaAccuracy}%
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-emerald-400 font-mono">
                    {comparison.recentSample.avgAccuracy}%
                  </span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 block mb-1">Win Rate</span>
                    {comparison.deltaWinRate !== 0 && (
                      <span
                        className={`text-xs font-bold font-mono flex items-center ${
                          comparison.deltaWinRate > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {comparison.deltaWinRate > 0 ? '+' : ''}
                        {comparison.deltaWinRate}%
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-white font-mono">
                    {comparison.recentSample.winRate}%
                  </span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 block mb-1">Avg Centipawn Loss</span>
                    {comparison.deltaAcpl !== 0 && (
                      <span
                        className={`text-xs font-bold font-mono flex items-center ${
                          comparison.deltaAcpl < 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {comparison.deltaAcpl > 0 ? '+' : ''}
                        {comparison.deltaAcpl} cp
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-slate-300 font-mono">
                    {comparison.recentSample.avgAcpl} cp
                  </span>
                </div>

                <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 block mb-1">Blunders / Game</span>
                    {comparison.deltaBlunders !== 0 && (
                      <span
                        className={`text-xs font-bold font-mono flex items-center ${
                          comparison.deltaBlunders < 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {comparison.deltaBlunders > 0 ? '+' : ''}
                        {comparison.deltaBlunders}
                      </span>
                    )}
                  </div>
                  <span className="text-2xl font-extrabold text-rose-400 font-mono">
                    {comparison.recentSample.blundersPerGame}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Comparison Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md">
            <h2 className="text-base font-bold text-white mb-4">Visual Progression Chart</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="metric" stroke="#64748b" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b' }}
                  />
                  <Legend />
                  <Bar dataKey="Oldest" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Recent" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="p-12 text-center text-slate-500">
          No games available for comparison. Import games in the Analysis tab.
        </div>
      )}
    </div>
  );
};
