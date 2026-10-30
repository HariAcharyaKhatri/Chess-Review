import { MoveClassification, EngineScore } from '../types/chess';

export interface MoveContext {
  san: string;
  uci: string;
  bestMove: string;
  bestMoveSan?: string;
  turn: 'w' | 'b';
  evalBefore: EngineScore;
  evalAfter: EngineScore;
  centipawnLoss: number;
  winProbBefore: number;
  winProbAfter: number;
  legalMoveCount: number;
  ply: number;
  isCapture: boolean;
  pieceType?: string;
  isBook?: boolean;
}

export class ClassificationService {
  /**
   * Classifies a move based on position context, CPL, and win probability delta.
   */
  static classifyMove(context: MoveContext): { classification: MoveClassification; commentary: string } {
    const {
      san,
      bestMove,
      bestMoveSan,
      centipawnLoss,
      winProbBefore,
      winProbAfter,
      legalMoveCount,
      ply,
      evalBefore,
      evalAfter,
      isBook,
    } = context;

    // 1. Forced move check (only 1 legal move available)
    if (legalMoveCount === 1) {
      return {
        classification: 'forced',
        commentary: 'Forced move. There was only one legal option available.',
      };
    }

    // 2. Book opening moves (from verified openings database or early plies with negligible loss)
    if (isBook || (ply <= 6 && centipawnLoss <= 20)) {
      return {
        classification: 'book',
        commentary: `Book move. Standard opening theory (${san}).`,
      };
    }

    // 3. Engine First Choice Check (Must always take priority over blunder/mistake thresholds)
    const isEngineFirstChoice =
      Boolean(context.uci && bestMove && context.uci.toLowerCase() === bestMove.toLowerCase()) ||
      Boolean(bestMoveSan && san === bestMoveSan);

    // 4. Brilliant move check: sacrifice piece (or decisive quiet move) with strong winning eval
    if (
      isEngineFirstChoice &&
      evalBefore.type === 'cp' &&
      evalAfter.type === 'cp' &&
      winProbAfter >= 75 &&
      context.isCapture === false &&
      (context.pieceType === 'q' || context.pieceType === 'r' || context.pieceType === 'b' || context.pieceType === 'n') &&
      centipawnLoss <= 5
    ) {
      return {
        classification: 'brilliant',
        commentary: 'Brilliant move! A tactical masterstroke that cements decisive victory.',
      };
    }

    // 5. Best move: matches top engine line or has virtually zero loss
    if (isEngineFirstChoice || centipawnLoss <= 10) {
      return {
        classification: 'best',
        commentary: "Best move. Finds the engine's top continuation.",
      };
    }

    // Non-best moves: determine error severity based on delta win probability and positions
    const deltaWinProb = Math.max(0, winProbBefore - winProbAfter);
    const wasWinning = winProbBefore >= 75 || (evalBefore.type === 'mate' && evalBefore.value > 0);
    const nowEqualOrLosing = winProbAfter <= 55 && (evalAfter.type !== 'mate' || evalAfter.value <= 0);

    const bestTxt = bestMoveSan ? ` Best was ${bestMoveSan}.` : '';

    // 6. Missed win: player was winning comfortably, but surrendered advantage back to equal or losing
    if (wasWinning && nowEqualOrLosing && (deltaWinProb >= 20 || centipawnLoss >= 180)) {
      return {
        classification: 'missed_win',
        commentary: `Missed win. A winning tactical advantage was let slip.${bestTxt}`,
      };
    }

    // 7. Decisive Advantage Handling (Winning Simplification)
    // If the player remains overwhelmingly winning (winProbAfter >= 80%),
    // selecting a safe simplification or slightly slower winning path is NEVER a blunder or mistake.
    if (winProbBefore >= 85 && winProbAfter >= 80) {
      if (centipawnLoss <= 40 || deltaWinProb <= 2) {
        return {
          classification: 'excellent',
          commentary: 'Excellent move. Simplifies the position while retaining a crushing advantage.',
        };
      }
      if (centipawnLoss <= 150 || deltaWinProb <= 6) {
        return {
          classification: 'good',
          commentary: 'Good move. Maintains a decisive winning advantage.',
        };
      }
      return {
        classification: 'inaccuracy',
        commentary: `Inaccuracy. Slower than the engine's quickest winning line.${bestTxt}`,
      };
    }

    // 8. Blunder: massive drop in win probability or high damage error
    if (deltaWinProb >= 25 || (centipawnLoss >= 250 && winProbAfter <= 65)) {
      return {
        classification: 'blunder',
        commentary: `Blunder. This move severely damages the position, losing significant material or tactical balance.${bestTxt}`,
      };
    }

    // 9. Mistake: substantial error
    if (deltaWinProb >= 12 || (centipawnLoss >= 130 && winProbAfter <= 75)) {
      return {
        classification: 'mistake',
        commentary: `Mistake. This gives away the initiative or concessions.${bestTxt}`,
      };
    }

    // 10. Inaccuracy: minor mistake
    if (deltaWinProb >= 6 || centipawnLoss >= 60) {
      return {
        classification: 'inaccuracy',
        commentary: `Inaccuracy. A slightly suboptimal choice that cedes minor ground.${bestTxt}`,
      };
    }

    // 11. Excellent: close to best
    if (centipawnLoss <= 25 || deltaWinProb <= 2.5) {
      return {
        classification: 'excellent',
        commentary: 'Excellent move. Nearly as strong as the top engine line.',
      };
    }

    // 12. Good: solid playable move
    return {
      classification: 'good',
      commentary: 'Good move. Keeps a solid and playable position.',
    };
  }

