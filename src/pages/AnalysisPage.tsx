import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GameMetadata, GameAnalysisResult, EngineSettings } from '../types/chess';
import { storageService, DEFAULT_SETTINGS } from '../storage/indexedDb';
import { analysisQueue } from '../analysis/analysisQueue';
import { ChessComImporter } from '../services/chessComImporter';
import { LichessImporter } from '../services/lichessImporter';
import { GameTable } from '../components/GameTable/GameTable';
import {
  Play,
  Pause,
  Square as StopSquare,
  Clock,
  Cpu,
  Layers,
} from 'lucide-react';

export const AnalysisPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [games, setGames] = useState<GameMetadata[]>([]);
  const [resultsMap, setResultsMap] = useState<Map<string, GameAnalysisResult>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Form states
  const [platform, setPlatform] = useState<'chesscom' | 'lichess' | 'pgn_upload'>('chesscom');
  const [username, setUsername] = useState(searchParams.get('username') || '');
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Settings
  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);

  // Queue state
  const [queueState, setQueueState] = useState(analysisQueue.getStatus());

  useEffect(() => {
    // Load local games and results
    loadInitialData();

    // Subscribe to queue
    const unsubscribe = analysisQueue.subscribe(() => {
      setQueueState(analysisQueue.getStatus());
      // Refresh results
      storageService.getAllAnalysisResults().then((results) => {
        const map = new Map<string, GameAnalysisResult>();
        results.forEach((r) => map.set(r.gameId, r));
        setResultsMap(map);
      });
    });

    return unsubscribe;
  }, []);

  const loadInitialData = async () => {
    const loadedGames = await storageService.getAllGames();
    const loadedResults = await storageService.getAllAnalysisResults();
    const loadedSettings = await storageService.getSettings();

    setGames(loadedGames);
    setSettings(loadedSettings);

    const map = new Map<string, GameAnalysisResult>();
    loadedResults.forEach((r) => map.set(r.gameId, r));
    setResultsMap(map);

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
    const selectedGames = games.filter((g) => selectedIds.has(g.id));
    if (selectedGames.length === 0) return;

    // Save updated settings first
    await storageService.saveSettings(settings);

    analysisQueue.addGames(selectedGames);
    analysisQueue.start(settings);
  };

  const currentRunningItem = queueState.currentItem;
  const estimatedSeconds = analysisQueue.getEstimatedRemainingSeconds();

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Game Analysis &amp; Queue</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure Stockfish depth, manage analysis jobs, and review game batches.
        </p>
      </div>

      {/* Import & Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Import Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Layers className="h-5 w-5 text-emerald-400" />
              <span>Import Public Games</span>
            </h2>

            <div className="flex rounded-lg bg-slate-950 p-1 mb-4 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPlatform('chesscom')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${
                  platform === 'chesscom' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Chess.com
              </button>
              <button
                type="button"
                onClick={() => setPlatform('lichess')}
                className={`flex-1 py-1.5 rounded-md transition-colors ${
                  platform === 'lichess' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Lichess
              </button>
            </div>

            <form onSubmit={handleFetchGames} className="space-y-3">
              <input
                type="text"
                placeholder={platform === 'chesscom' ? 'Chess.com Username' : 'Lichess Username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500"
              />

              <button
                type="submit"
                disabled={isFetching}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {isFetching ? 'Fetching Games...' : 'Retrieve Public Games'}
              </button>

              {fetchError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-md border border-rose-500/20">
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-400" />
              <span>Engine Budget &amp; Preset</span>
            </h2>

            <div className="space-y-4 text-xs">
              {/* Presets */}
              <div>
                <label className="text-slate-400 font-medium block mb-1.5">Depth Preset</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'fast', label: 'Fast (D10)', depth: 10, time: 800 },
                    { id: 'balanced', label: 'Balanced (D12)', depth: 12, time: 1500 },
                    { id: 'deep', label: 'Deep (D15)', depth: 15, time: 3000 },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({
                          ...prev,
                          preset: p.id as any,
                          depth: p.depth,
                          movetimeMs: p.time,
                        }))
                      }
                      className={`p-2 rounded-lg border text-center transition-colors font-medium ${
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

              {/* Session Time Limit */}
              <div>
                <label className="text-slate-400 font-medium block mb-1.5">Session Time Limit</label>
                <select
                  value={settings.sessionTimeLimitMinutes}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      sessionTimeLimitMinutes: parseInt(e.target.value, 10),
                    }))
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
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
            Selected Depth: <strong className="text-emerald-400 font-mono">{settings.depth}</strong> | Engine: Stockfish WASM
          </div>
        </div>

        {/* Queue Execution & Progress Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-white mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-400" />
                <span>Analysis Execution</span>
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                  queueState.isRunning
                    ? queueState.isPaused
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400 animate-pulse'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {queueState.isRunning
                  ? queueState.isPaused
                    ? 'PAUSED'
                    : 'RUNNING'
                  : 'IDLE'}
              </span>
            </h2>

            {/* Current Item Progress */}
            {currentRunningItem ? (
              <div className="space-y-2 mb-4 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between text-xs text-slate-300 font-medium">
                  <span className="truncate max-w-[160px]">
                    {currentRunningItem.game.white} vs {currentRunningItem.game.black}
                  </span>
                  <span className="font-mono text-emerald-400">
                    Ply {currentRunningItem.currentPly || 0}/{currentRunningItem.totalPlies || 0}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full transition-all duration-200"
                    style={{ width: `${currentRunningItem.progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                  <span>Progress: {currentRunningItem.progress}%</span>
                  <span>Est. remaining: ~{Math.ceil(estimatedSeconds / 60)}m {estimatedSeconds % 60}s</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                Select games below and click <strong>Start Analysis</strong> to begin real engine evaluation.
              </p>
            )}
          </div>

          {/* Controls buttons */}
          <div className="space-y-2">
            {!queueState.isRunning ? (
              <button
                type="button"
                onClick={handleStartAnalysis}
                disabled={selectedIds.size === 0}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-40 transition-colors"
              >
                <Play className="h-4 w-4" />
                <span>Start Analysis ({selectedIds.size} Selected)</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {queueState.isPaused ? (
                  <button
                    type="button"
                    onClick={() => analysisQueue.resume()}
                    className="py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="h-4 w-4" />
                    <span>Resume</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => analysisQueue.pause()}
                    className="py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => analysisQueue.cancel()}
                  className="py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <StopSquare className="h-4 w-4" />
                  <span>Stop</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Games Selection Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Select Games to Review</h2>
          <span className="text-xs text-slate-400">
            Click checkboxes to choose games, or use the preset selector.
          </span>
        </div>

        <GameTable
          games={games}
          resultsMap={resultsMap}
          selectedGameIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectPreset={handleSelectPreset}
        />
      </div>
    </div>
  );
};
