import React, { useState, useEffect } from 'react';
import { GameMetadata, GameAnalysisResult, PlayerStats } from '../types/chess';
import { storageService } from '../storage/indexedDb';
import { PlayerAnalytics } from '../services/playerAnalytics';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  User,
  Trophy,
  Target,
  AlertTriangle,
  Clock,
  Printer,
  BarChart3,
  TrendingUp,
} from 'lucide-react';

export const PlayerPage: React.FC = () => {
  const [games, setGames] = useState<GameMetadata[]>([]);
  const [resultsMap, setResultsMap] = useState<Map<string, GameAnalysisResult>>(new Map());
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [stats, setStats] = useState<PlayerStats | null>(null);

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

    // Auto-detect most frequent player
    if (loadedGames.length > 0) {
      const counts: Record<string, number> = {};
      loadedGames.forEach((g) => {
        counts[g.white] = (counts[g.white] || 0) + 1;
        counts[g.black] = (counts[g.black] || 0) + 1;
      });

      const topUser = Object.keys(counts).reduce((a, b) =>
        counts[a] > counts[b] ? a : b
      );

      setSelectedUser(topUser);
      const generated = PlayerAnalytics.generateStats(topUser, loadedGames, map);
      setStats(generated);
    }
  };

  const handleUserChange = (username: string) => {
    setSelectedUser(username);
    const generated = PlayerAnalytics.generateStats(username, games, resultsMap);
    setStats(generated);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!stats || games.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <User className="h-12 w-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Player Data Available</h2>
        <p className="text-sm text-slate-400">
          Import and analyze games from Chess.com or Lichess to view player metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <User className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white">{stats.username}</h1>
            <p className="text-xs text-slate-400">
              Career Statistics &amp; Engine Performance Overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* User selector */}
          <input
            type="text"
            value={selectedUser}
            onChange={(e) => handleUserChange(e.target.value)}
            placeholder="Change player..."
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          />

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Win Rate */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Win Rate</span>
            <Trophy className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats.winRate}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.wins}W • {stats.losses}L • {stats.draws}D
          </div>
        </div>

        {/* Overall Accuracy */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Accuracy</span>
            <Target className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono">
            {stats.averageAccuracy}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            W: {stats.averageWhiteAccuracy}% • B: {stats.averageBlackAccuracy}%
          </div>
        </div>

        {/* Avg Centipawn Loss */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Avg Centipawn Loss</span>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white font-mono">
            {stats.averageAcpl} <span className="text-xs text-slate-400 font-normal">cp</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {stats.analyzedGames} analyzed games
          </div>
        </div>

        {/* Blunders per game */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Blunders / Game</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 font-mono">
            {stats.blundersPerGame}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Mistakes: {stats.mistakesPerGame} / game
          </div>
        </div>
      </div>

      {/* Rating History Timeline */}
      {stats.ratingHistory.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span>Rating Progression</span>
          </h2>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.ratingHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" textAnchor="end" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 11 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const p = payload[0].payload;
                      return (
                        <div className="bg-slate-950 border border-slate-800 p-2 rounded text-xs shadow-lg">
                          <span className="font-bold text-slate-200">{p.date}</span>
                          <span className="block text-emerald-400 font-mono">
                            Rating: {p.rating}
                          </span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Opening & Time Controls Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Openings Performance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
            <span>Top Openings Performance</span>
          </h2>

          <div className="space-y-3">
            {stats.openings.slice(0, 6).map((op) => (
              <div
                key={op.name}
                className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
              >
                <div className="max-w-[200px] truncate">
                  <span className="font-mono text-emerald-400 font-semibold mr-1.5">
                    {op.eco}
                  </span>
                  <span className="font-medium text-slate-200">{op.name}</span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <span className="text-slate-400 font-mono">
                    {op.wins}W / {op.losses}L
                  </span>
                  <span className="font-bold text-emerald-400 font-mono w-12">
                    {op.winRate}%
                  </span>
                  {op.averageAccuracy > 0 && (
                    <span className="text-slate-300 font-mono w-12 text-[11px]">
                      {op.averageAccuracy}% acc
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Controls Performance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span>Time Control Breakdown</span>
          </h2>

          <div className="space-y-3">
            {stats.timeControls.map((tc) => (
              <div
                key={tc.timeClass}
                className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs capitalize"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                  <span className="font-bold text-slate-200">{tc.timeClass}</span>
                  <span className="text-slate-500">({tc.games} games)</span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <span className="text-slate-400 font-mono">
                    {tc.wins}W / {tc.losses}L
                  </span>
                  <span className="font-bold text-emerald-400 font-mono w-12">
                    {tc.winRate}%
                  </span>
                  {tc.averageAccuracy > 0 && (
                    <span className="text-slate-300 font-mono w-12 text-[11px]">
                      {tc.averageAccuracy}% acc
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
