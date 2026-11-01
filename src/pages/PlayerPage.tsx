import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
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
  BookOpen,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Layers,
} from 'lucide-react';

export const PlayerPage: React.FC = () => {
  const [games, setGames] = useState<GameMetadata[]>([]);
  const [resultsMap, setResultsMap] = useState<Map<string, GameAnalysisResult>>(new Map());
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'progression' | 'openings'>('overview');

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

      setSelectedUser(topUser);
      const generated = PlayerAnalytics.generateStats(topUser, loadedGames, map);
      setStats(generated);
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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mx-auto">
          <User className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-white">No Player Data Available</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Import your matches from Chess.com or Lichess and run Stockfish analysis to view detailed player KPIs.
        </p>
        <div className="pt-2">
          <Link
            to="/import"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
          >
            <span>Import Games</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const totalGames = stats.wins + stats.losses + stats.draws;
  const winPercent = totalGames > 0 ? (stats.wins / totalGames) * 100 : 0;
  const lossPercent = totalGames > 0 ? (stats.losses / totalGames) * 100 : 0;
  const drawPercent = totalGames > 0 ? (stats.draws / totalGames) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">{stats.username}</h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {stats.totalGames} Games
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Performance metrics, rating timeline &amp; tactical profile
            </p>
          </div>
        </div>

        {/* Player Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {detectedPlayers.length > 1 && (
            <select
              value={selectedUser}
              onChange={(e) => handleUserChange(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {detectedPlayers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.count} games)
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Printer className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
        </div>
      </div>

      {/* Modern Tab Navigation (Page-Based Navigation) */}
      <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          <span>Overview &amp; KPIs</span>
        </button>

        <button
          onClick={() => setActiveTab('progression')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'progression'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Progression &amp; Time Controls</span>
        </button>

        <button
          onClick={() => setActiveTab('openings')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'openings'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <BookOpen className="h-4 w-4" />
          <span>Openings Repertoire</span>
        </button>
      </div>

      {/* Tab 1: Overview & KPIs */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Win Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Win Rate</span>
                <Trophy className="h-4 w-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                {stats.winRate}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {stats.wins}W • {stats.losses}L • {stats.draws}D
              </div>
            </div>

            {/* Overall Accuracy */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Accuracy</span>
                <Target className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono">
                {stats.averageAccuracy}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                W: {stats.averageWhiteAccuracy}% • B: {stats.averageBlackAccuracy}%
              </div>
            </div>

            {/* Avg Centipawn Loss */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Avg Centipawn Loss</span>
                <TrendingUp className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                {stats.averageAcpl} <span className="text-xs text-slate-400 font-normal">cp</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {stats.analyzedGames} analyzed games
              </div>
            </div>

            {/* Blunders per game */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>Blunders / Game</span>
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-rose-400 font-mono">
                {stats.blundersPerGame}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Mistakes: {stats.mistakesPerGame} / game
              </div>
            </div>
          </div>

          {/* Visual Outcome Ratio Bar & Color Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Match Outcome Distribution</span>
              </h2>
              <span className="text-xs text-slate-400 font-mono">{totalGames} total games</span>
            </div>

            {/* Segmented outcome bar */}
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-950">
              <div
                style={{ width: `${winPercent}%` }}
                className="bg-emerald-500 transition-all"
                title={`Wins: ${stats.wins} (${winPercent.toFixed(1)}%)`}
              />
              <div
                style={{ width: `${drawPercent}%` }}
                className="bg-slate-500 transition-all"
                title={`Draws: ${stats.draws} (${drawPercent.toFixed(1)}%)`}
              />
              <div
                style={{ width: `${lossPercent}%` }}
                className="bg-rose-500 transition-all"
                title={`Losses: ${stats.losses} (${lossPercent.toFixed(1)}%)`}
              />
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-emerald-400 font-bold font-mono text-base">{stats.wins}</div>
                <div className="text-slate-400 text-[11px]">Wins ({winPercent.toFixed(0)}%)</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-slate-300 font-bold font-mono text-base">{stats.draws}</div>
                <div className="text-slate-400 text-[11px]">Draws ({drawPercent.toFixed(0)}%)</div>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                <div className="text-rose-400 font-bold font-mono text-base">{stats.losses}</div>
                <div className="text-slate-400 text-[11px]">Losses ({lossPercent.toFixed(0)}%)</div>
              </div>
            </div>
          </div>

          {/* Quick Hub Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/compare"
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/40 p-4 rounded-2xl flex items-center justify-between group transition-all"
            >
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                  Growth Tracking
                </span>
                <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                  Compare Oldest vs. Recent Games
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Measure accuracy gains and blunder reduction over time.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all shrink-0" />
            </Link>

            <Link
              to="/drills"
              className="bg-slate-900 border border-slate-800 hover:border-teal-500/40 p-4 rounded-2xl flex items-center justify-between group transition-all"
            >
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider block mb-1">
                  Tactical Training
                </span>
                <h3 className="text-sm font-bold text-white group-hover:text-teal-300 transition-colors">
                  Practice Mistakes in Tactical Drills
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Replay mistakes from your analyzed games with Stockfish guidance.
                </p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-teal-400 group-hover:translate-x-1 transition-all shrink-0" />
            </Link>
          </div>
        </div>
      )}

      {/* Tab 2: Progression Charts & Time Controls */}
      {activeTab === 'progression' && (
        <div className="space-y-6">
          {/* Rating History Timeline */}
          {stats.ratingHistory.length > 1 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span>Rating Progression Timeline</span>
                </h2>
                <span className="text-xs text-slate-500">
                  {stats.ratingHistory.length} data points
                </span>
              </div>
              <div className="h-64 sm:h-72 w-full">
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
                            <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl text-xs shadow-xl">
                              <span className="font-bold text-slate-200 block mb-0.5">{p.date}</span>
                              <span className="text-emerald-400 font-mono font-bold">
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
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              Multiple timestamped games are needed to render a rating progression timeline.
            </div>
          )}

          {/* Time Controls Performance */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md">
            <h2 className="text-sm sm:text-base font-bold text-white mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>Performance by Time Control</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {stats.timeControls.map((tc) => (
                <div
                  key={tc.timeClass}
                  className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/90 flex flex-col justify-between gap-3 text-xs capitalize"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                      <span className="font-bold text-slate-200 text-sm">{tc.timeClass}</span>
                    </div>
                    <span className="text-slate-500 font-mono">{tc.games} games</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Win Rate</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">
                        {tc.winRate}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">Record</span>
                      <span className="text-xs font-mono text-slate-300">
                        {tc.wins}W / {tc.losses}L
                      </span>
                    </div>
                  </div>

                  {tc.averageAccuracy > 0 && (
                    <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between bg-slate-900 px-2 py-1 rounded">
                      <span>Avg Accuracy:</span>
                      <strong className="text-slate-200">{tc.averageAccuracy}%</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Openings Repertoire */}
      {activeTab === 'openings' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <span>Top Openings &amp; Repertoire Performance</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluated from your games with win rate and engine accuracy metrics.
              </p>
            </div>
            <Link
              to="/openings"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <span>Explore All Theory</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {stats.openings.slice(0, 10).map((op) => (
              <div
                key={op.name}
                className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-[200px]">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                    {op.eco}
                  </span>
                  <div>
                    <span className="font-bold text-slate-200 block">{op.name}</span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {op.wins + op.losses} recorded games
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-5 font-mono">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Record</span>
                    <span className="text-slate-300 font-semibold">{op.wins}W / {op.losses}L</span>
                  </div>

                  <div className="text-right w-16">
                    <span className="text-[10px] text-slate-500 block">Win Rate</span>
                    <span className={`font-bold ${op.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {op.winRate}%
                    </span>
                  </div>

                  {op.averageAccuracy > 0 && (
                    <div className="text-right w-16 hidden sm:block">
                      <span className="text-[10px] text-slate-500 block">Accuracy</span>
                      <span className="text-slate-200 font-semibold">{op.averageAccuracy}%</span>
                    </div>
                  )}

                  <Link
                    to={`/openings?eco=${encodeURIComponent(op.eco)}`}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="View in Opening Explorer"
                  >
                    <Layers className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
