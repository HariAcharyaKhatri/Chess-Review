import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { GameMetadata, GameAnalysisResult, MoveClassification } from '../types/chess';
import { storageService } from '../storage/indexedDb';
import { AccuracyService } from '../chess/accuracy';
import { ClassificationService } from '../chess/classification';
import { analyzeOpening } from '../chess/openings';
import { PgnParser } from '../chess/pgnParser';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  ArrowLeft,
  Swords,
  Printer,
  Target,
  Award,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

export const GameReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [games, setGames] = useState<GameMetadata[]>([]);
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(null);
  const [analysisResult, setAnalysisResult] = useState<GameAnalysisResult | null>(null);
  const [openingName, setOpeningName] = useState<string>('Standard Chess Game');
  const [openingEco, setOpeningEco] = useState<string>('ECO');

  useEffect(() => {
    loadData();
  }, [searchParams]);

  const loadData = async () => {
    const loadedGames = await storageService.getAllGames();
    setGames(loadedGames);

    const paramGameId = searchParams.get('gameId');
    let target = loadedGames.find((g) => g.id === paramGameId);
    if (!target && loadedGames.length > 0) {
      target = loadedGames[0];
    }

    if (target) {
      setActiveGame(target);
      const res = await storageService.getAnalysisResult(target.id);
      setAnalysisResult(res || null);

      try {
        const parsed = PgnParser.parseGame(target.pgn);
        const sanList = parsed.moves.map((m) => m.san);
        const opRes = analyzeOpening(sanList);
        if (opRes) {
          setOpeningName(opRes.opening.name);
          setOpeningEco(opRes.opening.eco);
        } else if (target.openingName) {
          setOpeningName(target.openingName);
          setOpeningEco(target.eco || 'ECO');
        }
      } catch {
        // ignore
      }
    }
  };

  const handleSelectGame = async (gameId: string) => {
    const target = games.find((g) => g.id === gameId);
    if (target) {
      setActiveGame(target);
      const res = await storageService.getAnalysisResult(target.id);
      setAnalysisResult(res || null);
    }
  };

  if (!activeGame) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Award className="h-12 w-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Game Available for Report</h2>
        <p className="text-sm text-slate-400">
          Import and analyze games with Stockfish to generate comprehensive player reports.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/import"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
          >
            Import Games
          </Link>
          <Link
            to="/analysis"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors"
          >
            Go to Analysis
          </Link>
        </div>
      </div>
    );
  }

  // Extract critical turning point moments (blunders, mistakes, missed wins)
  const turningPoints = analysisResult
    ? analysisResult.moves.filter((m) => ['blunder', 'mistake', 'missed_win'].includes(m.classification))
    : [];

  // Graph data
  const chartData = analysisResult
    ? [
        { ply: 0, evalVal: 0, label: 'Start' },
        ...analysisResult.moves.map((m) => {
          const cp = AccuracyService.scoreToCentipawns(m.evalAfter.score);
          const clamped = Math.max(-1000, Math.min(1000, cp));
          return {
            ply: m.ply,
            evalVal: clamped / 100,
            label: `${Math.floor((m.ply - 1) / 2) + 1}${m.turn === 'w' ? '.' : '...'}${m.san}`,
            san: m.san,
            classification: m.classification,
          };
        }),
      ]
    : [];

  const classificationRows: {
    key: MoveClassification;
    label: string;
    icon: string;
    colorClass: string;
    bgClass: string;
  }[] = [
    { key: 'brilliant', label: 'Brilliant', icon: '!!', colorClass: 'text-cyan-400', bgClass: 'bg-cyan-500' },
    { key: 'great', label: 'Great', icon: '!', colorClass: 'text-indigo-400', bgClass: 'bg-indigo-500' },
    { key: 'best', label: 'Best', icon: '★', colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500' },
    { key: 'excellent', label: 'Excellent', icon: '✓', colorClass: 'text-teal-400', bgClass: 'bg-teal-500' },
    { key: 'good', label: 'Good', icon: '✓', colorClass: 'text-blue-400', bgClass: 'bg-blue-500' },
    { key: 'book', label: 'Book', icon: '📖', colorClass: 'text-amber-400', bgClass: 'bg-amber-500' },
    { key: 'inaccuracy', label: 'Inaccuracy', icon: '?!', colorClass: 'text-yellow-400', bgClass: 'bg-yellow-500' },
    { key: 'mistake', label: 'Mistake', icon: '?', colorClass: 'text-orange-400', bgClass: 'bg-orange-500' },
    { key: 'missed_win', label: 'Missed Win', icon: '✖', colorClass: 'text-rose-400', bgClass: 'bg-rose-500' },
    { key: 'blunder', label: 'Blunder', icon: '??', colorClass: 'text-red-500', bgClass: 'bg-red-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/review')}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Back to Review"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                OFFICIAL REPORT
              </span>
              <span className="text-xs text-slate-400 font-mono">{openingEco} • {activeGame.date}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white mt-0.5">
              {activeGame.white} <span className="text-slate-500 font-normal">vs</span> {activeGame.black}
            </h1>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {games.length > 1 && (
            <select
              value={activeGame.id}
              onChange={(e) => handleSelectGame(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500 max-w-[200px] truncate"
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.white} vs {g.black} ({g.date})
                </option>
              ))}
            </select>
          )}

          <Link
            to={`/review?gameId=${encodeURIComponent(activeGame.id)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Swords className="h-3.5 w-3.5" />
            <span>Interactive Board Review</span>
          </Link>

          <Link
            to={`/drills?gameId=${encodeURIComponent(activeGame.id)}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-300 font-bold text-xs transition-colors"
          >
            <Target className="h-3.5 w-3.5 text-rose-400" />
            <span>Drill Mistakes ({turningPoints.length})</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            title="Print or export as PDF"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {analysisResult ? (
        <div className="space-y-6">
          {/* Main Accuracy Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* White Player Scorecard */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-900 font-bold flex items-center justify-center text-sm shadow">
                    W
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{activeGame.white}</h3>
                    <span className="text-xs text-slate-400 font-mono">
                      Rating: {activeGame.whiteElo || 'Unrated'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500 uppercase block">Result</span>
                  <span className="text-sm font-bold text-slate-200">
                    {activeGame.result === '1-0' ? 'Winner (1-0)' : activeGame.result === '1/2-1/2' ? 'Draw' : '0-1'}
                  </span>
                </div>
              </div>

              <div className="py-6 flex items-center justify-around">
                <div className="text-center">
                  <span className="text-5xl font-mono font-extrabold text-emerald-400 block tracking-tight">
                    {analysisResult.whiteAccuracy}%
                  </span>
                  <span className="text-xs font-semibold text-slate-400 mt-1 block">Game Accuracy</span>
                </div>
                <div className="h-16 w-px bg-slate-800" />
                <div className="text-center">
                  <span className="text-3xl font-mono font-bold text-slate-200 block">
                    {analysisResult.whiteAcpl}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 mt-1 block">Avg Centipawn Loss (ACPL)</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span>Performance Quality:</span>
                <span className="font-bold text-slate-200">
                  {analysisResult.whiteAccuracy >= 90
                    ? 'Grandmaster Quality'
                    : analysisResult.whiteAccuracy >= 80
                    ? 'Expert / Master Standard'
                    : analysisResult.whiteAccuracy >= 70
                    ? 'Club Competitor'
                    : 'Tactical Room for Growth'}
                </span>
              </div>
            </div>

            {/* Black Player Scorecard */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-bold flex items-center justify-center text-sm shadow">
                    B
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{activeGame.black}</h3>
                    <span className="text-xs text-slate-400 font-mono">
                      Rating: {activeGame.blackElo || 'Unrated'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-slate-500 uppercase block">Result</span>
                  <span className="text-sm font-bold text-slate-200">
                    {activeGame.result === '0-1' ? 'Winner (0-1)' : activeGame.result === '1/2-1/2' ? 'Draw' : '1-0'}
                  </span>
                </div>
              </div>

              <div className="py-6 flex items-center justify-around">
                <div className="text-center">
                  <span className="text-5xl font-mono font-extrabold text-teal-400 block tracking-tight">
                    {analysisResult.blackAccuracy}%
                  </span>
                  <span className="text-xs font-semibold text-slate-400 mt-1 block">Game Accuracy</span>
                </div>
                <div className="h-16 w-px bg-slate-800" />
                <div className="text-center">
                  <span className="text-3xl font-mono font-bold text-slate-200 block">
                    {analysisResult.blackAcpl}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 mt-1 block">Avg Centipawn Loss (ACPL)</span>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                <span>Performance Quality:</span>
                <span className="font-bold text-slate-200">
                  {analysisResult.blackAccuracy >= 90
                    ? 'Grandmaster Quality'
                    : analysisResult.blackAccuracy >= 80
                    ? 'Expert / Master Standard'
                    : analysisResult.blackAccuracy >= 70
                    ? 'Club Competitor'
                    : 'Tactical Room for Growth'}
                </span>
              </div>
            </div>
          </div>

          {/* Classification Breakdown & Comparison Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Move Classification Breakdown</h3>
                <p className="text-xs text-slate-400">
                  Detailed distribution of move decisions calibrated by Stockfish depth {analysisResult.targetDepth}.
                </p>
              </div>
              <span className="font-mono text-xs text-slate-500">
                {analysisResult.totalPlies} total plies analyzed
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {classificationRows.map((row) => {
                const wCount = analysisResult.whiteClassifications[row.key] || 0;
                const bCount = analysisResult.blackClassifications[row.key] || 0;
                return (
                  <div
                    key={row.key}
                    className="bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <span className={`font-mono text-xs ${row.colorClass}`}>{row.icon}</span>
                        <span>{row.label}</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-mono font-bold">
                      <span className="text-slate-100">{wCount}</span>
                      <span className="text-slate-600 font-normal">|</span>
                      <span className="text-slate-400">{bCount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Advantage Evaluation Curve */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Evaluation Advantage Curve</h3>
                <p className="text-xs text-slate-400">
                  Game trajectory in pawns. Positive values favor White, negative values favor Black.
                </p>
              </div>
              <span className="text-xs font-mono text-emerald-400">Opening: {openingName}</span>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="reportEvalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                      <stop offset="50%" stopColor="#64748b" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="ply" hide />
                  <YAxis domain={[-7, 7]} hide />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const p = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg shadow-xl text-xs font-mono">
                            <div className="font-bold text-white">{p.label}</div>
                            <div className="text-emerald-400">
                              Eval: {p.evalVal > 0 ? `+${p.evalVal.toFixed(2)}` : p.evalVal.toFixed(2)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="evalVal"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#reportEvalGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Game Turning Points */}
          {turningPoints.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-400" />
                    <span>Critical Game Turning Points</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Moves where significant tactical swings or material concessions shifted the outcome.
                  </p>
                </div>
                <Link
                  to={`/drills?gameId=${encodeURIComponent(activeGame.id)}`}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <span>Practice All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {turningPoints.map((tp) => {
                  const moveNumber = Math.floor((tp.ply - 1) / 2) + 1;
                  const isWhite = tp.turn === 'w';
                  const badge = ClassificationService.getBadgeDetails(tp.classification);

                  return (
                    <div
                      key={tp.ply}
                      className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between gap-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-400">
                            {moveNumber}{isWhite ? '.' : '...'}
                          </span>
                          <span className="font-mono font-bold text-white text-sm">{tp.san}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bgClass} ${badge.textClass}`}>
                            {badge.label}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-rose-400 font-semibold">
                          -{tp.centipawnLoss} cp
                        </span>
                      </div>

                      <p className="text-xs text-slate-300">{tp.commentary}</p>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                        <span>
                          Best: <strong className="text-emerald-400">{tp.bestMoveSan || tp.bestMove}</strong>
                        </span>
                        <span>Accuracy: {tp.accuracy}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <p className="text-base font-semibold text-slate-300">
            This game has not been analyzed yet.
          </p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Run Stockfish analysis to calculate move classifications, accuracy scores, and turning points.
          </p>
          <Link
            to={`/review?gameId=${encodeURIComponent(activeGame.id)}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all"
          >
            <Swords className="h-4 w-4" />
            <span>Open in Review &amp; Analyze</span>
          </Link>
        </div>
      )}
    </div>
  );
};
