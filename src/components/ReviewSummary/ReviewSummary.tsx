import React from 'react';
import { GameMetadata, MoveAnalysis } from '../../types/chess';
import { ClassificationService } from '../../chess/classification';
import { Lightbulb, Swords, AlertTriangle, ArrowRight } from 'lucide-react';

interface ReviewSummaryProps {
  game: GameMetadata;
  activeMove?: MoveAnalysis;
  className?: string;
}

export const ReviewSummary: React.FC<ReviewSummaryProps> = ({
  game,
  activeMove,
  className = '',
}) => {
  if (!activeMove) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Swords className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">
              {game.white} vs {game.black}
            </h2>
            <p className="text-xs text-slate-400">
              {game.openingName || game.eco || 'Standard Chess Game'} • {game.result} • {game.date}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Use the arrow controls or move list to navigate through the game and view engine-evaluated move quality, best engine alternatives, and tactical explanations.
        </p>
      </div>
    );
  }

  const badge = ClassificationService.getBadgeDetails(activeMove.classification);
  const moveNumber = Math.floor((activeMove.ply - 1) / 2) + 1;
  const isWhite = activeMove.turn === 'w';
  const isMistakeOrBlunder = ['blunder', 'mistake', 'inaccuracy', 'missed_win'].includes(
    activeMove.classification
  );

  // Score formatting helpers
  const formatScore = (evalObj: typeof activeMove.evalBefore) => {
    if (evalObj.score.type === 'mate') {
      return `M${evalObj.score.value}`;
    }
    const val = (evalObj.score.value / 100).toFixed(2);
    return evalObj.score.value > 0 ? `+${val}` : val;
  };

  const evalBeforeStr = formatScore(activeMove.evalBefore);
  const evalAfterStr = formatScore(activeMove.evalAfter);

  // Lesson synthesis based on classification and centipawn loss
  let lessonText = '';
  if (activeMove.classification === 'blunder') {
    lessonText =
      'Always scan for opponent forcing responses (checks, captures, threats) before committing to a move.';
  } else if (activeMove.classification === 'mistake') {
    lessonText =
      'Consider whether an alternative piece move defends your key squares or preserves material better.';
  } else if (activeMove.classification === 'inaccuracy') {
    lessonText =
      'Look for proactive piece improvements rather than making non-urgent defensive pawn or waiting moves.';
  } else if (activeMove.classification === 'brilliant') {
    lessonText =
      'Superb calculation! Sacrificing material for decisive positional or tactical superiority.';
  } else {
    lessonText = 'High quality move that maintains solid position and maximizes piece activity.';
  }

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3.5 ${className}`}>
      {/* Top move header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-slate-400">
            {moveNumber}{isWhite ? '.' : '...'}
          </span>
          <span className="font-mono text-base font-extrabold text-white">
            {activeMove.san}
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badge.bgClass} ${badge.textClass}`}
          >
            <span>{badge.icon}</span>
            <span>{badge.label}</span>
          </span>
        </div>

        {activeMove.centipawnLoss > 0 && (
          <span className="text-xs font-mono font-medium text-rose-400">
            -{activeMove.centipawnLoss} cp
          </span>
        )}
      </div>

      {/* Main Tactical Commentary Box */}
      <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-3 text-sm text-slate-200 leading-relaxed flex items-start gap-2.5">
        <Lightbulb className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs sm:text-sm font-medium">{activeMove.commentary}</p>
          <p className="text-[11px] text-slate-400 leading-normal">
            <strong className="text-slate-300">Key Takeaway:</strong> {lessonText}
          </p>
        </div>
      </div>

      {/* Structured Move Comparison for Mistakes & Blunders */}
      {isMistakeOrBlunder && activeMove.bestMoveSan && activeMove.san !== activeMove.bestMoveSan && (
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
            <span>Mistake Analysis &amp; Engine Alternative</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Played move */}
            <div className="bg-rose-950/20 border border-rose-500/30 rounded-lg p-2.5">
              <span className="text-rose-400 text-[10px] uppercase font-bold block mb-1">Played Move</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-rose-200 text-sm">{activeMove.san}</span>
                <span className="font-mono text-xs text-rose-400">Eval: {evalAfterStr}</span>
              </div>
            </div>

            {/* Best engine move */}
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2.5">
              <span className="text-emerald-400 text-[10px] uppercase font-bold block mb-1">Stockfish Preferred</span>
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-300 text-sm">{activeMove.bestMoveSan}</span>
                <span className="font-mono text-xs text-emerald-400">Eval: {evalBeforeStr}</span>
              </div>
            </div>
          </div>

          {/* Evaluation swing banner */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-950 text-xs font-mono border border-slate-800">
            <span className="text-slate-400">Evaluation Transition:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-300">{evalBeforeStr}</span>
              <ArrowRight className="h-3 w-3 text-slate-500" />
              <span className="text-rose-400 font-bold">{evalAfterStr}</span>
              <span className="text-slate-500 text-[11px]">(-{activeMove.centipawnLoss} cp)</span>
            </div>
          </div>
        </div>
      )}

      {/* Numerical Metrics Grid */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/60 text-center text-[11px] text-slate-400">
        <div>
          Win Prob: <strong className="text-slate-200 font-mono">{activeMove.winProbabilityAfter}%</strong>
        </div>
        <div>
          Move Acc: <strong className="text-emerald-400 font-mono">{activeMove.accuracy}%</strong>
        </div>
        <div>
          Depth: <strong className="text-slate-200 font-mono">{activeMove.evalAfter.depth}</strong>
        </div>
      </div>
    </div>
  );
};
