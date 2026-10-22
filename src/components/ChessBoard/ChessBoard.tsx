import React, { useState } from 'react';
import { ChessPiece } from './ChessPieces';
import { PositionService, BoardSquare } from '../../chess/positionService';
import { Square, Move } from 'chess.js';

export interface ChessBoardProps {
  fen: string;
  orientation?: 'white' | 'black';
  lastMove?: { from: string; to: string };
  bestMove?: string; // UCI format e.g. "e2e4"
  showBestMoveArrow?: boolean;
  theme?: 'green' | 'blue' | 'brown';
  interactive?: boolean;
  onMove?: (from: Square, to: Square, promotion?: string) => void;
  className?: string;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation = 'white',
  lastMove,
  bestMove,
  showBestMoveArrow = true,
  theme = 'green',
  interactive = false,
  onMove,
  className = '',
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);

  const boardMatrix = PositionService.getBoard(fen);
  const isWhiteOrientation = orientation === 'white';
  const displayedBoard = isWhiteOrientation ? boardMatrix : [...boardMatrix].reverse().map((row) => [...row].reverse());

  const isCheck = PositionService.isCheck(fen);
  const turn = fen.split(' ')[1] as 'w' | 'b';
  const kingSquare = isCheck ? PositionService.getKingSquare(fen, turn) : null;

  // Board colors based on theme
  const themeColors = {
    green: { light: 'bg-[#ebecd0]', dark: 'bg-[#739552]', textLight: 'text-[#739552]', textDark: 'text-[#ebecd0]' },
    blue: { light: 'bg-[#eae9d2]', dark: 'bg-[#4b7399]', textLight: 'text-[#4b7399]', textDark: 'text-[#eae9d2]' },
    brown: { light: 'bg-[#f0d9b5]', dark: 'bg-[#b58863]', textLight: 'text-[#b58863]', textDark: 'text-[#f0d9b5]' },
  }[theme];

  const handleSquareClick = (squareData: BoardSquare) => {
    if (!interactive) return;

    const sq = squareData.square;

    // If already clicked a piece and clicking a legal destination
    if (selectedSquare) {
      const matchedMove = legalMoves.find((m) => m.to === sq);
      if (matchedMove) {
        onMove?.(selectedSquare, sq, matchedMove.promotion);
        setSelectedSquare(null);
        setLegalMoves([]);
        return;
      }
    }

    // Select piece if it matches the side to move
    if (squareData.color === turn) {
      setSelectedSquare(sq);
      const moves = PositionService.getLegalMovesForSquare(fen, sq);
      setLegalMoves(moves);
    } else {
      setSelectedSquare(null);
      setLegalMoves([]);
    }
  };

  // Helper for arrow coordinates (percentage based 0-100%)
  const getSquareCenter = (square: string) => {
    if (square.length < 2) return { x: 50, y: 50 };
    const file = square.charCodeAt(0) - 97; // 0-7 ('a'-'h')
    const rank = parseInt(square[1], 10) - 1; // 0-7 (1-8)

    const col = isWhiteOrientation ? file : 7 - file;
    const row = isWhiteOrientation ? 7 - rank : rank;

    return {
      x: (col + 0.5) * 12.5,
      y: (row + 0.5) * 12.5,
    };
  };

  const arrowCoords = bestMove && bestMove.length >= 4 ? {
    from: getSquareCenter(bestMove.substring(0, 2)),
    to: getSquareCenter(bestMove.substring(2, 4)),
  } : null;

  return (
    <div className={`relative aspect-square w-full max-w-[560px] rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800 select-none ${className}`}>
      {/* 8x8 Grid */}
      <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
        {displayedBoard.map((row, r) =>
          row.map((sqData, c) => {
            if (!sqData) return null;
            const isLight = (r + c) % 2 === 0;
            const isSelected = selectedSquare === sqData.square;
            const isLastMove = lastMove && (lastMove.from === sqData.square || lastMove.to === sqData.square);
            const isCheckedKing = kingSquare === sqData.square;
            const isLegalDestination = legalMoves.some((m) => m.to === sqData.square);
            const isLegalCapture = isLegalDestination && sqData.piece !== null;

            return (
              <div
                key={sqData.square}
                onClick={() => handleSquareClick(sqData)}
                className={`relative flex items-center justify-center cursor-pointer transition-colors ${
                  isLight ? themeColors.light : themeColors.dark
                } ${
                  isLastMove ? 'bg-amber-300/40' : ''
                } ${
                  isSelected ? '!bg-amber-400/60' : ''
                } ${
                  isCheckedKing ? '!bg-rose-500/80 shadow-inner' : ''
                }`}
              >
                {/* Coordinates */}
                {c === 0 && (
                  <span
                    className={`absolute top-0.5 left-1 text-[10px] sm:text-xs font-semibold ${
                      isLight ? themeColors.textLight : themeColors.textDark
                    }`}
                  >
                    {sqData.rank}
                  </span>
                )}
                {r === 7 && (
                  <span
                    className={`absolute bottom-0.5 right-1 text-[10px] sm:text-xs font-semibold ${
                      isLight ? themeColors.textLight : themeColors.textDark
                    }`}
                  >
                    {sqData.file}
                  </span>
                )}

                {/* Legal move destination dot */}
                {isLegalDestination && !isLegalCapture && (
                  <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-slate-900/30 z-10 pointer-events-none" />
                )}

                {/* Legal capture ring */}
                {isLegalCapture && (
                  <div className="absolute inset-1 rounded-full border-4 border-slate-900/30 z-10 pointer-events-none" />
                )}

                {/* Chess Piece */}
                {sqData.piece && sqData.color && (
                  <div className="w-[85%] h-[85%] flex items-center justify-center drop-shadow-md z-0 pointer-events-none">
                    <ChessPiece color={sqData.color} type={sqData.piece} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* SVG Best Move Arrow Overlay */}
      {showBestMoveArrow && arrowCoords && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
          <defs>
            <marker
              id="bestMoveArrowHead"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#10b981" />
            </marker>
          </defs>
          <line
            x1={`${arrowCoords.from.x}%`}
            y1={`${arrowCoords.from.y}%`}
            x2={`${arrowCoords.to.x}%`}
            y2={`${arrowCoords.to.y}%`}
            stroke="#10b981"
            strokeWidth="5"
            strokeOpacity="0.85"
            strokeLinecap="round"
            markerEnd="url(#bestMoveArrowHead)"
          />
        </svg>
      )}
    </div>
  );
};
