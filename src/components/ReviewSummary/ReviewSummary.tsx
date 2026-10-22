import React from 'react';
import { GameMetadata, MoveAnalysis } from '../../types/chess';
import { ClassificationService } from '../../chess/classification';
import { Lightbulb, Swords } from 'lucide-react';

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

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-3 ${className}`}>
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

      {/* Commentary Box */}
      <div className="rounded-lg bg-slate-950/70 border border-slate-800/80 p-3 text-sm text-slate-200 leading-relaxed flex items-start gap-2.5">
        <Lightbulb className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-xs sm:text-sm">{activeMove.commentary}</p>
      </div>

      {/* Engine Suggestion Comparison */}
      {activeMove.bestMoveSan && activeMove.san !== activeMove.bestMoveSan && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/40 rounded-lg p-2.5 border border-slate-800">
            <span className="text-slate-500 block mb-0.5">Played Move</span>
            <span className="font-mono font-bold text-slate-200 text-sm">
              {activeMove.san}
            </span>
          </div>
          <div className="bg-emerald-950/30 rounded-lg p-2.5 border border-emerald-500/30">
            <span className="text-emerald-400 block mb-0.5">Engine Best</span>
            <span className="font-mono font-bold text-emerald-300 text-sm">
              {activeMove.bestMoveSan}
            </span>
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
          Depth: <strong className="text-slate-200 font-mono">{activeMove.evalBefore.depth}</strong>
        </div>
      </div>
    </div>
  );
};
