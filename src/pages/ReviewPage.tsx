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
import { Download, FileJson, ArrowLeft, Swords } from 'lucide-react';

export const ReviewPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [games, setGames] = useState<GameMetadata[]>([]);
  const [activeGame, setActiveGame] = useState<GameMetadata | null>(null);
  const [analysisResult, setAnalysisResult] = useState<GameAnalysisResult | null>(null);
  const [currentPly, setCurrentPly] = useState(0);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [boardTheme, setBoardTheme] = useState<'green' | 'blue' | 'brown'>('green');

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
      // Next move suggestion or current position best move
      bestMove = activeMove.evalAfter.bestMove;
    } else if (currentPly === 0 && analysisResult.moves[0]) {
      currentFen = analysisResult.moves[0].fenBefore;
      bestMove = analysisResult.moves[0].evalBefore.bestMove;
    }
  } else if (activeGame) {
    // If not yet analyzed, parse plies from PGN directly
    try {
      const parsed = PgnParser.parseGame(activeGame.pgn);
      if (currentPly > 0 && currentPly <= parsed.moves.length) {
        const m = parsed.moves[currentPly - 1];
        currentFen = m.fenAfter;
        lastMove = { from: m.uci.substring(0, 2), to: m.uci.substring(2, 4) };
      }
    } catch {
      // Keep default starting FEN
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
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
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
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
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
            <p className="text-xs text-slate-400">
              {activeGame.openingName || activeGame.eco || 'Chess Game'} • {activeGame.result} • {activeGame.date}
            </p>
          </div>
        </div>

        {/* Game switcher and export */}
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Download original PGN"
          >
            <Download className="h-3.5 w-3.5 text-emerald-400" />
            <span>PGN</span>
          </button>

          {analysisResult && (
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Download full analysis JSON"
            >
              <FileJson className="h-3.5 w-3.5 text-emerald-400" />
              <span>JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Review Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Eval Bar + Chessboard */}
        <div className="lg:col-span-7 flex flex-col items-center gap-4">
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
        <div className="lg:col-span-5 space-y-4">
          {/* Active Move Explanation Box */}
          <ReviewSummary game={activeGame} activeMove={activeMove} />

          {/* Accuracy Card */}
          {analysisResult && (
            <AccuracyCard
              result={analysisResult}
              whitePlayer={activeGame.white}
              blackPlayer={activeGame.black}
            />
          )}

          {/* Move List */}
          {analysisResult ? (
            <div className="h-[360px]">
              <MoveList
                moves={analysisResult.moves}
                currentPly={currentPly}
                onSelectPly={(ply) => setCurrentPly(ply)}
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
        </div>
      </div>
    </div>
  );
};
