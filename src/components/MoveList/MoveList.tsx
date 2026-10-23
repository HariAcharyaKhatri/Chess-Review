import React, { useEffect, useRef, useState } from 'react';
import { MoveAnalysis } from '../../types/chess';
import { ClassificationService } from '../../chess/classification';
import { AlertTriangle, AlertCircle, Sparkles } from 'lucide-react';

interface MoveListProps {
  moves: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  className?: string;
}

type FilterType = 'all' | 'blunders' | 'mistakes' | 'inaccuracies' | 'best';

export const MoveList: React.FC<MoveListProps> = ({
  moves,
  currentPly,
  onSelectPly,
  className = '',
}) => {
  const activeMoveRef = useRef<HTMLButtonElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

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

  // Count classifications for filter pill badges
  const blunderCount = moves.filter((m) => m.classification === 'blunder' || m.classification === 'missed_win').length;
  const mistakeCount = moves.filter((m) => m.classification === 'mistake').length;
  const inaccuracyCount = moves.filter((m) => m.classification === 'inaccuracy').length;
  const bestCount = moves.filter((m) => ['best', 'great', 'brilliant'].includes(m.classification)).length;

  const filteredMoves = moves.filter((m) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'blunders') return m.classification === 'blunder' || m.classification === 'missed_win';
    if (activeFilter === 'mistakes') return m.classification === 'mistake';
    if (activeFilter === 'inaccuracies') return m.classification === 'inaccuracy';
    if (activeFilter === 'best') return ['best', 'great', 'brilliant'].includes(m.classification);
    return true;
  });

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
      {/* Filter Tabs Bar */}
      <div className="flex items-center gap-1 p-1.5 bg-slate-950/80 border-b border-slate-800 overflow-x-auto text-xs scrollbar-none">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
            activeFilter === 'all'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All ({moves.length})
        </button>

        {blunderCount > 0 && (
          <button
            onClick={() => setActiveFilter('blunders')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
              activeFilter === 'blunders'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Blunders ({blunderCount})</span>
          </button>
        )}

        {mistakeCount > 0 && (
          <button
            onClick={() => setActiveFilter('mistakes')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
              activeFilter === 'mistakes'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <AlertCircle className="h-3 w-3" />
            <span>Mistakes ({mistakeCount})</span>
          </button>
        )}

        {inaccuracyCount > 0 && (
          <button
            onClick={() => setActiveFilter('inaccuracies')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
              activeFilter === 'inaccuracies'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                : 'text-yellow-400 hover:bg-yellow-500/10'
            }`}
          >
            <span>Inaccuracies ({inaccuracyCount})</span>
          </button>
        )}

        {bestCount > 0 && (
          <button
            onClick={() => setActiveFilter('best')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-semibold shrink-0 transition-colors ${
              activeFilter === 'best'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-emerald-400 hover:bg-emerald-500/10'
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Best ({bestCount})</span>
          </button>
        )}
      </div>

      {/* Main Content: Filtered list or Standard Turn Table */}
      {activeFilter === 'all' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-950/60 border-b border-slate-800 text-xs font-semibold text-slate-400">
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
        </>
      ) : (
        /* Filtered List Mode */
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40 p-2 space-y-1">
          {filteredMoves.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No moves found matching the &quot;{activeFilter}&quot; filter.
            </div>
          ) : (
            filteredMoves.map((m) => {
              const moveNum = Math.floor((m.ply - 1) / 2) + 1;
              const badge = ClassificationService.getBadgeDetails(m.classification);
              const isActive = m.ply === currentPly;

              return (
                <button
                  key={m.ply}
                  onClick={() => onSelectPly(m.ply)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                    isActive
                      ? 'bg-slate-800/90 border-emerald-500/50 shadow-md'
                      : 'bg-slate-950/40 border-slate-800/60 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold border ${badge.bgClass} ${badge.textClass}`}
                    >
                      {badge.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">
                          {moveNum}{m.turn === 'w' ? '.' : '...'}
                        </span>
                        <span className="font-mono text-sm font-bold text-white">
                          {m.san}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({badge.label})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                        {m.commentary}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {m.centipawnLoss > 0 && (
                      <span className="font-mono text-xs font-bold text-rose-400 block">
                        -{m.centipawnLoss} cp
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono">
                      Best: {m.bestMoveSan || m.bestMove}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
