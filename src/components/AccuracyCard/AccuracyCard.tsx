import React from 'react';
import { GameAnalysisResult, MoveClassification } from '../../types/chess';
import { ClassificationService } from '../../chess/classification';

interface AccuracyCardProps {
  result: GameAnalysisResult;
  whitePlayer: string;
  blackPlayer: string;
  className?: string;
}

export const AccuracyCard: React.FC<AccuracyCardProps> = ({
  result,
  whitePlayer,
  blackPlayer,
  className = '',
}) => {
  const classifications: MoveClassification[] = [
    'brilliant',
    'great',
    'best',
    'excellent',
    'good',
    'book',
    'inaccuracy',
    'mistake',
    'missed_win',
    'blunder',
  ];

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md ${className}`}>
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center justify-between">
        <span>Performance &amp; Accuracy</span>
        <span className="text-xs text-slate-500 font-normal">Documented Model</span>
      </h3>

      {/* Accuracy Header Grid */}
      <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-800">
        {/* White */}
        <div className="flex flex-col items-center bg-slate-950/50 rounded-lg p-3 border border-slate-800/60">
          <span className="text-xs text-slate-400 font-medium truncate max-w-[120px]">
            {whitePlayer} (White)
          </span>
          <span className="text-3xl font-extrabold text-emerald-400 font-mono my-1">
            {result.whiteAccuracy}%
          </span>
          <span className="text-[11px] text-slate-500">
            Avg Loss: <strong className="text-slate-300">{result.whiteAcpl}</strong> cp
          </span>
        </div>

        {/* Black */}
        <div className="flex flex-col items-center bg-slate-950/50 rounded-lg p-3 border border-slate-800/60">
          <span className="text-xs text-slate-400 font-medium truncate max-w-[120px]">
            {blackPlayer} (Black)
          </span>
          <span className="text-3xl font-extrabold text-emerald-400 font-mono my-1">
            {result.blackAccuracy}%
          </span>
          <span className="text-[11px] text-slate-500">
            Avg Loss: <strong className="text-slate-300">{result.blackAcpl}</strong> cp
          </span>
        </div>
      </div>

      {/* Classification Breakdown Table */}
      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between font-semibold text-slate-500 px-2 py-1">
          <span className="w-10 text-center">White</span>
          <span className="flex-1 text-center">Move Quality</span>
          <span className="w-10 text-center">Black</span>
        </div>

        {classifications.map((cls) => {
          const whiteCount = result.whiteClassifications[cls] || 0;
          const blackCount = result.blackClassifications[cls] || 0;
          if (whiteCount === 0 && blackCount === 0) return null;

          const badge = ClassificationService.getBadgeDetails(cls);

          return (
            <div
              key={cls}
              className="flex items-center justify-between px-2 py-1 rounded bg-slate-950/40 hover:bg-slate-950 transition-colors"
            >
              <span className="w-10 text-center font-mono font-bold text-slate-300">
                {whiteCount}
              </span>

              <div className="flex items-center justify-center gap-1.5 flex-1">
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold border ${badge.bgClass} ${badge.textClass}`}
                >
                  {badge.icon}
                </span>
                <span className={`font-medium ${badge.textClass}`}>{badge.label}</span>
              </div>

              <span className="w-10 text-center font-mono font-bold text-slate-300">
                {blackCount}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
