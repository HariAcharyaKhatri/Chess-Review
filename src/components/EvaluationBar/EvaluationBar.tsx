import React from 'react';
import { EngineScore } from '../../types/chess';
import { AccuracyService } from '../../chess/accuracy';

interface EvaluationBarProps {
  score?: EngineScore;
  orientation?: 'white' | 'black';
  className?: string;
  horizontal?: boolean;
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  score = { type: 'cp', value: 0 },
  orientation = 'white',
  className = '',
  horizontal = false,
}) => {
  // Convert score to White win probability percentage (0 to 100)
  const cp = AccuracyService.scoreToCentipawns(score);
  const whitePercent = Math.max(5, Math.min(95, AccuracyService.centipawnsToWinProb(cp)));

  // Orientation adjustment
  const fillPercent = orientation === 'white' ? whitePercent : 100 - whitePercent;

  // Format label text
  let label = '0.0';
  if (score.type === 'mate') {
    label = score.value > 0 ? `M${score.value}` : `-M${Math.abs(score.value)}`;
  } else {
    const rawVal = score.value / 100;
    label = rawVal > 0 ? `+${rawVal.toFixed(1)}` : rawVal.toFixed(1);
    if (label === '-0.0') label = '0.0';
  }

  if (horizontal) {
    return (
      <div className={`relative h-6 w-full rounded-md overflow-hidden bg-slate-900 border border-slate-700 select-none ${className}`}>
        <div
          className="h-full bg-slate-100 transition-all duration-300 ease-out flex items-center px-2 justify-start font-mono text-xs font-bold text-slate-900"
          style={{ width: `${fillPercent}%` }}
        >
          {fillPercent > 20 && label}
        </div>
        {fillPercent <= 20 && (
          <span className="absolute right-2 top-0.5 font-mono text-xs font-bold text-slate-100">
            {label}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative w-8 sm:w-10 h-full min-h-[380px] max-h-[560px] rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-end select-none ${className}`}>
      {/* Top Black section */}
      <div className="absolute top-2 inset-x-0 text-center font-mono text-xs font-bold text-slate-400 z-10 pointer-events-none">
        {orientation === 'white' && score.value < 0 && label}
        {orientation === 'black' && score.value > 0 && label}
      </div>

      {/* White fill section */}
      <div
        className="w-full bg-slate-100 transition-all duration-300 ease-out relative"
        style={{ height: `${fillPercent}%` }}
      >
        <div className="absolute bottom-2 inset-x-0 text-center font-mono text-xs font-bold text-slate-900 z-10 pointer-events-none">
          {orientation === 'white' && score.value >= 0 && label}
          {orientation === 'black' && score.value <= 0 && label}
        </div>
      </div>
    </div>
  );
};
