import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

interface AnalysisControlsProps {
  currentPly: number;
  totalPlies: number;
  onSelectPly: (ply: number) => void;
  onFlipBoard: () => void;
  className?: string;
}

export const AnalysisControls: React.FC<AnalysisControlsProps> = ({
  currentPly,
  totalPlies,
  onSelectPly,
  onFlipBoard,
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  // Autoplay timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        if (currentPly >= totalPlies) {
          setIsPlaying(false);
        } else {
          onSelectPly(currentPly + 1);
        }
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isPlaying, currentPly, totalPlies, onSelectPly]);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onSelectPly(Math.max(0, currentPly - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onSelectPly(Math.min(totalPlies, currentPly + 1));
      } else if (e.key === 'Home' || e.key === 'ArrowUp') {
        e.preventDefault();
        onSelectPly(0);
      } else if (e.key === 'End' || e.key === 'ArrowDown') {
        e.preventDefault();
        onSelectPly(totalPlies);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        onFlipBoard();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPly, totalPlies, onSelectPly, onFlipBoard]);

  return (
    <div className={`flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 shadow-md ${className}`}>
      {/* Flip Board Button */}
      <button
        onClick={onFlipBoard}
        title="Flip board (F)"
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {/* Navigation Buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => onSelectPly(0)}
          disabled={currentPly <= 0}
          title="First move (Home)"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => onSelectPly(Math.max(0, currentPly - 1))}
          disabled={currentPly <= 0}
          title="Previous move (Left arrow)"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title="Toggle autoplay (Space)"
          className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all active:scale-95"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
        </button>

        <button
          onClick={() => onSelectPly(Math.min(totalPlies, currentPly + 1))}
          disabled={currentPly >= totalPlies}
          title="Next move (Right arrow)"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <button
          onClick={() => onSelectPly(totalPlies)}
          disabled={currentPly >= totalPlies}
          title="Last move (End)"
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="h-5 w-5" />
        </button>
      </div>

      {/* Move counter */}
      <div className="text-xs font-mono text-slate-400">
        Ply <span className="text-emerald-400 font-bold">{currentPly}</span> / {totalPlies}
      </div>
    </div>
  );
};
