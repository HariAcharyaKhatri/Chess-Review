import { Chess, Square, Move } from 'chess.js';

export interface BoardSquare {
  square: Square;
  file: string; // 'a'-'h'
  rank: number; // 1-8
  color: 'w' | 'b' | null;
  piece: 'p' | 'n' | 'b' | 'r' | 'q' | 'k' | null;
}

export class PositionService {
  /**
   * Converts a UCI move string (e.g. "e2e4", "e7e8q") to SAN notation for a given FEN.
   */
  static uciToSan(fen: string, uci: string): string | null {
    try {
      const chess = new Chess(fen);
      const from = uci.substring(0, 2) as Square;
      const to = uci.substring(2, 4) as Square;
      const promotion = uci.length > 4 ? uci.substring(4, 5) : undefined;

      const move = chess.move({ from, to, promotion });
      return move ? move.san : null;
    } catch {
      return null;
    }
  }

  /**
   * Converts a SAN move to UCI format for a given FEN.
   */
  static sanToUci(fen: string, san: string): string | null {
    try {
      const chess = new Chess(fen);
      const move = chess.move(san);
      if (!move) return null;
      return `${move.from}${move.to}${move.promotion || ''}`;
    } catch {
      return null;
    }
  }

  /**
   * Gets legal moves for a given square in a position.
   */
  static getLegalMovesForSquare(fen: string, square: Square): Move[] {
    try {
      const chess = new Chess(fen);
      return chess.moves({ square, verbose: true });
    } catch {
      return [];
    }
  }

  /**
   * Gets all legal moves for the current side to move across the entire board.
   */
  static getAllLegalMoves(fen: string): Move[] {
    try {
      const chess = new Chess(fen);
      return chess.moves({ verbose: true });
    } catch {
      return [];
    }
  }

  /**
   * Returns whether the position has exactly one legal move on the entire board (strictly forced move).
   */
  static isForcedMove(fen: string): boolean {
    try {
      const chess = new Chess(fen);
      return chess.moves().length === 1;
    } catch {
      return false;
    }
  }

  /**
   * Validates if a move is legal and returns the resulting FEN.
   */
  static makeMove(fen: string, from: Square, to: Square, promotion?: string): { valid: boolean; newFen?: string; san?: string; uci?: string } {
    try {
      const chess = new Chess(fen);
      const move = chess.move({ from, to, promotion });
      if (!move) return { valid: false };
      return {
        valid: true,
        newFen: chess.fen(),
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion || ''}`,
      };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Returns a 2D 8x8 board array from FEN.
   */
  static getBoard(fen: string): (BoardSquare | null)[][] {
    const chess = new Chess(fen);
    const board = chess.board();
    const result: (BoardSquare | null)[][] = [];

    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (let r = 0; r < 8; r++) {
      const row: (BoardSquare | null)[] = [];
      const rank = 8 - r;
      for (let c = 0; c < 8; c++) {
        const file = files[c];
        const square = `${file}${rank}` as Square;
        const piece = board[r][c];

        if (piece) {
          row.push({
            square,
            file,
            rank,
            color: piece.color,
            piece: piece.type,
          });
        } else {
          row.push({
            square,
            file,
            rank,
            color: null,
            piece: null,
          });
        }
      }
      result.push(row);
    }

    return result;
  }

  /**
   * Checks if current side to move is in check.
   */
  static isCheck(fen: string): boolean {
    try {
      const chess = new Chess(fen);
      return chess.inCheck();
    } catch {
      return false;
    }
  }

  /**
   * Finds the square of the king for the side to move.
   */
  static getKingSquare(fen: string, color: 'w' | 'b'): Square | null {
    try {
      const chess = new Chess(fen);
      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k' && piece.color === color) {
            return piece.square;
          }
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Applies a SAN or UCI move to a FEN and returns the resulting FEN.
   */
  static applyMove(fen: string, sanOrUci: string): string | null {
    try {
      const chess = new Chess(fen);
      let move = null;
      if (sanOrUci.length >= 4 && /^[a-h][1-8][a-h][1-8]/.test(sanOrUci)) {
        move = chess.move({
          from: sanOrUci.substring(0, 2) as Square,
          to: sanOrUci.substring(2, 4) as Square,
          promotion: sanOrUci.length > 4 ? sanOrUci.substring(4, 5) : undefined,
        });
      } else {
        move = chess.move(sanOrUci);
      }
      return move ? chess.fen() : null;
    } catch {
      return null;
    }
  }

  /**
   * Replays a list of SAN moves from starting position and returns the final FEN.
   */
  static getFenFromSanMoves(sanMoves: string[]): string {
    const chess = new Chess();
    for (const san of sanMoves) {
      try {
        chess.move(san);
      } catch {
        break;
      }
    }
    return chess.fen();
  }

  /**
   * Checks if position is game over.
   */
  static getGameStatus(fen: string): { isOver: boolean; reason?: 'checkmate' | 'stalemate' | 'draw' | 'threefold' | 'insufficient_material' } {
    try {
      const chess = new Chess(fen);
      if (chess.isCheckmate()) return { isOver: true, reason: 'checkmate' };
      if (chess.isStalemate()) return { isOver: true, reason: 'stalemate' };
      if (chess.isInsufficientMaterial()) return { isOver: true, reason: 'insufficient_material' };
      if (chess.isThreefoldRepetition()) return { isOver: true, reason: 'threefold' };
      if (chess.isDraw()) return { isOver: true, reason: 'draw' };
      return { isOver: false };
    } catch {
      return { isOver: false };
    }
  }
}
