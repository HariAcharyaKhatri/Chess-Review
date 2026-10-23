import React, { useState } from 'react';
import { Target, X, CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { PracticePosition } from '../../services/improvementService';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { Square } from 'chess.js';
import { PositionService } from '../../chess/positionService';

interface MistakeTrainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  positions: PracticePosition[];
  theme?: 'green' | 'blue' | 'brown';
}

export const MistakeTrainerModal: React.FC<MistakeTrainerModalProps> = ({
  isOpen,
  onClose,
  positions,
  theme = 'green',
}) => {
  if (!isOpen || positions.length === 0) return null;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userFeedback, setUserFeedback] = useState<{ isCorrect: boolean; text: string } | null>(null);
  const [solvedPositions, setSolvedPositions] = useState<Set<number>>(new Set());
  const [boardFen, setBoardFen] = useState<string>(positions[0]?.fenBefore || '');

  const currentPos = positions[currentIndex];

  const handleSelectPosition = (idx: number) => {
    setCurrentIndex(idx);
    setUserFeedback(null);
    setBoardFen(positions[idx].fenBefore);
  };

  const handleBoardMove = (from: Square, to: Square) => {
    if (!currentPos || (userFeedback && userFeedback.isCorrect)) return;

    try {
      const legalMoves = PositionService.getLegalMovesForSquare(boardFen, from);
      const played = legalMoves.find((m) => m.to === to);
      if (!played) return;

      const playedUci = `${from}${to}${played.promotion || ''}`;
      const bestMoveUci = currentPos.bestMoveUci;

      // Check if move matches best move by SAN or UCI
      const isCorrect =
        played.san === currentPos.bestMoveSan ||
        playedUci === bestMoveUci ||
        played.san === currentPos.bestMoveUci;

      if (isCorrect) {
        setUserFeedback({
          isCorrect: true,
          text: `Outstanding! ${played.san} is indeed the engine's best move!`,
        });
        setSolvedPositions((prev) => new Set([...prev, currentIndex]));
        // Update board FEN to reflect the move
        const newFen = PositionService.applyMove(boardFen, played.san);
        if (newFen) setBoardFen(newFen);
      } else {
        setUserFeedback({
          isCorrect: false,
          text: `Not quite! You played ${played.san}. That doesn't address the primary tactical requirement. Try again!`,
        });
      }
    } catch {
      // ignore
    }
  };

  const resetCurrentPosition = () => {
    setUserFeedback(null);
    setBoardFen(currentPos.fenBefore);
  };

  const handleNext = () => {
    if (currentIndex < positions.length - 1) {
      handleSelectPosition(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      handleSelectPosition(currentIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Mistake Replay &amp; Tactical Practice</span>
                <span className="text-xs font-normal text-slate-400 font-mono">
                  ({solvedPositions.size}/{positions.length} Solved)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Replay positions where major blunders or mistakes occurred and find Stockfish&apos;s preferred continuations.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left: Interactive Board */}
          <div className="md:col-span-7 flex flex-col items-center gap-3">
            <div className="w-full max-w-[420px] aspect-square">
              <ChessBoard
                fen={boardFen}
                orientation={currentPos.turn === 'w' ? 'white' : 'black'}
                theme={theme}
                interactive={!userFeedback?.isCorrect}
                onMove={handleBoardMove}
                bestMove={userFeedback?.isCorrect ? undefined : currentPos.bestMoveUci}
                showBestMoveArrow={false}
              />
            </div>

            {/* Sub-controls */}
            <div className="w-full max-w-[420px] flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                {currentPos.turn === 'w' ? 'White' : 'Black'} to move (Move {currentPos.moveNumber})
              </span>
              <button
                onClick={resetCurrentPosition}
                className="inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Position</span>
              </button>
            </div>

            {/* Feedback box */}
            {userFeedback && (
              <div
                className={`w-full max-w-[420px] p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                  userFeedback.isCorrect
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                }`}
              >
                {userFeedback.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>{userFeedback.text}</div>
              </div>
            )}
          </div>

          {/* Right: Mistake details & puzzle list */}
          <div className="md:col-span-5 space-y-4 text-xs">
            {/* Position Selector Carousel */}
            <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <div className="text-center">
                <span className="font-bold text-slate-200">
                  Position {currentIndex + 1} of {positions.length}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Theme: {currentPos.tacticalTheme}
                </span>
              </div>

              <button
                onClick={handleNext}
                disabled={currentIndex === positions.length - 1}
                className="p-1.5 rounded-lg bg-slate-900 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* What happened in the game */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                What Happened in the Game
              </span>
              <p className="text-slate-200">
                On move {currentPos.moveNumber}, you played <strong className="text-rose-400 font-mono">{currentPos.playedSan}</strong> which was classified as a{' '}
                <strong className="text-rose-400 capitalize">{currentPos.classification}</strong> (-{currentPos.centipawnLoss} cp).
              </p>
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-[11px]">
                {currentPos.explanation}
              </div>
            </div>

            {/* Solution reveal toggle */}
            {userFeedback?.isCorrect ? (
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Sparkles className="h-4 w-4" />
                  <span>Engine Recommended Solution</span>
                </div>
                <div className="text-base font-mono font-extrabold text-emerald-300">
                  {currentPos.bestMoveSan}
                </div>
                {currentIndex < positions.length - 1 && (
                  <button
                    onClick={handleNext}
                    className="w-full mt-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Proceed to Next Mistake</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Your Objective
                </span>
                <p className="text-slate-300">
                  Make a move on the chessboard that remedies this tactical defect and preserves your evaluation.
                </p>
                <button
                  onClick={() => {
                    setUserFeedback({
                      isCorrect: true,
                      text: `Hint: The engine's preferred continuation is ${currentPos.bestMoveSan}.`,
                    });
                  }}
                  className="text-xs text-slate-400 hover:text-emerald-400 underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Reveal Solution
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