  /**
   * Helper badge color and label for UI rendering.
   */
  static getBadgeDetails(classification: MoveClassification): { label: string; bgClass: string; textClass: string; icon: string } {
    switch (classification) {
      case 'brilliant':
        return { label: 'Brilliant', bgClass: 'bg-cyan-500/20 border-cyan-500/50', textClass: 'text-cyan-400', icon: '!!' };
      case 'great':
        return { label: 'Great', bgClass: 'bg-indigo-500/20 border-indigo-500/50', textClass: 'text-indigo-400', icon: '!' };
      case 'best':
        return { label: 'Best', bgClass: 'bg-emerald-500/20 border-emerald-500/50', textClass: 'text-emerald-400', icon: '★' };
      case 'excellent':
        return { label: 'Excellent', bgClass: 'bg-teal-500/20 border-teal-500/50', textClass: 'text-teal-400', icon: '✓' };
      case 'good':
        return { label: 'Good', bgClass: 'bg-blue-500/20 border-blue-500/50', textClass: 'text-blue-400', icon: '✓' };
      case 'book':
        return { label: 'Book', bgClass: 'bg-amber-600/20 border-amber-600/50', textClass: 'text-amber-500', icon: '📖' };
      case 'forced':
        return { label: 'Forced', bgClass: 'bg-slate-500/20 border-slate-500/50', textClass: 'text-slate-400', icon: '—' };
      case 'inaccuracy':
        return { label: 'Inaccuracy', bgClass: 'bg-yellow-500/20 border-yellow-500/50', textClass: 'text-yellow-400', icon: '?!' };
      case 'mistake':
        return { label: 'Mistake', bgClass: 'bg-orange-500/20 border-orange-500/50', textClass: 'text-orange-400', icon: '?' };
      case 'missed_win':
        return { label: 'Missed Win', bgClass: 'bg-rose-500/20 border-rose-500/50', textClass: 'text-rose-400', icon: '✖' };
      case 'blunder':
      default:
        return { label: 'Blunder', bgClass: 'bg-red-500/20 border-red-500/50', textClass: 'text-red-400', icon: '??' };
    }
  }
}
