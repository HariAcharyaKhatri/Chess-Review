import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { GameMetadata, GameAnalysisResult, EngineSettings, AnalysisSession, BenchmarkResult } from '../types/chess';
import { storageService, DEFAULT_SETTINGS } from '../storage/indexedDb';
import { sessionManager } from '../analysis/sessionManager';
import { engineClient } from '../engine/engineClient';
import { DeviceMonitor } from '../services/deviceMonitor';
import { ChessComImporter } from '../services/chessComImporter';
import { LichessImporter } from '../services/lichessImporter';
import { PgnParser } from '../chess/pgnParser';
import { GameTable } from '../components/GameTable/GameTable';
import {
  Play,
  Cpu,
  Layers,
  BarChart2,
  Upload,
  Activity,
  History,
} from 'lucide-react';

export const AnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [games, setGames] = useState<GameMetadata[]>([]);
  const [resultsMap, setResultsMap] = useState<Map<string, GameAnalysisResult>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pastSessions, setPastSessions] = useState<AnalysisSession[]>([]);

  // Form states
  const [platform, setPlatform] = useState<'chesscom' | 'lichess' | 'pgn_upload'>('chesscom');
  const [username, setUsername] = useState(searchParams.get('username') || '');
  const [pgnInput, setPgnInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Settings & Auto-config
  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);
  const [autoConfig, setAutoConfig] = useState(true);
  const [isStartingSession, setIsStartingSession] = useState(false);

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

  const handleFetchGames = async (e: React.FormEvent) => {
    e.preventDefault();
    setFetchError(null);
    setIsFetching(true);

    try {
      let fetched: GameMetadata[] = [];
      if (platform === 'chesscom') {
        if (!username.trim()) throw new Error('Enter a Chess.com username');
        fetched = await ChessComImporter.fetchGames(username, 6, 50);
      } else if (platform === 'lichess') {
        if (!username.trim()) throw new Error('Enter a Lichess username');
        fetched = await LichessImporter.fetchGames(username, 50);
      } else {
        if (!pgnInput.trim()) throw new Error('Enter or paste PGN text');
        const parsed = PgnParser.parseMultiPgn(pgnInput);
        if (parsed.length === 0) throw new Error('No valid PGN games found.');
        fetched = parsed.map((p) => p.metadata);
      }

      if (fetched.length === 0) {
        throw new Error('No games found for this player.');
      }

      await storageService.saveGames(fetched);
      const all = await storageService.getAllGames();
      setGames(all);
      setSelectedIds(new Set(fetched.slice(0, 20).map((g) => g.id)));
    } catch (err: any) {
      setFetchError(err.message || 'Failed to retrieve games');
    } finally {
      setIsFetching(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = PgnParser.parseMultiPgn(text);
        if (parsed.length === 0) {
          setFetchError('No valid games found in uploaded PGN file.');
          return;
        }
        const newGames = parsed.map((p) => p.metadata);
        await storageService.saveGames(newGames);
        const all = await storageService.getAllGames();
        setGames(all);
        setSelectedIds(new Set(newGames.map((g) => g.id)));
      } catch (err: any) {
        setFetchError('Failed to read PGN file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectPreset = (mode: string) => {
    const sorted = [...games].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (mode === 'clear') {
      setSelectedIds(new Set());
      return;
    }
    if (mode === 'all') {
      setSelectedIds(new Set(games.map((g) => g.id)));
      return;
    }

    if (mode.startsWith('recent_')) {
      const count = parseInt(mode.replace('recent_', ''), 10) || 10;
      setSelectedIds(new Set(sorted.slice(0, count).map((g) => g.id)));
    } else if (mode.startsWith('oldest_')) {
      const count = parseInt(mode.replace('oldest_', ''), 10) || 25;
      setSelectedIds(new Set(sorted.slice(-count).map((g) => g.id)));
    } else if (mode.startsWith('compare_')) {
      const count = parseInt(mode.replace('compare_', ''), 10) || 25;
      const oldest = sorted.slice(-count);
      const recent = sorted.slice(0, count);
      setSelectedIds(new Set([...oldest, ...recent].map((g) => g.id)));
    }
  };

  const handleStartAnalysis = async () => {
    if (isStartingSession) return;
    const selectedGames = games.filter((g) => selectedIds.has(g.id));
    if (selectedGames.length === 0) return;

    setIsStartingSession(true);

    try {
      await storageService.saveSettings(settings);

      const title =
        selectedGames.length === 1
          ? `Review: ${selectedGames[0].white} vs ${selectedGames[0].black}`
          : `Batch Analysis (${selectedGames.length} games)`;

      // Create session in SessionManager
      const session = await sessionManager.createSession(
        selectedGames,
        settings,
        title,
        username || undefined
      );

      // Start the session
      sessionManager.startSession(session.id);

      // Navigate to dedicated session page immediately
      navigate(`/analysis/session/${encodeURIComponent(session.id)}`);
    } catch (err: any) {
      setFetchError(err.message || 'Failed to start analysis session');
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
      setFetchError(err.message || 'Failed to start single game analysis');
    }
  };

  // Workload estimation calculations
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
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Game Import &amp; Analysis Setup</h1>
        <p className="text-sm text-slate-400 mt-1">
          Select games from Chess.com, Lichess, or PGN, configure your Stockfish engine budget, and launch a dedicated review session.
        </p>
      </div>

      {/* Grid: Import Panel, Engine Settings, & Workload Estimator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Import Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-400" />
              <span>Import Public Games</span>
            </h2>

            <div className="flex rounded-xl bg-slate-950 p-1 mb-4 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPlatform('chesscom')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  platform === 'chesscom' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chess.com
              </button>
              <button
                type="button"
                onClick={() => setPlatform('lichess')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  platform === 'lichess' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Lichess
              </button>
              <button
                type="button"
                onClick={() => setPlatform('pgn_upload')}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  platform === 'pgn_upload' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                PGN
              </button>
            </div>

            <form onSubmit={handleFetchGames} className="space-y-3">
              {platform !== 'pgn_upload' ? (
                <input
                  type="text"
                  placeholder={platform === 'chesscom' ? 'Chess.com Username' : 'Lichess Username'}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 font-medium"
                />
              ) : (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    placeholder="Paste PGN here..."
                    value={pgnInput}
                    onChange={(e) => setPgnInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors">
                    <Upload className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Upload .pgn</span>
                    <input type="file" accept=".pgn" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={isFetching}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors disabled:opacity-50"
              >
                {isFetching ? 'Fetching Games...' : 'Retrieve Games'}
              </button>

              {fetchError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                  {fetchError}
                </p>
              )}
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-500">
            Total stored games: <strong className="text-slate-300 font-mono">{games.length}</strong>
          </div>
        </div>

        {/* Engine Settings Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Cpu className="h-5 w-5 text-emerald-400" />
                <span>Engine Search Budget</span>
              </h2>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-400">
                <input
                  type="checkbox"
                  checked={autoConfig}
                  onChange={(e) => setAutoConfig(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500"
                />
                <span>Auto Config</span>
              </label>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">Depth Preset</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'fast', label: 'Fast (D10)', depth: 10, time: 800 },
                    { id: 'balanced', label: 'Balanced (D12)', depth: 12, time: 1500 },
                    { id: 'deep', label: 'Deep (D15)', depth: 15, time: 3000 },
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
                      className={`p-2 rounded-xl border text-center transition-colors font-semibold ${
                        settings.preset === p.id
                          ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 font-semibold block mb-1.5">Session Time Limit</label>
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
                  <option value={3}>3 Minutes</option>
                  <option value={5}>5 Minutes</option>
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={0}>Unlimited</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 text-xs text-slate-500">
            Engine: <strong className="text-emerald-400 font-mono">Stockfish WASM</strong> • Hash: 32 MB
          </div>
        </div>

        {/* Honest Workload & RAM Estimator */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BarChart2 className="h-5 w-5 text-emerald-400" />
                <span>Workload &amp; Resource Estimator</span>
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Selected Games:</span>
                  <span className="font-mono font-bold text-slate-100">{selectedGames.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Avg Plies per Game:</span>
                  <span className="font-mono text-slate-100">~{avgPlies} plies</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Estimated Duration:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    ~{Math.ceil(workloadEstimate.estimatedSeconds / 60)} min ({workloadEstimate.estimatedSeconds}s)
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Device Load:</span>
                  <span
                    className={`font-bold ${
                      workloadEstimate.comfortLevel === 'Light'
                        ? 'text-emerald-400'
                        : workloadEstimate.comfortLevel === 'Moderate'
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {workloadEstimate.comfortLevel}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 leading-relaxed">
                <strong>Estimation Confidence:</strong> {workloadEstimate.confidence}. {workloadEstimate.memoryNote}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
            <button
              type="button"
              onClick={handleRunBenchmark}
              disabled={isBenchmarking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span>{isBenchmarking ? 'Running Benchmark...' : 'Run Device Benchmark'}</span>
            </button>

            {benchmarkResult && (
              <span className="text-[11px] font-mono text-emerald-400">
                {(benchmarkResult.measuredNps / 1000).toFixed(0)}k NPS
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Primary Action Button Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 p-5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">
            Ready to Analyse {selectedGames.length} Game{selectedGames.length === 1 ? '' : 's'}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Launching analysis opens a dedicated session page with real-time Stockfish telemetry and live accuracy calculation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleStartAnalysis}
          disabled={selectedIds.size === 0 || isStartingSession}
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-600/30 disabled:opacity-40 transition-all active:scale-95 cursor-pointer"
        >
          <Play className="h-5 w-5" />
          <span>{isStartingSession ? 'Creating Session...' : 'Start Analysis Session'}</span>
        </button>
      </div>

      {/* Past Sessions Drawer/List */}
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

      {/* Game Selection Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Select Games</h2>
          <span className="text-xs text-slate-400">
            Check the boxes to choose games for this session.
          </span>
        </div>

        <GameTable
          games={games}
          resultsMap={resultsMap}
          selectedGameIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectPreset={handleSelectPreset}
          onAnalyseGame={handleAnalyseSingleGame}
        />
      </div>
    </div>
  );
};
