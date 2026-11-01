import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { GameMetadata, GameAnalysisResult } from '../types/chess';
import { storageService } from '../storage/indexedDb';
import { PlayerAnalytics } from '../services/playerAnalytics';
import {
  Scale,
  AlertCircle,
  TrendingUp,
  BarChart3,
  ArrowRight,
  Award,
  CheckCircle2,
  Calendar,
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
  const [activeTab, setActiveTab] = useState<'cards' | 'charts'>('cards');

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
        if (g.white) counts[g.white] = (counts[g.white] || 0) + 1;
        if (g.black) counts[g.black] = (counts[g.black] || 0) + 1;
      });
      const topUser = Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b
      );
      setUsername(topUser);
    }
  };

  const detectedPlayers = useMemo(() => {
    const counts: Record<string, number> = {};
    games.forEach((g) => {
      if (g.white) counts[g.white] = (counts[g.white] || 0) + 1;
      if (g.black) counts[g.black] = (counts[g.black] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [games]);

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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Scale className="h-6 w-6 text-emerald-400 shrink-0" />
            <span>Oldest vs. Recent Cohort Comparison</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track your chess improvement trajectory by contrasting your earliest recorded games with your most recent games.
          </p>
        </div>

        {/* Player Selector & Sample size buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {detectedPlayers.length > 1 && (
            <select
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {detectedPlayers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {[10, 25, 50, 100].map((size) => (
              <button
                key={size}
                onClick={() => setSampleSize(size)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  sampleSize === size
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overlap alert if applicable */}
      {comparison?.hasOverlap && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3 text-amber-300 text-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-bold">Cohort Overlap Notice:</span> You currently have {games.length} total games. The oldest {comparison.oldestSample.gameCount} and recent {comparison.recentSample.gameCount} samples share {comparison.overlapCount} overlapping games. Import more historical games to generate completely disjoint cohorts.
          </div>
        </div>
      )}

      {comparison ? (
        <div className="space-y-6">
          {/* Subnavigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setActiveTab('cards')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'cards'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Side-by-Side Scorecards &amp; Deltas</span>
            </button>

            <button
              onClick={() => setActiveTab('charts')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'charts'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Comparative Progression Chart</span>
            </button>
          </div>

          {activeTab === 'cards' && (
            <div className="space-y-6">
              {/* Side by side comparison cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Oldest Sample Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">
                      {comparison.oldestSample.label}
                    </span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{comparison.oldestSample.dateRange.from} — {comparison.oldestSample.dateRange.to}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
                    <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                      <span className="text-xs text-slate-400 block mb-1">Average Accuracy</span>
                      <span className="text-2xl font-extrabold text-white font-mono">
                        {comparison.oldestSample.avgAccuracy}%
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                      <span className="text-xs text-slate-400 block mb-1">Win Rate</span>
                      <span className="text-2xl font-extrabold text-white font-mono">
                        {comparison.oldestSample.winRate}%
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                      <span className="text-xs text-slate-400 block mb-1">Centipawn Loss</span>
                      <span className="text-2xl font-extrabold text-slate-300 font-mono">
                        {comparison.oldestSample.avgAcpl} <span className="text-xs text-slate-500 font-normal">cp</span>
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                      <span className="text-xs text-slate-400 block mb-1">Blunders / Game</span>
                      <span className="text-2xl font-extrabold text-rose-400 font-mono">
                        {comparison.oldestSample.blundersPerGame}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Sample Card */}
                <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 sm:p-6 shadow-md relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      {comparison.recentSample.label}
                    </span>
                    <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{comparison.recentSample.dateRange.from} — {comparison.recentSample.dateRange.to}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-4">
                    <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 block mb-1">Average Accuracy</span>
                        {comparison.deltaAccuracy !== 0 && (
                          <span
                            className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                              comparison.deltaAccuracy > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
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

                    <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 block mb-1">Win Rate</span>
                        {comparison.deltaWinRate !== 0 && (
                          <span
                            className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                              comparison.deltaWinRate > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
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

                    <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 block mb-1">Centipawn Loss</span>
                        {comparison.deltaAcpl !== 0 && (
                          <span
                            className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                              comparison.deltaAcpl < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {comparison.deltaAcpl > 0 ? '+' : ''}
                            {comparison.deltaAcpl} cp
                          </span>
                        )}
                      </div>
                      <span className="text-2xl font-extrabold text-slate-300 font-mono">
                        {comparison.recentSample.avgAcpl} <span className="text-xs text-slate-500 font-normal">cp</span>
                      </span>
                    </div>

                    <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-400 block mb-1">Blunders / Game</span>
                        {comparison.deltaBlunders !== 0 && (
                          <span
                            className={`text-xs font-bold font-mono px-1.5 py-0.5 rounded ${
                              comparison.deltaBlunders < 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
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

              {/* Growth Summary Highlights */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Award className="h-4 w-4 text-emerald-400" />
                  <span>Key Progression Takeaways</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3">
                    <CheckCircle2 className={`h-5 w-5 ${comparison.deltaAccuracy >= 0 ? 'text-emerald-400' : 'text-slate-500'} shrink-0`} />
                    <div>
                      <div className="font-bold text-slate-200">
                        {comparison.deltaAccuracy >= 0 ? 'Accuracy Gained' : 'Accuracy Change'}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {comparison.deltaAccuracy >= 0
                          ? `Up by ${comparison.deltaAccuracy}% compared to early games.`
                          : `Down by ${Math.abs(comparison.deltaAccuracy)}% across cohorts.`}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3">
                    <CheckCircle2 className={`h-5 w-5 ${comparison.deltaAcpl <= 0 ? 'text-emerald-400' : 'text-slate-500'} shrink-0`} />
                    <div>
                      <div className="font-bold text-slate-200">
                        {comparison.deltaAcpl <= 0 ? 'Tighter Moves' : 'Centipawn Loss'}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {comparison.deltaAcpl <= 0
                          ? `ACPL improved by ${Math.abs(comparison.deltaAcpl)} cp per move.`
                          : `ACPL drifted by ${comparison.deltaAcpl} cp per move.`}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex items-center gap-3">
                    <CheckCircle2 className={`h-5 w-5 ${comparison.deltaBlunders <= 0 ? 'text-emerald-400' : 'text-slate-500'} shrink-0`} />
                    <div>
                      <div className="font-bold text-slate-200">
                        {comparison.deltaBlunders <= 0 ? 'Fewer Blunders' : 'Blunder Rate'}
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        {comparison.deltaBlunders <= 0
                          ? `Blunders reduced by ${Math.abs(comparison.deltaBlunders)} per game.`
                          : `Blunder rate increased by ${comparison.deltaBlunders} per game.`}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-emerald-400" />
                  <span>Metric Progression Bar Chart</span>
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  Sample: {comparison.oldestSample.gameCount} vs {comparison.recentSample.gameCount}
                </span>
              </div>

              <div className="h-72 sm:h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="metric" stroke="#64748b" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '0.75rem' }}
                    />
                    <Legend />
                    <Bar dataKey="Oldest" fill="#64748b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Recent" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-16 text-center space-y-3 bg-slate-900 border border-slate-800 rounded-2xl">
          <Scale className="h-10 w-10 text-slate-600 mx-auto" />
          <h2 className="text-base font-bold text-white">No Games Available for Comparison</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Import your match archives to track your long-term growth and calculate metric differentials.
          </p>
          <div className="pt-2">
            <Link
              to="/import"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
            >
              <span>Import Games</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
