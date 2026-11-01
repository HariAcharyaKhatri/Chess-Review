import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GameMetadata, GameAnalysisResult, EngineSettings, AnalysisSession, BenchmarkResult } from '../types/chess';
import { storageService, DEFAULT_SETTINGS } from '../storage/indexedDb';
import { sessionManager } from '../analysis/sessionManager';
import { engineClient } from '../engine/engineClient';
import { DeviceMonitor } from '../services/deviceMonitor';
import { GameTable } from '../components/GameTable/GameTable';
import {
  Play,
  Cpu,
  Layers,
  BarChart2,
  Activity,
  History,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Upload,
} from 'lucide-react';

export const AnalysisPage: React.FC = () => {
  const navigate = useNavigate();

  const [games, setGames] = useState<GameMetadata[]>([]);
  const [resultsMap, setResultsMap] = useState<Map<string, GameAnalysisResult>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pastSessions, setPastSessions] = useState<AnalysisSession[]>([]);

  // 3-Step Wizard: 1 = Select Games, 2 = Engine Budget, 3 = Launch & Monitor
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Settings & Auto-config
  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);
  const [autoConfig, setAutoConfig] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Benchmarking state
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | undefined>(undefined);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    const loadedGames = await storageService.getAllGames();
    const loadedResults = await storageService.getAllAnalysisResults();
    const loadedSettings = await storageService.getSettings();
    const loadedSessions = await storageService.getAllSessions();
    const latestBenchmark = await storageService.getLatestBenchmark();

    setGames(loadedGames);
    setSettings(loadedSettings);
    setPastSessions(loadedSessions.reverse());
    setBenchmarkResult(latestBenchmark);

    const map = new Map<string, GameAnalysisResult>();
    loadedResults.forEach((r) => map.set(r.gameId, r));
    setResultsMap(map);

    // Apply auto-config if enabled
    if (autoConfig) {
      const caps = await DeviceMonitor.getDeviceCapabilities();
      setSettings((prev) => ({
        ...prev,
        preset: caps.recommendedPreset,
        depth: caps.recommendedDepth,
      }));
    }

    // Default select first 10
    if (loadedGames.length > 0) {
      setSelectedIds(new Set(loadedGames.slice(0, 10).map((g) => g.id)));
    }
  };

  const handleToggleSelect = (gameId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
      } else {
        next.add(gameId);
      }
      return next;
    });
  };

  const handleSelectPreset = (preset: string) => {
    if (preset === 'all') {
      setSelectedIds(new Set(games.map((g) => g.id)));
    } else if (preset === 'first10') {
      setSelectedIds(new Set(games.slice(0, 10).map((g) => g.id)));
    } else if (preset === 'unreviewed') {
      const unreviewed = games.filter((g) => !resultsMap.has(g.id)).map((g) => g.id);
      setSelectedIds(new Set(unreviewed));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleStartAnalysis = async () => {
    if (selectedIds.size === 0) return;
    setIsStartingSession(true);
    setSessionError(null);

    try {
      await storageService.saveSettings(settings);

      const gamesToAnalyse = games.filter((g) => selectedIds.has(g.id));
      if (gamesToAnalyse.length === 0) {
        throw new Error('No valid games selected for analysis');
      }

      const inferredPlayer = gamesToAnalyse[0]?.white || undefined;

      const session = await sessionManager.createSession(
        gamesToAnalyse,
        settings,
        gamesToAnalyse.length === 1
          ? `Review: ${gamesToAnalyse[0].white} vs ${gamesToAnalyse[0].black}`
          : `Batch Analysis (${gamesToAnalyse.length} Games)`,
        inferredPlayer
      );

      sessionManager.startSession(session.id);
      navigate(`/analysis/session/${encodeURIComponent(session.id)}`);
    } catch (err: any) {
      setSessionError(err.message || 'Failed to start analysis session');
      setIsStartingSession(false);
    }
  };

  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const res = await engineClient.runBenchmark(10);
      await storageService.saveBenchmark(res);
      setBenchmarkResult(res);
    } catch (err) {
      console.warn('Benchmark error:', err);
    } finally {
      setIsBenchmarking(false);
    }
  };

  const handleAnalyseSingleGame = async (game: GameMetadata) => {
    try {
      await storageService.saveSettings(settings);
      const session = await sessionManager.createSession(
        [game],
        settings,
        `Review: ${game.white} vs ${game.black}`
      );
      sessionManager.startSession(session.id);
      navigate(`/analysis/session/${encodeURIComponent(session.id)}`);
    } catch (err: any) {
      setSessionError(err.message || 'Failed to start single game analysis');
    }
  };

  const selectedGames = games.filter((g) => selectedIds.has(g.id));
  const avgPlies =
    selectedGames.length > 0
      ? Math.round(
          selectedGames.reduce((acc, g) => acc + (g.plyCount || 60), 0) / selectedGames.length
        )
      : 60;

  const workloadEstimate = DeviceMonitor.estimateWorkload(
    selectedGames.length,
    avgPlies,
    settings.depth,
    benchmarkResult?.measuredNps
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Cpu className="h-7 w-7 text-emerald-400" />
            <span>Stockfish Analysis Launchpad</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Choose games from your library, fine-tune the engine budget, and initiate dedicated analysis.
          </p>
        </div>

        <Link
          to="/import"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-emerald-400 hover:text-emerald-300 text-xs font-bold transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          <span>Import More Games</span>
        </Link>
      </div>

      {/* 3-Step Wizard Navigation Bar */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900 border border-slate-800 rounded-2xl p-1.5 text-xs font-bold shadow-md">
        <button
          onClick={() => setWizardStep(1)}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            wizardStep === 1
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-slate-950/60 flex items-center justify-center text-[11px] font-mono">1</span>
          <span className="hidden sm:inline">Select Games</span>
          <span className="text-[11px] font-mono opacity-80">({selectedIds.size})</span>
        </button>

        <button
          onClick={() => setWizardStep(2)}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            wizardStep === 2
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-slate-950/60 flex items-center justify-center text-[11px] font-mono">2</span>
          <span className="hidden sm:inline">Engine Budget</span>
          <span className="text-[11px] font-mono opacity-80">(D{settings.depth})</span>
        </button>

        <button
          onClick={() => setWizardStep(3)}
          className={`py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            wizardStep === 3
              ? 'bg-emerald-600 text-white shadow'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <span className="h-5 w-5 rounded-full bg-slate-950/60 flex items-center justify-center text-[11px] font-mono">3</span>
          <span className="hidden sm:inline">Review &amp; Launch</span>
        </button>
      </div>

      {/* STEP 1: GAME SELECTION */}
      {wizardStep === 1 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-3">
            <div>
              <h2 className="text-sm font-bold text-white">Select Games to Evaluate</h2>
              <p className="text-xs text-slate-400">
                {games.length} games available. {selectedIds.size} currently checked.
              </p>
            </div>

            <button
              onClick={() => setWizardStep(2)}
              disabled={selectedIds.size === 0}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next: Engine Budget</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {games.length > 0 ? (
            <GameTable
              games={games}
              resultsMap={resultsMap}
              selectedGameIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelectPreset={handleSelectPreset}
              onAnalyseGame={handleAnalyseSingleGame}
            />
          ) : (
            <div className="p-16 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <Layers className="h-10 w-10 mx-auto text-slate-600" />
              <h3 className="text-base font-bold text-white">No Games in Library Yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Import your recent matches from Chess.com, Lichess, or upload PGN files to start reviewing.
              </p>
              <Link
                to="/import"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Go to Game Import</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: ENGINE BUDGET CONFIGURATION */}
      {wizardStep === 2 && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Presets & Depth */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-emerald-400" />
                  <span>Stockfish Depth Preset</span>
                </h3>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoConfig}
                    onChange={(e) => setAutoConfig(e.target.checked)}
                    className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span>Device Auto-Tune</span>
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  { id: 'fast', label: 'Fast', depth: 10, time: 800, desc: 'Quick blunders' },
                  { id: 'balanced', label: 'Balanced', depth: 12, time: 1500, desc: 'Standard review' },
                  { id: 'deep', label: 'Deep', depth: 15, time: 3000, desc: 'Deep tactics' },
                  { id: 'master', label: 'Master', depth: 18, time: 5000, desc: 'Top precision' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setAutoConfig(false);
                      setSettings((prev) => ({
                        ...prev,
                        preset: p.id as any,
                        depth: p.depth,
                        movetimeMs: p.time,
                      }));
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      settings.preset === p.id
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-sm'
                        : 'bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-bold text-sm">{p.label}</div>
                    <div className="text-[11px] font-mono text-slate-400">Depth {p.depth}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs text-slate-300 font-semibold mb-1">
                    <span>Fine-tune Depth:</span>
                    <span className="font-mono text-emerald-400">Depth {settings.depth}</span>
                  </div>
                  <input
                    type="range"
                    min={8}
                    max={20}
                    value={settings.depth}
                    onChange={(e) => {
                      setAutoConfig(false);
                      setSettings((prev) => ({ ...prev, depth: parseInt(e.target.value, 10), preset: 'custom' as any }));
                    }}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>8 (Fastest)</span>
                    <span>14 (Standard)</span>
                    <span>20 (Deepest)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-semibold block mb-1">Session Maximum Duration</label>
                  <select
                    value={settings.sessionTimeLimitMinutes}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        sessionTimeLimitMinutes: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value={3}>3 Minutes (Short batch)</option>
                    <option value={5}>5 Minutes</option>
                    <option value={10}>10 Minutes (Recommended)</option>
                    <option value={20}>20 Minutes</option>
                    <option value={0}>Unlimited (Full completion)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Performance Capabilities */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-400" />
                <span>Device Stockfish Capability</span>
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                Stockfish WebAssembly executes locally on your device without transmitting chess games to third-party cloud servers.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Engine Build:</span>
                  <span className="font-mono text-emerald-400 font-bold">Stockfish 16+ WASM</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Worker Architecture:</span>
                  <span className="font-mono text-slate-200">Dedicated Blob Web Worker</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Engine Hash Memory:</span>
                  <span className="font-mono text-slate-200">32 MB Transposition Table</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRunBenchmark}
                  disabled={isBenchmarking}
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>{isBenchmarking ? 'Testing Speed...' : 'Run CPU Benchmark'}</span>
                </button>

                {benchmarkResult && (
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    {(benchmarkResult.measuredNps / 1000).toFixed(0)}k Nodes/Sec
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setWizardStep(1)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back: Select Games</span>
            </button>

            <button
              onClick={() => setWizardStep(3)}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Next: Review &amp; Launch</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: REVIEW & LAUNCH */}
      {wizardStep === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Workload Summary Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-emerald-400" />
                  <span>Session Workload Estimation</span>
                </h3>

                <div className="space-y-3 mt-4 text-xs">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Games to Evaluate:</span>
                      <strong className="text-white font-mono">{selectedGames.length} games</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Stockfish Depth:</span>
                      <strong className="text-emerald-400 font-mono">Depth {settings.depth}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estimated Duration:</span>
                      <strong className="text-emerald-400 font-mono">
                        ~{Math.ceil(workloadEstimate.estimatedSeconds / 60)} min ({workloadEstimate.estimatedSeconds}s)
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Device Load Comfort:</span>
                      <strong className="text-slate-200">{workloadEstimate.comfortLevel}</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Once launched, you will be taken to a dedicated analysis session page showing live Stockfish UCI output, nodes per second, and running accuracy averages.
                  </p>
                </div>
              </div>

              {sessionError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  {sessionError}
                </div>
              )}
            </div>

            {/* Ready to Launch Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/50 border border-emerald-500/30 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                  <Play className="h-6 w-6 ml-0.5" />
                </div>
                <h3 className="text-xl font-extrabold text-white">
                  Ready to Launch Analysis
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Start analyzing {selectedGames.length} game{selectedGames.length === 1 ? '' : 's'} with local Stockfish WASM. You can pause, resume, or stop after any game at any time.
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={selectedIds.size === 0 || isStartingSession}
                className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-xl shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Play className="h-5 w-5" />
                <span>{isStartingSession ? 'Initializing Stockfish...' : `Start Session (${selectedGames.length} Games)`}</span>
              </button>
            </div>
          </div>

          {/* Stepper Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setWizardStep(2)}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back: Engine Budget</span>
            </button>
          </div>

          {/* Recent Past Sessions */}
          {pastSessions.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-400" />
                  <span>Recent Analysis Sessions</span>
                </h3>
                <span className="text-xs text-slate-500">{pastSessions.length} saved sessions</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pastSessions.slice(0, 3).map((s) => (
                  <Link
                    key={s.id}
                    to={`/analysis/session/${encodeURIComponent(s.id)}`}
                    className="bg-slate-950 p-3 rounded-xl border border-slate-800 hover:border-emerald-500/40 transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-200 truncate max-w-[180px]">{s.title}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">
                        {s.completedGameIds.length}/{s.games.length} completed • Depth {s.settings.depth}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        s.status === 'completed'
                          ? 'bg-teal-500/20 text-teal-300'
                          : s.status === 'running'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {s.status}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
