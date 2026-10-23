import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
import { Download, FileJson, ArrowLeft, Swords, BookOpen, Target, Award, Layout, ListFilter } from 'lucide-react';

export const ReviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [games, setGames] = useState<GameMetadata[]>([]);
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(null);
  const [analysisResult, setAnalysisResult] = useState<GameAnalysisResult | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [boardTheme, setBoardTheme] = useState<'green' | 'blue' | 'brown'>('green');

  // Modals state
  const [isOpeningCoachOpen, setIsOpeningCoachOpen] = useState(false);
  const [isMistakeTrainerOpen, setIsMistakeTrainerOpen] = useState(false);
  const [isImprovementPlanOpen, setIsImprovementPlanOpen] = useState(false);

  // Derived analysis features
  const [openingAnalysis, setOpeningAnalysis] = useState<OpeningAnalysisResult | undefined>();
  const [improvementPlan, setImprovementPlan] = useState<PersonalizedImprovementPlan | undefined>();

  // Mobile active tab view: 'board' | 'moves' | 'coach'
  const [mobileTab, setMobileTab] = useState<'board' | 'moves' | 'coach'>('board');

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
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <Swords className="h-12 w-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Game Selected for Review</h2>
        <p className="text-sm text-slate-400">
          Import or select a game in the Analysis dashboard to begin reviewing.
        </p>
        <button
          onClick={() => navigate('/analysis')}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors cursor-pointer"
        >
          Go to Analysis
        </button>
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Game Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/analysis')}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Back to games list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
              <span>{activeGame.white}</span>
              <span className="text-slate-500 font-normal">vs</span>
              <span>{activeGame.black}</span>
            </h1>
            <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
              <span>
                {openingAnalysis?.opening.name || activeGame.openingName || activeGame.eco || 'Chess Game'}
              </span>
              <span>•</span>
              <span className="font-bold text-slate-300">{activeGame.result}</span>
              <span>•</span>
              <span>{activeGame.date}</span>
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 flex-wrap">
          {games.length > 1 && (
            <select
              value={activeGame.id}
              onChange={(e) => handleSelectGame(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500 max-w-[200px] truncate"
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.white} vs {g.black} ({g.date})
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportPgn}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Download original PGN"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>PGN</span>
          </button>

          {analysisResult && (
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Download full analysis JSON"
            >
              <FileJson className="h-3.5 w-3.5 text-emerald-400" />
              <span>JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Intelligence Toolbar: Opening Coach, Mistake Drill, Improvement Plan */}
      {analysisResult && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3 shadow-lg">
          <div className="flex items-center gap-2 flex-wrap">
            {openingAnalysis && (
              <button
                onClick={() => setIsOpeningCoachOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-emerald-400" />
                <span>Opening Coach ({openingAnalysis.opening.eco})</span>
              </button>
            )}

            {improvementPlan && improvementPlan.practicePositions.length > 0 && (
              <button
                onClick={() => setIsMistakeTrainerOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-rose-950/40 hover:bg-rose-950/60 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <Target className="h-4 w-4 text-rose-400" />
                <span>Drill Mistakes ({improvementPlan.practicePositions.length})</span>
              </button>
            )}

            {improvementPlan && (
              <button
                onClick={() => setIsImprovementPlanOpen(true)}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-950/30 hover:bg-amber-950/50 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer"
              >
                <Award className="h-4 w-4 text-amber-400" />
                <span>Improvement Plan</span>
              </button>
            )}
          </div>

          {/* Quick accuracy badges */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              {activeGame.white}: <strong className="text-emerald-400">{analysisResult.whiteAccuracy}%</strong>
            </div>
            <div>
              {activeGame.black}: <strong className="text-teal-400">{analysisResult.blackAccuracy}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tab Switcher (< lg screens) */}
      <div className="flex lg:hidden bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
        <button
          onClick={() => setMobileTab('board')}
          className={`flex-1 py-2 text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === 'board' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'
          }`}
        >
          <Layout className="h-3.5 w-3.5" />
          <span>Board &amp; Review</span>
        </button>
        <button
          onClick={() => setMobileTab('moves')}
          className={`flex-1 py-2 text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === 'moves' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'
          }`}
        >
          <ListFilter className="h-3.5 w-3.5" />
          <span>Moves &amp; Filters</span>
        </button>
        <button
          onClick={() => setMobileTab('coach')}
          className={`flex-1 py-2 text-center rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
            mobileTab === 'coach' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'
          }`}
        >
          <Target className="h-3.5 w-3.5" />
          <span>Report &amp; Drills</span>
        </button>
      </div>

      {/* Main Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Eval Bar + Chessboard + Controls + Graph */}
        <div className={`lg:col-span-7 flex flex-col items-center gap-4 ${mobileTab !== 'board' ? 'hidden lg:flex' : ''}`}>
          <div className="w-full flex items-stretch justify-center gap-3">
            {/* Vertical Eval bar */}
            <div className="hidden sm:block">
              <EvaluationBar
                score={activeMove ? activeMove.evalAfter.score : undefined}
                orientation={orientation}
              />
            </div>

            {/* Board */}
            <div className="flex-1 flex justify-center">
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

          {/* Horizontal Eval Bar for Mobile */}
          <div className="w-full sm:hidden">
            <EvaluationBar
              score={activeMove ? activeMove.evalAfter.score : undefined}
              orientation={orientation}
              horizontal={true}
            />
          </div>

          {/* Navigation Controls */}
          <div className="w-full max-w-[560px]">
            <AnalysisControls
              currentPly={currentPly}
              totalPlies={totalPlies}
              onSelectPly={(ply) => setCurrentPly(ply)}
              onFlipBoard={() => setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))}
            />
          </div>

          {/* Tactical Explanation Box right below board on mobile */}
          <div className="w-full max-w-[560px] lg:hidden">
            <ReviewSummary game={activeGame} activeMove={activeMove} />
          </div>

          {/* Advantage Graph */}
          {analysisResult && (
            <div className="w-full max-w-[560px]">
              <AnalysisGraph
                moves={analysisResult.moves}
                currentPly={currentPly}
                onSelectPly={(ply) => setCurrentPly(ply)}
              />
            </div>
          )}
        </div>

        {/* Right: Review Details & Move List */}
        <div className={`lg:col-span-5 space-y-4 ${mobileTab === 'board' ? 'hidden lg:block' : ''}`}>
          {/* Active Move Explanation Box (Desktop) */}
          <div className="hidden lg:block">
            <ReviewSummary game={activeGame} activeMove={activeMove} />
          </div>

          {/* Accuracy Card */}
          {analysisResult && (
            <div className={mobileTab === 'moves' ? 'hidden lg:block' : ''}>
              <AccuracyCard
                result={analysisResult}
                whitePlayer={activeGame.white}
                blackPlayer={activeGame.black}
              />
            </div>
          )}

          {/* Move List with Classification Filters */}
          {analysisResult ? (
            <div className={`h-[420px] ${mobileTab === 'coach' ? 'hidden lg:block' : ''}`}>
              <MoveList
                moves={analysisResult.moves}
                currentPly={currentPly}
                onSelectPly={(ply) => {
                  setCurrentPly(ply);
                  if (mobileTab === 'moves') setMobileTab('board');
                }}
              />
            </div>
          ) : (
            <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-3">
              <p className="text-sm font-semibold text-slate-300">
                This game has not been analyzed yet.
              </p>
              <p className="text-xs text-slate-400">
                Run local Stockfish WASM to generate accurate evaluations, best moves, and player accuracy.
              </p>
              <button
                onClick={async () => {
                  if (!activeGame) return;
                  const settings = await storageService.getSettings();
                  const session = await sessionManager.createSession(
                    [activeGame],
                    settings,
                    `Review: ${activeGame.white} vs ${activeGame.black}`
                  );
                  sessionManager.startSession(session.id);
                  navigate(`/analysis/session/${encodeURIComponent(session.id)}`);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Analyse Game with Stockfish
              </button>
            </div>
          )}

          {/* Mobile Training & Coaching Callout view */}
          {mobileTab === 'coach' && improvementPlan && (
            <div className="space-y-4 lg:hidden">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-rose-400" />
                  <span>Mistake Replay Drills</span>
                </h3>
                <p className="text-xs text-slate-300">
                  {improvementPlan.practicePositions.length} critical positions where significant mistakes were made.
                </p>
                <button
                  onClick={() => setIsMistakeTrainerOpen(true)}
                  className="w-full py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer"
                >
                  Start Mistake Drill
                </button>
              </div>

              {openingAnalysis && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-emerald-400" />
                    <span>Opening Theory Replay</span>
                  </h3>
                  <p className="text-xs text-slate-300">
                    {openingAnalysis.opening.name} ({openingAnalysis.opening.eco})
                  </p>
                  <button
                    onClick={() => setIsOpeningCoachOpen(true)}
                    className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors cursor-pointer"
                  >
                    Open Opening Coach
                  </button>
                </div>
              )}
            </div>
          )}
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
