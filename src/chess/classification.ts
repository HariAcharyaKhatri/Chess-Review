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
    } = context;

    // 1. Forced move check (only 1 legal move available)
    if (legalMoveCount === 1) {
      return {
        classification: 'forced',
        commentary: 'Forced move. There was only one legal option available.',
      };
    }

    // 2. Book opening moves (first 3-4 plies if standard)
    if (ply <= 4 && centipawnLoss <= 15) {
      return {
        classification: 'book',
        commentary: `Book move. Standard opening theory (${san}).`,
      };
    }

    const deltaWinProb = Math.max(0, winProbBefore - winProbAfter);
    const wasWinning = winProbBefore >= 75 || (evalBefore.type === 'mate' && evalBefore.value > 0);
    const nowEqualOrLosing = winProbAfter <= 55 && (evalAfter.type !== 'mate' || evalAfter.value <= 0);

    // 3. Missed win: player was winning comfortably, but let the advantage slip away
    if (wasWinning && nowEqualOrLosing && (deltaWinProb >= 25 || centipawnLoss >= 200)) {
      const bestTxt = bestMoveSan ? ` Best was ${bestMoveSan}.` : '';
      return {
        classification: 'missed_win',
        commentary: `Missed win. A winning tactical advantage was let slip.${bestTxt}`,
      };
    }

    // 4. Blunder: massive drop in win probability or high CPL
    if (deltaWinProb >= 30 || centipawnLoss >= 250) {
      const bestTxt = bestMoveSan ? ` The engine preferred ${bestMoveSan}.` : '';
      return {
        classification: 'blunder',
        commentary: `Blunder. This move severely damages the position, losing significant material or tactical balance.${bestTxt}`,
      };
    }

    // 5. Mistake: substantial error
    if (deltaWinProb >= 15 || centipawnLoss >= 130) {
      const bestTxt = bestMoveSan ? ` Stronger was ${bestMoveSan}.` : '';
      return {
        classification: 'mistake',
        commentary: `Mistake. This gives away the initiative or concessions.${bestTxt}`,
      };
    }

    // 6. Inaccuracy: minor mistake
    if (deltaWinProb >= 7 || centipawnLoss >= 65) {
      const bestTxt = bestMoveSan ? ` More precise was ${bestMoveSan}.` : '';
      return {
        classification: 'inaccuracy',
        commentary: `Inaccuracy. A slightly suboptimal choice that cedes minor ground.${bestTxt}`,
      };
    }

    // 7. Check if best move was matched or virtually zero loss
    const isEngineFirstChoice = (context.uci === bestMove) || (bestMoveSan && san === bestMoveSan);

    // 8. Brilliant move check: sacrifice piece (or decisive quiet move) with strong winning eval
    if (
      isEngineFirstChoice &&
      evalBefore.type === 'cp' &&
      evalAfter.type === 'cp' &&
      winProbAfter >= 80 &&
      context.isCapture === false &&
      (context.pieceType === 'q' || context.pieceType === 'r' || context.pieceType === 'b' || context.pieceType === 'n') &&
      centipawnLoss <= 5
    ) {
      // If it is a major piece exposed in a sharp win
      return {
        classification: 'brilliant',
        commentary: 'Brilliant move! A tactical masterstroke that cements decisive victory.',
      };
    }

    // 9. Best / Excellent / Good
    if (isEngineFirstChoice || centipawnLoss <= 12) {
      return {
        classification: 'best',
        commentary: 'Best move. Finds the engine\'s top continuation.',
      };
    }

    if (centipawnLoss <= 30) {
      return {
        classification: 'excellent',
        commentary: 'Excellent move. Nearly as strong as the top engine line.',
      };
    }

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
