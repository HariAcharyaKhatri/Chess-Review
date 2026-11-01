import React, { useState, useEffect, useMemo } from 'react';
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
  Award,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  ListOrdered,
  Activity,
  Layers,
} from 'lucide-react';

export const GameReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [games, setGames] = useState<GameMetadata[]>([]);
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(null);
  const [analysisResult, setAnalysisResult] = useState<GameAnalysisResult | null>(null);
  const [openingName, setOpeningName] = useState<string>('Standard Chess Game');
  const [openingEco, setOpeningEco] = useState<string>('ECO');
  const [reportTab, setReportTab] = useState<'summary' | 'turningPoints' | 'moves'>('summary');

  // Move table pagination
  const [movePage, setMovePage] = useState(1);
  const MOVES_PER_PAGE = 20;

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
      setMovePage(1);

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
      setMovePage(1);
    }
  };

  // Turning points (blunders, mistakes, missed wins)
  const turningPoints = useMemo(() => {
    if (!analysisResult) return [];
    return analysisResult.moves.filter((m) =>
      ['blunder', 'mistake', 'missed_win'].includes(m.classification)
    );
  }, [analysisResult]);

  // Graph data
  const chartData = useMemo(() => {
    if (!analysisResult) return [];
    return [
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
    ];
  }, [analysisResult]);

  // Pagination for all moves
  const paginatedMoves = useMemo(() => {
    if (!analysisResult) return [];
    const start = (movePage - 1) * MOVES_PER_PAGE;
    return analysisResult.moves.slice(start, start + MOVES_PER_PAGE);
  }, [analysisResult, movePage]);

  const totalMovePages = analysisResult
    ? Math.max(1, Math.ceil(analysisResult.moves.length / MOVES_PER_PAGE))
    : 1;

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

  const classificationRows: {
    key: MoveClassification;
    label: string;
    icon: string;
    colorClass: string;
  }[] = [
    { key: 'brilliant', label: 'Brilliant', icon: '!!', colorClass: 'text-cyan-400' },
    { key: 'great', label: 'Great', icon: '!', colorClass: 'text-indigo-400' },
    { key: 'best', label: 'Best', icon: '★', colorClass: 'text-emerald-400' },
    { key: 'excellent', label: 'Excellent', icon: '✓', colorClass: 'text-teal-400' },
    { key: 'good', label: 'Good', icon: '✓', colorClass: 'text-blue-400' },
    { key: 'book', label: 'Book', icon: '📖', colorClass: 'text-amber-400' },
    { key: 'inaccuracy', label: 'Inaccuracy', icon: '?!', colorClass: 'text-yellow-400' },
    { key: 'mistake', label: 'Mistake', icon: '?', colorClass: 'text-orange-400' },
    { key: 'missed_win', label: 'Missed Win', icon: '✖', colorClass: 'text-rose-400' },
    { key: 'blunder', label: 'Blunder', icon: '??', colorClass: 'text-red-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/review')}
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
            <h1 className="text-lg sm:text-2xl font-extrabold text-white mt-0.5">
              {activeGame.white} <span className="text-slate-500 font-normal">vs</span> {activeGame.black}
            </h1>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {games.length > 1 && (
            <select
              value={activeGame.id}
              onChange={(e) => handleSelectGame(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500 max-w-[200px] truncate cursor-pointer"
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors"
          >
            <Swords className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Interactive Review</span>
          </Link>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
            title="Print or export as PDF"
          >
            <Printer className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {analysisResult ? (
        <div className="space-y-6">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
            <button
              onClick={() => setReportTab('summary')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                reportTab === 'summary'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              <span>Scorecards &amp; Accuracy</span>
            </button>

            <button
              onClick={() => setReportTab('turningPoints')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                reportTab === 'turningPoints'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Trajectory &amp; Turning Points ({turningPoints.length})</span>
            </button>

            <button
              onClick={() => setReportTab('moves')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                reportTab === 'moves'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ListOrdered className="h-4 w-4" />
              <span>Move-by-Move Analysis</span>
            </button>
          </div>

          {/* TAB 1: Summary & Scorecards */}
          {reportTab === 'summary' && (
            <div className="space-y-6">
              {/* Main Accuracy Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* White Player Scorecard */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
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
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Result</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-200">
                        {activeGame.result === '1-0' ? 'Winner (1-0)' : activeGame.result === '1/2-1/2' ? 'Draw' : '0-1'}
                      </span>
                    </div>
                  </div>

                  <div className="py-6 flex items-center justify-around">
                    <div className="text-center">
                      <span className="text-4xl sm:text-5xl font-mono font-extrabold text-emerald-400 block tracking-tight">
                        {analysisResult.whiteAccuracy}%
                      </span>
                      <span className="text-xs font-semibold text-slate-400 mt-1 block">Game Accuracy</span>
                    </div>
                    <div className="h-16 w-px bg-slate-800" />
                    <div className="text-center">
                      <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-200 block">
                        {analysisResult.whiteAcpl}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 mt-1 block">Centipawn Loss (ACPL)</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                    <span>Performance Standard:</span>
                    <span className="font-bold text-slate-200">
                      {analysisResult.whiteAccuracy >= 90
                        ? 'Grandmaster Quality'
                        : analysisResult.whiteAccuracy >= 80
                        ? 'Master / Expert Standard'
                        : analysisResult.whiteAccuracy >= 70
                        ? 'Club Competitor'
                        : 'Tactical Room for Growth'}
                    </span>
                  </div>
                </div>

                {/* Black Player Scorecard */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
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
                      <span className="text-[10px] font-mono text-slate-500 uppercase block">Result</span>
                      <span className="text-xs sm:text-sm font-bold text-slate-200">
                        {activeGame.result === '0-1' ? 'Winner (0-1)' : activeGame.result === '1/2-1/2' ? 'Draw' : '1-0'}
                      </span>
                    </div>
                  </div>

                  <div className="py-6 flex items-center justify-around">
                    <div className="text-center">
                      <span className="text-4xl sm:text-5xl font-mono font-extrabold text-teal-400 block tracking-tight">
                        {analysisResult.blackAccuracy}%
                      </span>
                      <span className="text-xs font-semibold text-slate-400 mt-1 block">Game Accuracy</span>
                    </div>
                    <div className="h-16 w-px bg-slate-800" />
                    <div className="text-center">
                      <span className="text-2xl sm:text-3xl font-mono font-bold text-slate-200 block">
                        {analysisResult.blackAcpl}
                      </span>
                      <span className="text-xs font-semibold text-slate-400 mt-1 block">Centipawn Loss (ACPL)</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-400 flex items-center justify-between">
                    <span>Performance Standard:</span>
                    <span className="font-bold text-slate-200">
                      {analysisResult.blackAccuracy >= 90
                        ? 'Grandmaster Quality'
                        : analysisResult.blackAccuracy >= 80
                        ? 'Master / Expert Standard'
                        : analysisResult.blackAccuracy >= 70
                        ? 'Club Competitor'
                        : 'Tactical Room for Growth'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Classification Breakdown & Comparison Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Move Classification Matrix</h3>
                    <p className="text-xs text-slate-400">
                      Move decisions analyzed at Stockfish depth {analysisResult.targetDepth}.
                    </p>
                  </div>
                  <span className="font-mono text-xs text-slate-500">
                    {analysisResult.totalPlies} total plies
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
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
            </div>
          )}

          {/* TAB 2: Advantage Curve & Turning Points */}
          {reportTab === 'turningPoints' && (
            <div className="space-y-6">
              {/* Advantage Evaluation Curve */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white">Evaluation Advantage Curve</h3>
                    <p className="text-xs text-slate-400">
                      Game trajectory in pawns. Positive values favor White (+), negative values favor Black (-).
                    </p>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 hidden sm:inline">
                    Opening: {openingName}
                  </span>
                </div>

                <div className="h-44 sm:h-52 w-full">
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
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      <span>Critical Game Turning Points ({turningPoints.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Moves where material concessions or missed tactical lines swung the evaluation.
                    </p>
                  </div>
                  <Link
                    to={`/drills?gameId=${encodeURIComponent(activeGame.id)}`}
                    className="text-xs font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                  >
                    <span>Practice in Drills</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {turningPoints.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {turningPoints.map((tp) => {
                      const moveNumber = Math.floor((tp.ply - 1) / 2) + 1;
                      const isWhite = tp.turn === 'w';
                      const badge = ClassificationService.getBadgeDetails(tp.classification);

                      return (
                        <div
                          key={tp.ply}
                          className="bg-slate-950/90 border border-slate-800/90 rounded-xl p-3.5 flex flex-col justify-between gap-2.5"
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

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-400">
                            <span>
                              Best: <strong className="text-emerald-400">{tp.bestMoveSan || tp.bestMove}</strong>
                            </span>
                            <Link
                              to={`/review?gameId=${encodeURIComponent(activeGame.id)}&ply=${tp.ply}`}
                              className="text-emerald-400 hover:underline flex items-center gap-1 font-sans text-xs"
                            >
                              <span>View Move</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No critical mistakes or blunders detected in this game!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Move-by-Move Table (Paginated for no long scrolling) */}
          {reportTab === 'moves' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-emerald-400" />
                    <span>Complete Move-by-Move Analysis</span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Showing moves {((movePage - 1) * MOVES_PER_PAGE) + 1} to{' '}
                    {Math.min(movePage * MOVES_PER_PAGE, analysisResult.moves.length)} of {analysisResult.moves.length}
                  </p>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMovePage((p) => Math.max(1, p - 1))}
                    disabled={movePage === 1}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Page {movePage} of {totalMovePages}
                  </span>
                  <button
                    onClick={() => setMovePage((p) => Math.min(totalMovePages, p + 1))}
                    disabled={movePage === totalMovePages}
                    className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Move</th>
                      <th className="py-2.5 px-3">Player</th>
                      <th className="py-2.5 px-3">Played</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3">Accuracy</th>
                      <th className="py-2.5 px-3">Centipawn Loss</th>
                      <th className="py-2.5 px-3">Engine Best</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {paginatedMoves.map((m) => {
                      const moveNumber = Math.floor((m.ply - 1) / 2) + 1;
                      const isWhite = m.turn === 'w';
                      const badge = ClassificationService.getBadgeDetails(m.classification);

                      return (
                        <tr key={m.ply} className="hover:bg-slate-950/40 transition-colors">
                          <td className="py-2 px-3 text-slate-500 font-bold">
                            {moveNumber}{isWhite ? '.' : '...'}
                          </td>
                          <td className="py-2 px-3 text-slate-300">
                            {isWhite ? activeGame.white : activeGame.black}
                          </td>
                          <td className="py-2 px-3 font-bold text-white">
                            {m.san}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bgClass} ${badge.textClass}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-300 font-semibold">
                            {m.accuracy}%
                          </td>
                          <td className={`py-2 px-3 font-semibold ${m.centipawnLoss > 50 ? 'text-rose-400' : 'text-slate-400'}`}>
                            {m.centipawnLoss > 0 ? `-${m.centipawnLoss} cp` : '0 cp'}
                          </td>
                          <td className="py-2 px-3 text-emerald-400 font-semibold">
                            {m.bestMoveSan || m.bestMove}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <Link
                              to={`/review?gameId=${encodeURIComponent(activeGame.id)}&ply=${m.ply}`}
                              className="text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                            >
                              <span>Board</span>
                              <ChevronRight className="h-3 w-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Bottom Pagination */}
              {totalMovePages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
                  <span className="text-slate-400">
                    Page {movePage} of {totalMovePages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setMovePage((p) => Math.max(1, p - 1))}
                      disabled={movePage === 1}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setMovePage((p) => Math.min(totalMovePages, p + 1))}
                      disabled={movePage === totalMovePages}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="p-16 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
          <Layers className="h-10 w-10 text-slate-600 mx-auto" />
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
