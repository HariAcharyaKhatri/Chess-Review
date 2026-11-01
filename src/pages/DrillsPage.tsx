import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { GameMetadata } from '../types/chess';
import { storageService } from '../storage/indexedDb';
import { ChessBoard } from '../components/ChessBoard/ChessBoard';
import { PositionService } from '../chess/positionService';
import { soundService } from '../services/soundService';
import { Square } from 'chess.js';
import {
  Target,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Eye,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Flame,
  Swords,
} from 'lucide-react';

interface DrillItem {
  id: string;
  gameId: string;
  gameTitle: string;
  ply: number;
  turn: 'w' | 'b';
  fenBefore: string;
  fenAfter: string;
  playedSan: string;
  bestMoveSan: string;
  bestMoveUci: string;
  classification: string;
  centipawnLoss: number;
  commentary: string;
}

export const DrillsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [games, setGames] = useState<GameMetadata[]>([]);
  const [allDrills, setAllDrills] = useState<DrillItem[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string>(searchParams.get('gameId') || 'all');
  const [filterType, setFilterType] = useState<'all' | 'blunders' | 'mistakes'>('all');

  const [currentIndex, setCurrentIndex] = useState(0);
  const [boardFen, setBoardFen] = useState<string>('');
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [solvedSet, setSolvedSet] = useState<Set<string>>(new Set());
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [boardTheme, setBoardTheme] = useState<'green' | 'blue' | 'brown'>('green');

  useEffect(() => {
    loadDrills();
  }, []);

  const loadDrills = async () => {
    const loadedGames = await storageService.getAllGames();
    const loadedResults = await storageService.getAllAnalysisResults();
    const settings = await storageService.getSettings();
    setBoardTheme(settings.boardTheme || 'green');
    setGames(loadedGames);

    const drills: DrillItem[] = [];

    for (const res of loadedResults) {
      const g = loadedGames.find((game) => game.id === res.gameId);
      const title = g ? `${g.white} vs ${g.black}` : `Game #${res.gameId}`;

      res.moves.forEach((m) => {
        if (['blunder', 'mistake', 'missed_win'].includes(m.classification)) {
          drills.push({
            id: `${res.gameId}_ply_${m.ply}`,
            gameId: res.gameId,
            gameTitle: title,
            ply: m.ply,
            turn: m.turn,
            fenBefore: m.fenBefore,
            fenAfter: m.fenAfter,
            playedSan: m.san,
            bestMoveSan: m.bestMoveSan || m.bestMove,
            bestMoveUci: m.bestMove,
            classification: m.classification,
            centipawnLoss: m.centipawnLoss,
            commentary: m.commentary,
          });
        }
      });
    }

    setAllDrills(drills);

    const initialGameId = searchParams.get('gameId') || 'all';
    setSelectedGameId(initialGameId);

    const filtered = drills.filter((d) => initialGameId === 'all' || d.gameId === initialGameId);
    if (filtered.length > 0) {
      setCurrentIndex(0);
      setBoardFen(filtered[0].fenBefore);
    }
  };

  const filteredDrills = allDrills.filter((d) => {
    if (selectedGameId !== 'all' && d.gameId !== selectedGameId) return false;
    if (filterType === 'blunders') return d.classification === 'blunder' || d.classification === 'missed_win';
    if (filterType === 'mistakes') return d.classification === 'mistake';
    return true;
  });

  const currentDrill = filteredDrills[currentIndex] || null;

  useEffect(() => {
    if (currentDrill) {
      setBoardFen(currentDrill.fenBefore);
      setFeedback(null);
      setHintLevel(0);
    }
  }, [currentIndex, selectedGameId, filterType]);

  const handleSelectDrill = (idx: number) => {
    setCurrentIndex(idx);
    setFeedback(null);
    setHintLevel(0);
    if (filteredDrills[idx]) {
      setBoardFen(filteredDrills[idx].fenBefore);
    }
  };

  const handleBoardMove = (from: Square, to: Square, promotion?: string) => {
    if (!currentDrill || (feedback && feedback.isCorrect)) return;

    try {
      const legalMoves = PositionService.getLegalMovesForSquare(boardFen, from);
      const played = legalMoves.find((m) => m.to === to && (!promotion || m.promotion === promotion));
      if (!played) return;

      const playedUci = `${from}${to}${played.promotion || ''}`;
      const bestUci = currentDrill.bestMoveUci.toLowerCase();
      const bestSan = currentDrill.bestMoveSan;

      const isMatch =
        playedUci === bestUci ||
        played.san === bestSan ||
        (bestSan && played.san.replace('+', '').replace('#', '') === bestSan.replace('+', '').replace('#', ''));

      if (isMatch) {
        soundService.playSuccess();
        setFeedback({
          isCorrect: true,
          text: `Outstanding! ${played.san} is indeed the top engine continuation!`,
        });
        setSolvedSet((prev) => new Set([...prev, currentDrill.id]));
        const nextStreak = streak + 1;
        setStreak(nextStreak);
        if (nextStreak > maxStreak) setMaxStreak(nextStreak);

        // Update board with move
        const newFen = PositionService.applyMove(boardFen, played.san);
        if (newFen) setBoardFen(newFen);
      } else {
        soundService.playMistake();
        setFeedback({
          isCorrect: false,
          text: `Not quite! You played ${played.san}, but the position requires a stronger tactical response. Try another move or use a hint!`,
        });
        setStreak(0);
      }
    } catch {
      // ignore
    }
  };

  const handleShowHint = () => {
    if (!currentDrill) return;
    if (hintLevel === 0) {
      const pieceFrom = currentDrill.bestMoveUci.substring(0, 2);
      setHintLevel(1);
      setFeedback({
        isCorrect: false,
        text: `Hint 1: Look at the piece on square ${pieceFrom.toUpperCase()}.`,
      });
    } else {
      setHintLevel(2);
      setFeedback({
        isCorrect: false,
        text: `Hint 2: Move the piece from ${currentDrill.bestMoveUci.substring(0, 2).toUpperCase()} to ${currentDrill.bestMoveUci.substring(2, 4).toUpperCase()} (${currentDrill.bestMoveSan}).`,
      });
    }
  };

  const handleRevealSolution = () => {
    if (!currentDrill) return;
    const newFen = PositionService.applyMove(currentDrill.fenBefore, currentDrill.bestMoveSan);
    if (newFen) setBoardFen(newFen);
    setFeedback({
      isCorrect: true,
      text: `Solution: ${currentDrill.bestMoveSan} was the strongest move. ${currentDrill.commentary}`,
    });
  };

  const handleResetPosition = () => {
    if (!currentDrill) return;
    setBoardFen(currentDrill.fenBefore);
    setFeedback(null);
    setHintLevel(0);
  };

  if (allDrills.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <Target className="h-12 w-12 text-slate-600 mx-auto" />
        <h2 className="text-xl font-bold text-white">No Tactical Mistakes Recorded</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Analyze your games with Stockfish WASM to automatically generate tailored tactical drills from your blunders and missed opportunities.
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

  const moveNumber = currentDrill ? Math.floor((currentDrill.ply - 1) / 2) + 1 : 1;
  const isWhite = currentDrill ? currentDrill.turn === 'w' : true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* Top Header & Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <span>Mistake Trainer &amp; Drills</span>
            </h1>
            <p className="text-xs text-slate-400">
              Interactive tactical replay from your actual games. Find the best move!
            </p>
          </div>
        </div>

        {/* Streak & Progress Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold font-mono">
            <Flame className="h-4 w-4" />
            <span>Streak: {streak}</span>
            {maxStreak > 0 && <span className="text-slate-500 text-[11px]">(Best: {maxStreak})</span>}
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold font-mono">
            <CheckCircle2 className="h-4 w-4" />
            <span>Solved: {solvedSet.size} / {allDrills.length}</span>
          </div>
        </div>
      </div>

      {/* Filter Row: Game select & Mistake Type */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-400">Filter Game:</span>
          <select
            value={selectedGameId}
            onChange={(e) => {
              setSelectedGameId(e.target.value);
              setCurrentIndex(0);
            }}
            className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium focus:outline-none focus:border-emerald-500 max-w-[240px] truncate"
          >
            <option value="all">All Games ({allDrills.length} mistakes)</option>
            {games.map((g) => {
              const count = allDrills.filter((d) => d.gameId === g.id).length;
              if (count === 0) return null;
              return (
                <option key={g.id} value={g.id}>
                  {g.white} vs {g.black} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => { setFilterType('all'); setCurrentIndex(0); }}
            className={`px-3 py-1 rounded-md transition-colors ${filterType === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-400'}`}
          >
            All ({allDrills.filter((d) => selectedGameId === 'all' || d.gameId === selectedGameId).length})
          </button>
          <button
            onClick={() => { setFilterType('blunders'); setCurrentIndex(0); }}
            className={`px-3 py-1 rounded-md transition-colors ${filterType === 'blunders' ? 'bg-rose-600 text-white shadow' : 'text-slate-400'}`}
          >
            Blunders
          </button>
          <button
            onClick={() => { setFilterType('mistakes'); setCurrentIndex(0); }}
            className={`px-3 py-1 rounded-md transition-colors ${filterType === 'mistakes' ? 'bg-amber-600 text-white shadow' : 'text-slate-400'}`}
          >
            Mistakes
          </button>
        </div>
      </div>

      {currentDrill ? (
        /* Side-by-Side Viewport Layout: No Scroll on PC */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Interactive Chessboard */}
          <div className="lg:col-span-7 flex flex-col items-center gap-3">
            <div className="w-full flex justify-center">
              <div className="w-full max-w-[480px] aspect-square">
                <ChessBoard
                  fen={boardFen}
                  orientation={currentDrill.turn === 'w' ? 'white' : 'black'}
                  theme={boardTheme}
                  interactive={!feedback?.isCorrect}
                  onMove={handleBoardMove}
                  showBestMoveArrow={Boolean(feedback?.isCorrect || hintLevel === 2)}
                  bestMove={currentDrill.bestMoveUci}
                />
              </div>
            </div>

            {/* Turn Banner */}
            <div className="w-full max-w-[480px] flex items-center justify-between px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold">
              <span className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded-full border ${currentDrill.turn === 'w' ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-600'}`} />
                <span className="text-white font-bold">{currentDrill.turn === 'w' ? 'White' : 'Black'} to Move</span>
              </span>
              <span className="font-mono text-slate-400">
                Puzzle {currentIndex + 1} of {filteredDrills.length}
              </span>
            </div>
          </div>

          {/* Right Column: Mission Details, Feedback & Controls */}
          <div className="lg:col-span-5 flex flex-col gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            {/* Header info */}
            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-400">
                  Move {moveNumber}{isWhite ? '.' : '...'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {currentDrill.classification.replace('_', ' ')} (-{currentDrill.centipawnLoss} cp)
                </span>
              </div>
              <h2 className="text-base font-bold text-white mt-1">
                {currentDrill.gameTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                In the game, <strong className="text-slate-200">{currentDrill.playedSan}</strong> was played. What should have been played instead?
              </p>
            </div>

            {/* Dynamic Feedback Box */}
            <div
              className={`p-4 rounded-xl border transition-all text-xs ${
                feedback
                  ? feedback.isCorrect
                    ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200 shadow-md shadow-emerald-900/20'
                    : 'bg-rose-950/60 border-rose-500/50 text-rose-200 shadow-md shadow-rose-900/20'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              {feedback ? (
                <div className="flex items-start gap-2.5">
                  {feedback.isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <p className="leading-relaxed font-medium">{feedback.text}</p>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-slate-400">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <span>Click and drag or click squares on the board to make your move.</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={handleShowHint}
                className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                <span>{hintLevel === 0 ? 'Show Hint' : 'Deeper Hint'}</span>
              </button>

              <button
                onClick={handleRevealSolution}
                className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5 text-slate-400" />
                <span>Reveal Solution</span>
              </button>

              <button
                onClick={handleResetPosition}
                className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Board</span>
              </button>

              <Link
                to={`/review?gameId=${encodeURIComponent(currentDrill.gameId)}`}
                className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Swords className="h-3.5 w-3.5" />
                <span>Open in Review</span>
              </Link>
            </div>

            {/* Navigation buttons: Prev / Next */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                disabled={currentIndex === 0}
                onClick={() => handleSelectDrill(currentIndex - 1)}
                className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-40 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              <button
                disabled={currentIndex >= filteredDrills.length - 1}
                onClick={() => handleSelectDrill(currentIndex + 1)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-md"
              >
                <span>Next Puzzle</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Quick list of drills for this filter */}
            <div className="mt-1 pt-3 border-t border-slate-800/80">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Puzzles in this batch
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                {filteredDrills.map((d, idx) => {
                  const isSolved = solvedSet.has(d.id);
                  const isCurrent = idx === currentIndex;
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleSelectDrill(idx)}
                      className={`h-7 w-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400'
                          : isSolved
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
