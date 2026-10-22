import React, { useEffect, useRef } from 'react';
import { MoveAnalysis } from '../../types/chess';
import { ClassificationService } from '../../chess/classification';

interface MoveListProps {
  moves: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  className?: string;
}

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  currentPly,
  onSelectPly,
  className = '',
}) => {
  const activeMoveRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (activeMoveRef.current) {
      activeMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPly]);

  // Group moves into turns (pairs of White and Black moves)
  const turns: { moveNumber: number; white?: MoveAnalysis; black?: MoveAnalysis }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    turns.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  const renderMoveButton = (move?: MoveAnalysis) => {
    if (!move) return <div className="flex-1" />;

    const isActive = move.ply === currentPly;
    const badge = ClassificationService.getBadgeDetails(move.classification);

    return (
      <button
        ref={isActive ? activeMoveRef : null}
        onClick={() => onSelectPly(move.ply)}
        className={`flex-1 flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm font-medium transition-all ${
          isActive
            ? 'bg-emerald-600/30 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
      >
        <span className="font-mono">{move.san}</span>
        <div className="flex items-center gap-1.5">
          {move.centipawnLoss > 20 && (
            <span className="text-[10px] text-slate-400 font-mono">
              -{move.centipawnLoss}
            </span>
          )}
          <span
            title={`${badge.label}: ${move.commentary}`}
            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold border ${badge.bgClass} ${badge.textClass}`}
          >
            {badge.icon}
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400">
        <span className="w-8">#</span>
        <span className="flex-1 text-center">White</span>
        <span className="flex-1 text-center">Black</span>
      </div>

      {/* Move Rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-1">
        {turns.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No moves available</div>
        ) : (
          turns.map((turn) => (
            <div key={turn.moveNumber} className="flex items-center gap-1 py-0.5">
              <span className="w-8 text-center font-mono text-xs text-slate-500">
                {turn.moveNumber}.
              </span>
              {renderMoveButton(turn.white)}
              {renderMoveButton(turn.black)}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
