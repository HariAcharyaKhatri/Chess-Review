import React, { useState, useMemo, useEffect } from 'react';
import openingsList from '../chess/openingsData.json';
import { OpeningInfo } from '../chess/openings';
import { ChessBoard } from '../components/ChessBoard/ChessBoard';
import { PositionService } from '../chess/positionService';
import { storageService } from '../storage/indexedDb';
import {
  BookOpen,
  Search,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from 'lucide-react';

export const OpeningsPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'A' | 'B' | 'C' | 'D' | 'E'>('ALL');
  const [selectedOpening, setSelectedOpening] = useState<OpeningInfo>((openingsList as OpeningInfo[])[0]);
  const [currentPly, setCurrentPly] = useState(0);
  const [boardTheme, setBoardTheme] = useState<'green' | 'blue' | 'brown'>('green');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');

  useEffect(() => {
    storageService.getSettings().then((s) => {
      setBoardTheme(s.boardTheme || 'green');
    });
  }, []);

  const categories = [
    { key: 'ALL', label: 'All Openings', desc: 'Complete 3,865 ECO openings database' },
    { key: 'A', label: 'A: Flank & Irregular', desc: 'English, Reti, Bird, Dutch, King’s Indian Attack' },
    { key: 'B', label: 'B: Semi-Open (1. e4)', desc: 'Sicilian, Caro-Kann, French, Pirc, Alekhine' },
    { key: 'C', label: 'C: Open Games (1. e4 e5)', desc: 'Ruy Lopez, Italian Game, Scotch, Petroff, French' },
    { key: 'D', label: 'D: Closed (1. d4 d5)', desc: 'Queen’s Gambit, Slav, Tarrasch, Grunfeld' },
    { key: 'E', label: 'E: Indian Defenses', desc: 'King’s Indian, Nimzo-Indian, Bogo-Indian, Catalan' },
  ];

  const filteredOpenings = useMemo(() => {
    let list = openingsList as OpeningInfo[];

    if (selectedCategory !== 'ALL') {
      list = list.filter((item) => item.eco.startsWith(selectedCategory));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) => item.name.toLowerCase().includes(q) || item.eco.toLowerCase().includes(q) || item.moves.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchQuery, selectedCategory]);

  const theoryMoves = useMemo(() => {
    return selectedOpening ? selectedOpening.moves.split(' ') : [];
  }, [selectedOpening]);

  // Compute current FEN along the theoretical moves
  const currentFen = useMemo(() => {
    if (!theoryMoves || theoryMoves.length === 0 || currentPly === 0) {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    }
    const subMoves = theoryMoves.slice(0, currentPly);
    return PositionService.getFenFromSanMoves(subMoves);
  }, [theoryMoves, currentPly]);

  const handleSelectOpening = (item: OpeningInfo) => {
    setSelectedOpening(item);
    setCurrentPly(item.moves.split(' ').length);
  };

  const handleNext = () => {
    setCurrentPly((p) => Math.min(theoryMoves.length, p + 1));
  };

  const handlePrev = () => {
    setCurrentPly((p) => Math.max(0, p - 1));
  };

  const handleStart = () => {
    setCurrentPly(0);
  };

  const handleEnd = () => {
    setCurrentPly(theoryMoves.length);
  };

  // Last move played
  const lastMove = useMemo(() => {
    if (currentPly === 0) return undefined;
    const subMoves = theoryMoves.slice(0, currentPly);
    try {
      const chess = new (require('chess.js').Chess)();
      let lastM = undefined;
      for (const m of subMoves) {
        lastM = chess.move(m);
      }
      if (lastM) {
        return { from: lastM.from, to: lastM.to };
      }
    } catch {}
    return undefined;
  }, [theoryMoves, currentPly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
              <span>Opening Theory Explorer</span>
            </h1>
            <p className="text-xs text-slate-400">
              Browse, search, and replay all 3,865 official ECO chess openings and standard lines.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span>Catalog:</span>
          <strong className="text-emerald-400">{filteredOpenings.length}</strong>
          <span>openings matching</span>
        </div>
      </div>

      {/* Main Grid: No scroll on PC */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Board & Move Stepper */}
        <div className="lg:col-span-6 flex flex-col items-center gap-3">
          <div className="w-full flex justify-center">
            <div className="w-full max-w-[460px] aspect-square">
              <ChessBoard
                fen={currentFen}
                orientation={orientation}
                theme={boardTheme}
                lastMove={lastMove}
                interactive={false}
              />
            </div>
          </div>

          {/* Navigation Stepper Controls */}
          <div className="w-full max-w-[460px] bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPly === 0}
                onClick={handleStart}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                title="Start"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                disabled={currentPly === 0}
                onClick={handlePrev}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                title="Previous Move"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={currentPly >= theoryMoves.length}
                onClick={handleNext}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                title="Next Move"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                disabled={currentPly >= theoryMoves.length}
                onClick={handleEnd}
                className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                title="Full Line"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>

            <span className="font-mono text-xs font-bold text-emerald-400">
              Ply {currentPly} / {theoryMoves.length}
            </span>

            <button
              onClick={() => setOrientation((prev) => (prev === 'white' ? 'black' : 'white'))}
              className="p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 cursor-pointer text-xs flex items-center gap-1"
              title="Flip Board"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Flip</span>
            </button>
          </div>

          {/* Moves Progress Pill Bar */}
          <div className="w-full max-w-[460px] bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-1.5 shadow-md">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">Theoretical Line</span>
            <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
              {theoryMoves.map((m, idx) => {
                const moveNum = Math.floor(idx / 2) + 1;
                const isW = idx % 2 === 0;
                const isActive = idx < currentPly;
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentPly(idx + 1)}
                    className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                      idx === currentPly - 1
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : isActive
                        ? 'bg-slate-800 text-emerald-300'
                        : 'bg-slate-950 text-slate-400 border border-slate-800/80 hover:text-white'
                    }`}
                  >
                    {isW ? `${moveNum}.` : ''}{m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Search, Categories, and Opening List */}
        <div className="lg:col-span-6 flex flex-col gap-3 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl h-full lg:max-h-[calc(100vh-8rem)]">
          {/* Active Opening Banner */}
          <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between mb-1">
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                ECO {selectedOpening.eco}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {theoryMoves.length} half-moves
              </span>
            </div>
            <h2 className="text-base font-extrabold text-white">
              {selectedOpening.name}
            </h2>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, ECO code (e.g. B90), or moves (e.g. e4 c5)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          {/* ECO Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCategory(c.key as any)}
                className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
                  selectedCategory === c.key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {c.label.split(':')[0]}
              </button>
            ))}
          </div>

          {/* Scrollable list of openings */}
          <div className="flex-1 min-h-[300px] max-h-[360px] overflow-y-auto space-y-2 pr-1">
            {filteredOpenings.slice(0, 150).map((op) => {
              const isSelected = op.eco === selectedOpening.eco && op.name === selectedOpening.name;
              return (
                <div
                  key={`${op.eco}_${op.name}`}
                  onClick={() => handleSelectOpening(op)}
                  className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/50 shadow'
                      : 'bg-slate-950/70 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex-1 mr-2 truncate">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono font-bold text-[11px] text-emerald-400">
                        {op.eco}
                      </span>
                      <span className="font-bold text-slate-200 truncate">{op.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{op.moves}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
