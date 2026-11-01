import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { sessionManager } from '../analysis/sessionManager';
import { DeviceMonitor } from '../services/deviceMonitor';
import { AnalysisSession, DeviceCapabilities } from '../types/chess';
import { ChessBoard } from '../components/ChessBoard/ChessBoard';
import {
  Play,
  Pause,
  Square as StopSquare,
  ArrowLeft,
  Cpu,
  Activity,
  AlertTriangle,
  Eye,
  RefreshCw,
} from 'lucide-react';

export const SessionAnalysisPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<AnalysisSession | null>(null);
  const [deviceCaps, setDeviceCaps] = useState<DeviceCapabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    DeviceMonitor.getDeviceCapabilities().then(setDeviceCaps);

    const unsubscribe = sessionManager.subscribe(sessionId, (updated) => {
      setSession(updated);
      setLoading(false);
    });

    // Check if session exists in storage
    sessionManager.getSession(sessionId).then((s) => {
      if (!s) {
        setNotFound(true);
      } else {
        setSession(s);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [sessionId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center text-slate-400 space-y-3">
        <Activity className="h-8 w-8 animate-spin mx-auto text-emerald-400" />
        <p className="text-sm">Loading analysis session...</p>
      </div>
    );
  }

  if (notFound || !session) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Session Not Found</h2>
        <p className="text-xs text-slate-400">
          The requested analysis session could not be retrieved from local storage. It may have expired or was cleared.
        </p>
        <button
          onClick={() => navigate('/analysis')}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
        >
          Return to Analysis Setup
        </button>
      </div>
    );
  }

  const currentGame = session.games[session.currentGameIndex] || session.games[0];
  const completedCount = session.completedGameIds.length;
  const totalGames = session.games.length;
  const overallPercent = totalGames > 0 ? Math.round((completedCount / totalGames) * 100) : 0;
  const telemetry = session.telemetry;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Session Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analysis')}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Return to setup"
          >
            <ArrowLeft className="h-4 sm:h-5 w-4 sm:w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-2xl font-extrabold text-white">
                {session.title}
              </h1>
              <span
                className={`text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                  session.status === 'running'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse'
                    : session.status === 'paused'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : session.status === 'completed'
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : session.status === 'error'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {session.status}
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
              Platform: <strong className="text-slate-200 capitalize">{session.platform}</strong> • Target Depth: <strong className="text-emerald-400 font-mono">{session.settings.depth}</strong> • Games: {completedCount}/{totalGames}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {session.status === 'completed' && session.games.length === 1 && (
            <Link
              to={`/review?gameId=${encodeURIComponent(session.games[0].id)}&sessionId=${encodeURIComponent(session.id)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-colors animate-pulse"
            >
              <Eye className="h-4 w-4" />
              <span>Open Game Review</span>
            </Link>
          )}

          {session.status === 'running' && (
            <button
              onClick={() => sessionManager.pauseSession(session.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md transition-colors"
            >
              <Pause className="h-4 w-4" />
              <span>Pause</span>
            </button>
          )}

          {(session.status === 'paused' || session.status === 'pending' || session.status === 'stopped' || session.status === 'error') && (
            <button
              onClick={() => sessionManager.startSession(session.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors"
            >
              <Play className="h-4 w-4" />
              <span>{session.status === 'pending' ? 'Start' : session.status === 'error' ? 'Retry Analysis' : 'Resume'}</span>
            </button>
          )}

          {session.status === 'running' && (
            <button
              onClick={() => sessionManager.stopAfterCurrentGame(session.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                session.stopAfterCurrent
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
              title="Stop after active game finishes"
            >
              <StopSquare className="h-4 w-4 text-amber-400" />
              <span>{session.stopAfterCurrent ? 'Stopping after Game...' : 'Stop After Game'}</span>
            </button>
          )}

          {session.status === 'running' && (
            <button
              onClick={() => sessionManager.cancelCurrentSearch(session.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-colors"
              title="Cancel current move search"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
              <span>Skip Move</span>
            </button>
          )}

          {session.status !== 'completed' && (
            <button
              onClick={() => sessionManager.cancelSession(session.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
            >
              <span>Cancel Session</span>
            </button>
          )}
        </div>
      </div>

      {/* Completion Banner */}
      {session.status === 'completed' && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {session.games.length === 1 ? 'Game Analysis Completed!' : 'Batch Analysis Completed!'}
              </h3>
              <p className="text-xs text-slate-300">
                {session.games.length === 1
                  ? `Calculated game accuracy: ${session.gameAccuracies[session.games[0].id] || 0}%. All move evaluations and classifications are ready.`
                  : `Successfully analyzed ${completedCount} games with a running average accuracy of ${session.runningAverageAccuracy || 0}%.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {session.games.length === 1 && (
              <Link
                to={`/report?gameId=${encodeURIComponent(session.games[0].id)}`}
                className="shrink-0 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs transition-colors inline-flex items-center gap-2"
              >
                <span>Full Report</span>
              </Link>
            )}
            <Link
              to={
                session.games.length === 1
                  ? `/review?gameId=${encodeURIComponent(session.games[0].id)}&sessionId=${encodeURIComponent(session.id)}`
                  : `/review?sessionId=${encodeURIComponent(session.id)}`
              }
              className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition-colors inline-flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              <span>{session.games.length === 1 ? 'Open Game Review' : 'Open First Game Review'}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {session.status === 'error' && (
        <div className="bg-rose-950/40 border border-rose-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">Analysis Interrupted</h3>
              <p className="text-xs text-rose-300">
                {session.error || 'The analysis engine encountered an unexpected issue.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => sessionManager.startSession(session.id)}
            className="shrink-0 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/40 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Play className="h-4 w-4" />
            <span>Resume Analysis</span>
          </button>
        </div>
      )}

      {/* Grid: Live Active Game / Telemetry & Session Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Active Game & Live Stockfish Telemetry */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider block">
                  Live Engine Search
                </span>
                <h2 className="text-base font-bold text-white mt-0.5">
                  Game {session.currentGameIndex + 1} of {totalGames}: {currentGame.white} vs {currentGame.black}
                </h2>
              </div>
              <span className="font-mono text-xs text-slate-400">
                Ply {session.currentPly} / {session.totalPliesInCurrentGame}
              </span>
            </div>

            {/* Board Preview & Move Info */}
            <div className="flex flex-col sm:flex-row gap-5 items-center">
              <div className="w-48 h-48 shrink-0">
                <ChessBoard
                  fen={session.currentPositionFen || currentGame.pgn ? session.currentPositionFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
                  theme={session.settings.boardTheme}
                  showBestMoveArrow={true}
                  bestMove={telemetry?.bestMove}
                />
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Move Being Evaluated:</span>
                    <span className="font-bold text-slate-200 capitalize">
                      {session.currentTurn === 'w' ? 'White' : 'Black'} to move
                    </span>
                  </div>
                  <div className="text-xl font-mono font-extrabold text-emerald-400">
                    {session.currentMoveSan || 'Starting position'}
                  </div>
                </div>

                {/* Progress bar within game */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Game Progress</span>
                    <span className="font-mono">
                      {session.totalPliesInCurrentGame > 0
                        ? Math.round((session.currentPly / session.totalPliesInCurrentGame) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{
                        width: `${
                          session.totalPliesInCurrentGame > 0
                            ? (session.currentPly / session.totalPliesInCurrentGame) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Live Stockfish Telemetry Metrics */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  <span>Real Engine Telemetry (UCI Stream)</span>
                </span>
                <span className="font-mono text-[11px] text-slate-500">
                  Worker: Stockfish WASM Single-Thread
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Depth</span>
                  <span className="text-sm font-mono font-bold text-slate-200">
                    {telemetry ? `${telemetry.depth}${telemetry.seldepth ? `/${telemetry.seldepth}` : ''}` : '—'}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Speed (NPS)</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {telemetry && telemetry.nps > 0 ? `${(telemetry.nps / 1000).toFixed(0)}k` : '—'}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Nodes</span>
                  <span className="text-sm font-mono font-bold text-slate-200">
                    {telemetry && telemetry.nodes > 0 ? telemetry.nodes.toLocaleString() : '—'}
                  </span>
                </div>

                <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Evaluation</span>
                  <span className="text-sm font-mono font-extrabold text-amber-400">
                    {telemetry ? telemetry.rawScoreString : '0.00'}
                  </span>
                </div>
              </div>

              {/* Principal variation stream */}
              {telemetry && telemetry.pv && telemetry.pv.length > 0 && (
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                  <span className="text-slate-500 font-bold block mb-1">Current Principal Variation:</span>
                  <div className="font-mono text-emerald-300 truncate">
                    {telemetry.pv.slice(0, 8).join(' ')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Session Summary & Resource Monitoring */}
        <div className="lg:col-span-5 space-y-6">
          {/* Running Average Accuracy Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span>Running Session Accuracy</span>
              <span className="text-[11px] text-slate-500 font-normal">Arithmetic Mean</span>
            </h3>

            <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-3xl font-mono font-extrabold text-emerald-400">
                  {typeof session.runningAverageAccuracy === 'number'
                    ? `${session.runningAverageAccuracy}%`
                    : completedCount > 0
                    ? '—'
                    : 'Awaiting 1st game'}
                </span>
                <span className="text-xs text-slate-400 block mt-1">
                  Across <strong className="text-slate-200">{completedCount}</strong> completed games
                </span>
              </div>
              <div className="text-right text-xs font-mono text-slate-500">
                <div>Session Progress</div>
                <div className="text-lg font-bold text-slate-200">{overallPercent}%</div>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${overallPercent}%` }}
              />
            </div>
          </div>

          {/* Honest Device Resource Monitoring Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-emerald-400" />
              <span>Device &amp; Browser Capability Monitor</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Logical CPU Cores</span>
                <span className="font-mono font-bold text-slate-200">
                  {deviceCaps?.hardwareConcurrency || '4'}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Browser Device RAM</span>
                <span className="font-mono font-bold text-slate-200">
                  {deviceCaps?.deviceMemoryGb ? `~${deviceCaps.deviceMemoryGb} GB` : 'Unavailable in browser'}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Active Workers</span>
                <span className="font-mono font-bold text-slate-200">
                  1 (WASM Web Worker)
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-0.5">Local Storage Quota</span>
                <span className="font-mono font-bold text-slate-200">
                  {deviceCaps?.storageQuotaBytes
                    ? `${(deviceCaps.storageQuotaBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
                    : 'Standard'}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
              <strong>Hardware Transparency:</strong> Web browsers cannot read exact live host RAM consumption. Stockfish WASM operates within a fixed 32 MB heap. The values above reflect verified browser capability indicators.
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Game Results Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-2">
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Multi-Game Analysis Progress</h2>
            <p className="text-xs text-slate-400">
              Completed game reviews are saved incrementally in IndexedDB and can be opened immediately.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            {completedCount} / {totalGames} Completed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Players</th>
                <th className="p-3">Date</th>
                <th className="p-3">Time</th>
                <th className="p-3">Result</th>
                <th className="p-3">Accuracy</th>
                <th className="p-3">W / B Acc</th>
                <th className="p-3">Blunders</th>
                <th className="p-3">Mistakes</th>
                <th className="p-3 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {session.games.map((game, index) => {
                const isCompleted = session.completedGameIds.includes(game.id);
                const isCurrent = session.currentGameIndex === index && session.status === 'running';
                const result = session.completedResults[game.id];
                const gameAccuracy = session.gameAccuracies[game.id];

                return (
                  <tr
                    key={game.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isCurrent ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    <td className="p-3 font-mono font-bold text-slate-400">{index + 1}</td>
                    <td className="p-3 font-semibold text-slate-200">
                      {game.white} vs {game.black}
                    </td>
                    <td className="p-3 text-slate-400 font-mono">{game.date}</td>
                    <td className="p-3 capitalize text-slate-400">{game.timeClass}</td>
                    <td className="p-3 font-mono font-bold">{game.result}</td>

                    {/* Overall Game Accuracy */}
                    <td className="p-3">
                      {isCompleted && typeof gameAccuracy === 'number' ? (
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {gameAccuracy}%
                        </span>
                      ) : isCurrent ? (
                        <span className="text-emerald-400 animate-pulse font-medium">Analysing...</span>
                      ) : (
                        <span className="text-slate-600">Pending</span>
                      )}
                    </td>

                    {/* White / Black Accuracy */}
                    <td className="p-3 font-mono">
                      {result ? (
                        <span>
                          {result.whiteAccuracy}% / {result.blackAccuracy}%
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    {/* Blunders */}
                    <td className="p-3 font-mono text-rose-400">
                      {result ? result.whiteClassifications.blunder + result.blackClassifications.blunder : '—'}
                    </td>

                    {/* Mistakes */}
                    <td className="p-3 font-mono text-amber-400">
                      {result ? result.whiteClassifications.mistake + result.blackClassifications.mistake : '—'}
                    </td>

                    {/* Action */}
                    <td className="p-3 text-right">
                      {isCompleted ? (
                        <Link
                          to={`/review?gameId=${encodeURIComponent(game.id)}&sessionId=${encodeURIComponent(session.id)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 font-semibold transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Open Review</span>
                        </Link>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
