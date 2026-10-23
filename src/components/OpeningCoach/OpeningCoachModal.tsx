import React, { useState } from 'react';
import { BookOpen, X, ArrowRight, CheckCircle2, RotateCcw } from 'lucide-react';
import { OpeningAnalysisResult } from '../../chess/openings';
import { ChessBoard } from '../ChessBoard/ChessBoard';
import { Square } from 'chess.js';
import { PositionService } from '../../chess/positionService';

interface OpeningCoachModalProps {
  isOpen: boolean;
  onClose: () => void;
  openingAnalysis?: OpeningAnalysisResult;
  theme?: 'green' | 'blue' | 'brown';
}

export const OpeningCoachModal: React.FC<OpeningCoachModalProps> = ({
  isOpen,
  onClose,
  openingAnalysis,
  theme = 'green',
}) => {
  if (!isOpen || !openingAnalysis) return null;

  const { opening, deviation, candidateContinuations } = openingAnalysis;
  const theoryMoves = opening.moves.split(' ');

  // Practice state
  const [practicePlyIndex, setPracticePlyIndex] = useState(0);
  const [practiceFeedback, setPracticeFeedback] = useState<string | null>(null);
  const [practiceSuccess, setPracticeSuccess] = useState(false);

  // Compute current FEN along theoretical line
  const computeFenForPly = (ply: number): string => {
    try {
      const subMoves = theoryMoves.slice(0, ply);
      return PositionService.getFenFromSanMoves(subMoves);
    } catch {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
  };

  const currentPracticeFen = computeFenForPly(practicePlyIndex);
  const nextTargetMove = theoryMoves[practicePlyIndex];

  const handlePracticeMove = (from: Square, to: Square) => {
    if (practicePlyIndex >= theoryMoves.length) return;

    try {
      const legalMoves = PositionService.getLegalMovesForSquare(currentPracticeFen, from);
      const played = legalMoves.find((m) => m.to === to);
      if (!played) return;

      if (played.san === nextTargetMove) {
        const nextPly = practicePlyIndex + 1;
        setPracticePlyIndex(nextPly);
        setPracticeFeedback(`Correct! ${played.san} is the theoretical continuation.`);
        if (nextPly >= theoryMoves.length) {
          setPracticeSuccess(true);
        }
      } else {
        setPracticeFeedback(`Not quite! You played ${played.san}, but standard theory prefers ${nextTargetMove}.`);
      }
    } catch {
      // ignore
    }
  };

  const resetPractice = () => {
    setPracticePlyIndex(0);
    setPracticeFeedback(null);
    setPracticeSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                  {opening.eco}
                </span>
                <h2 className="text-lg font-bold text-white">{opening.name}</h2>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Theory line: {opening.moves}
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
          {/* Left: Interactive Opening Board */}
          <div className="md:col-span-6 flex flex-col items-center gap-3">
            <div className="w-full max-w-[360px] aspect-square">
              <ChessBoard
                fen={currentPracticeFen}
                theme={theme}
                interactive={true}
                onMove={handlePracticeMove}
              />
            </div>

            <div className="w-full max-w-[360px] flex items-center justify-between text-xs text-slate-400 px-1">
              <span>
                Move {practicePlyIndex} of {theoryMoves.length}
              </span>
              <button
                onClick={resetPractice}
                className="inline-flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset Drill</span>
              </button>
            </div>

            {/* Drill Feedback alert */}
            {practiceFeedback && (
              <div
                className={`w-full max-w-[360px] p-3 rounded-xl border text-xs ${
                  practiceSuccess
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : practiceFeedback.startsWith('Correct')
                    ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-950/30 border-amber-500/30 text-amber-300'
                }`}
              >
                {practiceFeedback}
              </div>
            )}
          </div>

          {/* Right: Opening Theory, Deviation, & Recommendations */}
          <div className="md:col-span-6 space-y-4 text-xs">
            {/* Deviation Alert (if any) */}
            {deviation ? (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2">
                <span className="text-[11px] font-bold uppercase text-amber-400 block tracking-wider">
                  Theoretical Deviation Detected
                </span>
                <p className="text-slate-200">
                  On move {Math.ceil(deviation.ply / 2)}, the game branched away from main line theory:
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-rose-300 font-mono">
                    Played: <strong>{deviation.playedMove}</strong>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 text-emerald-300 font-mono">
                    Book: <strong>{deviation.theoreticalMove}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Fully Theoretical Opening Phase</span>
                </div>
                <p className="text-slate-300">
                  All opening moves strictly followed standard master-level book lines.
                </p>
              </div>
            )}

            {/* Main Line Moves Sequence */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <span className="font-bold text-slate-300 block">Main Line Move Sequence:</span>
              <div className="flex flex-wrap gap-1.5">
                {theoryMoves.map((m, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPracticePlyIndex(idx + 1);
                      setPracticeFeedback(null);
                    }}
                    className={`px-2 py-1 rounded font-mono text-xs transition-colors ${
                      idx < practicePlyIndex
                        ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/50'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {Math.floor(idx / 2) + 1}
                    {idx % 2 === 0 ? '.' : '...'} {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Candidate Theoretical Continuations */}
            {candidateContinuations.length > 0 && (
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                <span className="font-bold text-slate-300 block">Recommended Alternative Variations:</span>
                <div className="space-y-1.5">
                  {candidateContinuations.map((c, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div>
                        <span className="font-mono font-bold text-emerald-400 mr-2">{c.move}</span>
                        <span className="text-slate-300">{c.openingName}</span>
                      </div>
                      <span className="font-mono text-[10px] text-slate-500 font-bold">{c.eco}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
