import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { GameMetadata, GameAnalysisResult, MoveAnalysis } from '../types/chess';
import { storageService } from '../storage/indexedDb';
import { sessionManager } from '../analysis/sessionManager';
import { PgnParser } from '../chess/pgnParser';
import { ChessBoard } from '../components/ChessBoard/ChessBoard';
import { EvaluationBar } from '../components/EvaluationBar/EvaluationBar';
import { MoveList } from '../components/MoveList/MoveList';
import { AnalysisGraph } from '../components/AnalysisGraph/AnalysisGraph';
import { AccuracyCard } from '../components/AccuracyCard/AccuracyCard';
import { ReviewSummary } from '../components/ReviewSummary/ReviewSummary';
import { AnalysisControls } from '../components/AnalysisControls/AnalysisControls';
import { OpeningCoachModal } from '../components/OpeningCoach/OpeningCoachModal';
import { MistakeTrainerModal } from '../components/MistakeTrainer/MistakeTrainerModal';
import { ImprovementPlanModal } from '../components/ImprovementPlan/ImprovementPlanModal';
import { analyzeOpening, OpeningAnalysisResult } from '../chess/openings';
import { ImprovementService, PersonalizedImprovementPlan } from '../services/improvementService';
import { soundService } from '../services/soundService';
import {
  Download,
  FileJson,
  ArrowLeft,
  Swords,
  BookOpen,
  Target,
  Award,
  ListFilter,
  BarChart2,
  Lightbulb,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

type ReviewTab = 'insight' | 'moves' | 'report' | 'opening' | 'drills';

export const ReviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [games, setGames] = useState<GameMetadata[]>([]);
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(null);
  const [analysisResult, setAnalysisResult] = useState<GameAnalysisResult | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [boardTheme, setBoardTheme] = useState<'green' | 'blue' | 'brown'>('green');

  // Active tab in review panel: 'insight' | 'moves' | 'report' | 'opening' | 'drills'
  const [activeTab, setActiveTab] = useState<ReviewTab>('insight');

  // Modals state
  const [isOpeningCoachOpen, setIsOpeningCoachOpen] = useState(false);
  const [isMistakeTrainerOpen, setIsMistakeTrainerOpen] = useState(false);
  const [isImprovementPlanOpen, setIsImprovementPlanOpen] = useState(false);

  // Derived analysis features
  const [openingAnalysis, setOpeningAnalysis] = useState<OpeningAnalysisResult | undefined>();
  const [improvementPlan, setImprovementPlan] = useState<PersonalizedImprovementPlan | undefined>();

  useEffect(() => {
    loadGamesAndSettings();
  }, [searchParams]);

  const loadGamesAndSettings = async () => {
    const loadedGames = await storageService.getAllGames();
    const settings = await storageService.getSettings();
    setBoardTheme(settings.boardTheme || 'green');
    setGames(loadedGames);

    const paramGameId = searchParams.get('gameId');
    const paramSessionId = searchParams.get('sessionId');

    let targetGame = loadedGames.find((g) => g.id === paramGameId);
    if (!targetGame && paramSessionId) {
      const session = await storageService.getSession(paramSessionId);
      if (session && session.games.length > 0) {
        targetGame = session.games.find((g) => g.id === paramGameId) || session.games[0];
      }
    }
    if (!targetGame && loadedGames.length > 0) {
      targetGame = loadedGames[0];
    }

    if (targetGame) {
      setActiveGame(targetGame);
      const res = await storageService.getAnalysisResult(targetGame.id);
      setAnalysisResult(res || null);
      setCurrentPly(0);

      // Re-orient board based on hero player
      if (targetGame.black.toLowerCase().includes('hero')) {
        setOrientation('black');
      }

      // Analyze openings
      try {
        const parsed = PgnParser.parseGame(targetGame.pgn);
        const sanList = parsed.moves.map((m) => m.san);
        const opRes = analyzeOpening(sanList);
        setOpeningAnalysis(opRes);
      } catch {
        // ignore
      }

      // Generate personalized improvement plan if analysis exists
      if (res) {
        const plan = ImprovementService.generatePlan(targetGame, res);
        setImprovementPlan(plan);
      }
    }
  };

  const handleSelectGame = async (gameId: string) => {
    const target = games.find((g) => g.id === gameId);
    if (target) {
      setActiveGame(target);
      setSearchParams({ gameId });
      const res = await storageService.getAnalysisResult(target.id);
      setAnalysisResult(res || null);
      setCurrentPly(0);

      // Update opening analysis
      try {
        const parsed = PgnParser.parseGame(target.pgn);
        const sanList = parsed.moves.map((m) => m.san);
        const opRes = analyzeOpening(sanList);
        setOpeningAnalysis(opRes);
      } catch {
        // ignore
      }

      if (res) {
        const plan = ImprovementService.generatePlan(target, res);
        setImprovementPlan(plan);
      } else {
        setImprovementPlan(undefined);
      }
    }
  };

  // Reconstruct current FEN and last move
  let currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  let activeMove: MoveAnalysis | undefined;
  let lastMove: { from: string; to: string } | undefined;
  let bestMove: string | undefined;

  if (analysisResult && analysisResult.moves.length > 0) {
    if (currentPly > 0 && currentPly <= analysisResult.moves.length) {
      activeMove = analysisResult.moves[currentPly - 1];
      currentFen = activeMove.fenAfter;
      lastMove = {
        from: activeMove.uci.substring(0, 2),
        to: activeMove.uci.substring(2, 4),
      };
      bestMove = activeMove.evalAfter.bestMove;
    } else if (currentPly === 0 && analysisResult.moves[0]) {
      currentFen = analysisResult.moves[0].fenBefore;
      bestMove = analysisResult.moves[0].evalBefore.bestMove;
    }
  } else if (activeGame) {
    try {
      const parsed = PgnParser.parseGame(activeGame.pgn);
      if (currentPly > 0 && currentPly <= parsed.moves.length) {
        const m = parsed.moves[currentPly - 1];
        currentFen = m.fenAfter;
        lastMove = { from: m.uci.substring(0, 2), to: m.uci.substring(2, 4) };
      }
    } catch {
      // keep starting position
    }
  }

  // Audio feedback on move navigation
  const prevPlyRef = useRef(currentPly);
  useEffect(() => {
    if (prevPlyRef.current !== currentPly) {
      prevPlyRef.current = currentPly;
      if (currentPly > 0 && activeMove) {
        if (activeMove.san.includes('x')) {
          soundService.playCapture();
        } else {
          soundService.playMove();
        }
      }
    }
  }, [currentPly, activeMove]);

  const handleExportPgn = () => {
    if (!activeGame) return;
    const blob = new Blob([activeGame.pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeGame.white}_vs_${activeGame.black}_${activeGame.date}.pgn`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!activeGame || !analysisResult) return;
    const data = {
      game: activeGame,
      analysis: analysisResult,
      opening: openingAnalysis,
      improvementPlan,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analysis_${activeGame.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activeGame) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Swords className="h-12 w-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Game Selected for Review</h2>
        <p className="text-sm text-slate-400">
          Import or select a game in the Analysis dashboard to begin reviewing.
        </p>
        <div className="flex justify-center gap-3 pt-2">
          <Link
            to="/import"
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            Import Games
          </Link>
          <Link
            to="/analysis"
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
          >
            Go to Analysis
          </Link>
        </div>
      </div>
    );
  }

  let totalPlies = 0;
  if (analysisResult) {
    totalPlies = analysisResult.moves.length;
  } else if (activeGame) {
    try {
      const parsed = PgnParser.parseGame(activeGame.pgn);
      totalPlies = parsed.moves.length;
    } catch {
      totalPlies = activeGame.plyCount || 0;
    }
  }

  // Count mistakes for drill badge
  const mistakesCount = improvementPlan?.practicePositions.length || 0;

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 py-3 lg:py-4 space-y-3 lg:h-[calc(100vh-4.25rem)] lg:flex lg:flex-col lg:overflow-hidden">
      {/* Top Header & Fast Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/95 border border-slate-800 rounded-xl px-3.5 py-2 shadow-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => navigate('/analysis')}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Back to games"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
              <span className="truncate">{activeGame.white}</span>
              <span className="text-slate-500 font-normal">vs</span>
              <span className="truncate">{activeGame.black}</span>
              <span className="text-xs font-mono font-bold text-emerald-400 ml-1">({activeGame.result})</span>
            </h1>
            <p className="text-[11px] text-slate-400 truncate hidden sm:block">
              {openingAnalysis?.opening.name || activeGame.openingName || activeGame.eco || 'Chess Game'} • {activeGame.date}
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation Links */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {games.length > 1 && (
            <select
              value={activeGame.id}
              onChange={(e) => handleSelectGame(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500 max-w-[150px] sm:max-w-[190px] truncate"
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.white} vs {g.black}
                </option>
              ))}
            </select>
          )}

          <Link
            to={`/report?gameId=${encodeURIComponent(activeGame.id)}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-colors"
            title="View dedicated full game report"
          >
            <Award className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Full Report</span>
          </Link>

          <Link
            to={`/drills?gameId=${encodeURIComponent(activeGame.id)}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-colors"
            title="Practice mistakes in dedicated drill trainer"
          >
            <Target className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Drills ({mistakesCount})</span>
          </Link>

          <button
            onClick={handleExportPgn}
            className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Download PGN"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
          </button>
          {analysisResult && (
            <button
              onClick={handleExportJson}
              className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Download JSON Analysis"
            >
              <FileJson className="h-3.5 w-3.5 text-emerald-400" />
            </button>
          )}
        </div>
      </div>

      {/* Main Review Workspace: Screen-Fitted / No Scroll on PC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch flex-1 min-h-0">
        {/* Left Column: Board + Eval Bar + Navigation Controls + Advantage Curve */}
        <div className="lg:col-span-7 flex flex-col items-center justify-between gap-2.5 min-h-0">
          {/* Board Container with Side Eval Bar */}
          <div className="w-full flex items-stretch justify-center gap-2.5 min-h-0">
            {/* Vertical Eval Bar (Tablet / PC) */}
            <div className="hidden sm:flex shrink-0">
              <EvaluationBar
                score={activeMove ? activeMove.evalAfter.score : undefined}
                orientation={orientation}
              />
            </div>

            {/* Chessboard (Dynamically Sized to Prevent Overflow) */}
            <div className="flex-1 flex justify-center items-center min-h-0">
              <div className="w-full max-w-[480px] max-h-[min(56vh,480px)] aspect-square flex items-center justify-center">
                <ChessBoard
                  fen={currentFen}
                  orientation={orientation}
                  lastMove={lastMove}
                  bestMove={bestMove}
                  theme={boardTheme}
                  showBestMoveArrow={true}
                />
              </div>
            </div>
          </div>

          {/* Mobile Horizontal Eval Bar */}
          <div className="w-full sm:hidden">
            <EvaluationBar
              score={activeMove ? activeMove.evalAfter.score : undefined}
              orientation={orientation}
              horizontal={true}
            />
          </div>

          {/* Navigation Stepper Controls */}
          <div className="w-full max-w-[500px] shrink-0">
            <AnalysisControls
              currentPly={currentPly}
              totalPlies={totalPlies}
              onSelectPly={(ply) => setCurrentPly(ply)}
              onFlipBoard={() => setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))}
            />
          </div>

          {/* Mini Advantage Graph (PC / Tablet) */}
          {analysisResult && (
            <div className="w-full max-w-[500px] shrink-0 hidden sm:block">
              <AnalysisGraph
                moves={analysisResult.moves}
                currentPly={currentPly}
                onSelectPly={(ply) => setCurrentPly(ply)}
              />
            </div>
          )}
        </div>

        {/* Right Column: Tabbed Multi-Page Analysis Workspace */}
        <div className="lg:col-span-5 flex flex-col bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl min-h-[380px] lg:h-full">
          {/* Tab Selection Bar */}
          <div className="flex items-center border-b border-slate-800 bg-slate-950/70 p-1 gap-1 text-xs font-semibold shrink-0">
            <button
              onClick={() => setActiveTab('insight')}
              className={`flex-1 py-2 px-2 text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'insight'
                  ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Insight</span>
            </button>

            <button
              onClick={() => setActiveTab('moves')}
              className={`flex-1 py-2 px-2 text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'moves'
                  ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>Moves</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`flex-1 py-2 px-2 text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'report'
                  ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span>Report</span>
            </button>

            <button
              onClick={() => setActiveTab('opening')}
              className={`flex-1 py-2 px-2 text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'opening'
                  ? 'bg-slate-800 text-emerald-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>Theory</span>
            </button>

            <button
              onClick={() => setActiveTab('drills')}
              className={`flex-1 py-2 px-2 text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'drills'
                  ? 'bg-slate-800 text-rose-400 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              <span>Drills</span>
            </button>
          </div>

          {/* Tab Content Panes (Internal scrolling only, zero page scrolling) */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: INSIGHT (Move commentary & tactical lesson) */}
            {activeTab === 'insight' && (
              <div className="space-y-4">
                <ReviewSummary game={activeGame} activeMove={activeMove} />

                {/* Mobile Advantage Graph when Insight tab is open */}
                {analysisResult && (
                  <div className="w-full sm:hidden">
                    <AnalysisGraph
                      moves={analysisResult.moves}
                      currentPly={currentPly}
                      onSelectPly={(ply) => setCurrentPly(ply)}
                    />
                  </div>
                )}

                {/* Quick actions row */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    onClick={() => setActiveTab('moves')}
                    className="text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <span>View all moves</span>
                    <ChevronRight className="h-3 w-3" />
                  </button>
                  <Link
                    to={`/report?gameId=${encodeURIComponent(activeGame.id)}`}
                    className="text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <span>Full game report</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}

            {/* TAB 2: MOVES LIST */}
            {activeTab === 'moves' && (
              <div className="h-full min-h-[320px]">
                {analysisResult ? (
                  <MoveList
                    moves={analysisResult.moves}
                    currentPly={currentPly}
                    onSelectPly={(ply) => setCurrentPly(ply)}
                  />
                ) : (
                  <p className="text-xs text-slate-400 text-center py-10">
                    Run Stockfish analysis to view detailed move classifications and evaluations.
                  </p>
                )}
              </div>
            )}

            {/* TAB 3: REPORT & ACCURACY */}
            {activeTab === 'report' && (
              <div className="space-y-4">
                {analysisResult ? (
                  <>
                    <AccuracyCard
                      result={analysisResult}
                      whitePlayer={activeGame.white}
                      blackPlayer={activeGame.black}
                    />

                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-slate-400">Want a full printable breakdown?</span>
                      <Link
                        to={`/report?gameId=${encodeURIComponent(activeGame.id)}`}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <span>Open Report Page</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 space-y-3">
                    <p className="text-xs text-slate-400">Analysis pending for this game.</p>
                    <button
                      onClick={async () => {
                        const settings = await storageService.getSettings();
                        const session = await sessionManager.createSession(
                          [activeGame],
                          settings,
                          `Review: ${activeGame.white} vs ${activeGame.black}`
                        );
                        sessionManager.startSession(session.id);
                        navigate(`/analysis/session/${encodeURIComponent(session.id)}`);
                      }}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                    >
                      Analyse with Stockfish WASM
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: OPENING THEORY */}
            {activeTab === 'opening' && (
              <div className="space-y-3.5">
                {openingAnalysis ? (
                  <>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <div className="flex items-center justify-between mb-1">
                        <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          ECO {openingAnalysis.opening.eco}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500">
                          {openingAnalysis.matchedPlies} book plies
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1">
                        {openingAnalysis.opening.name}
                      </h3>
                      <p className="text-xs font-mono text-slate-400 mt-1 truncate">
                        {openingAnalysis.opening.moves}
                      </p>
                    </div>

                    {openingAnalysis.deviation ? (
                      <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-amber-300 block">Out of Book Deviation:</span>
                        <p className="text-slate-300">
                          At ply {openingAnalysis.deviation.ply}, <strong className="text-white">{openingAnalysis.deviation.playedMove}</strong> was played. Mainline book theory recommends <strong className="text-emerald-400">{openingAnalysis.deviation.theoreticalMove}</strong>.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl text-xs text-emerald-300">
                        Game moves fully conformed with established opening book theory!
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => setIsOpeningCoachOpen(true)}
                        className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                      >
                        Replay Opening Line
                      </button>
                      <Link
                        to="/openings"
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                      >
                        <span>Browse 3,865 openings</span>
                        <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-8">
                    No verified opening recognized for this move sequence.
                  </p>
                )}
              </div>
            )}

            {/* TAB 5: DRILLS & MISTAKE PRACTICE */}
            {activeTab === 'drills' && (
              <div className="space-y-3.5">
                {improvementPlan && improvementPlan.practicePositions.length > 0 ? (
                  <>
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-400">Game Mistake Replay</span>
                        <span className="text-xs font-mono text-slate-400">
                          {improvementPlan.practicePositions.length} positions
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Practice critical moments where blunders or mistakes occurred to train tactical intuition.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setIsMistakeTrainerOpen(true)}
                        className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Target className="h-3.5 w-3.5" />
                        <span>Interactive Replay</span>
                      </button>

                      <Link
                        to={`/drills?gameId=${encodeURIComponent(activeGame.id)}`}
                        className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Award className="h-3.5 w-3.5 text-amber-400" />
                        <span>Drills Page</span>
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 space-y-2">
                    <p className="text-xs text-slate-300 font-bold">No blunders recorded in this game!</p>
                    <p className="text-xs text-slate-400">You played solidly throughout.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Modals */}
      <OpeningCoachModal
        isOpen={isOpeningCoachOpen}
        onClose={() => setIsOpeningCoachOpen(false)}
        openingAnalysis={openingAnalysis}
        theme={boardTheme}
      />

      {improvementPlan && (
        <MistakeTrainerModal
          isOpen={isMistakeTrainerOpen}
          onClose={() => setIsMistakeTrainerOpen(false)}
          positions={improvementPlan.practicePositions}
          theme={boardTheme}
        />
      )}

      {improvementPlan && (
        <ImprovementPlanModal
          isOpen={isImprovementPlanOpen}
          onClose={() => setIsImprovementPlanOpen(false)}
          plan={improvementPlan}
          onLaunchMistakeTrainer={() => setIsMistakeTrainerOpen(true)}
          onLaunchOpeningCoach={() => setIsOpeningCoachOpen(true)}
        />
      )}
    </div>
  );
};
