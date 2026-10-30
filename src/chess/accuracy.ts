import { EngineScore } from '../types/chess';

/**
 * Accuracy and Win-Probability Transformation Service
 *
 * Implements a transparent, documented win-probability model:
 * Win Probability = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
 *
 * Move Accuracy = clamp(0, 100, 103.1668 * exp(-0.04354 * deltaWinProb) - 3.1668)
 */
export class AccuracyService {
  /**
   * Converts an EngineScore (cp or mate) into bounded centipawn equivalent.
   * White advantage is positive, Black advantage is negative.
   */
  static scoreToCentipawns(score: EngineScore): number {
    if (score.type === 'cp') {
      return Math.max(-2000, Math.min(2000, score.value));
    }
    // Mate score: mate in N
    if (score.value > 0) {
      // White mate in score.value
      return Math.max(1000, 2500 - score.value * 50);
    } else if (score.value < 0) {
      // Black mate in Math.abs(score.value)
      return Math.min(-1000, -2500 - score.value * 50);
    }
    return 0;
  }

  /**
   * Calculates win probability (0 to 100%) from centipawns from White's perspective.
   */
  static centipawnsToWinProb(cp: number): number {
    // Sigmoid curve with scaling constant 0.00368208
    const scaled = 0.00368208 * cp;
    const probability = 2 / (1 + Math.exp(-scaled)) - 1;
    return 50 + 50 * probability;
  }

  /**
   * Gets win probability from the perspective of the player to move.
   * @param score EngineScore
   * @param turn 'w' | 'b'
   */
  static getPlayerWinProbability(score: EngineScore, turn: 'w' | 'b'): number {
    const cp = this.scoreToCentipawns(score);
    const whiteWinProb = this.centipawnsToWinProb(cp);
    return turn === 'w' ? whiteWinProb : 100 - whiteWinProb;
  }

  /**
   * Calculates centipawn loss from the player's perspective.
   */
  static calculateCentipawnLoss(scoreBefore: EngineScore, scoreAfter: EngineScore, turn: 'w' | 'b'): number {
    const cpBefore = this.scoreToCentipawns(scoreBefore);
    const cpAfter = this.scoreToCentipawns(scoreAfter);

    const playerCpBefore = turn === 'w' ? cpBefore : -cpBefore;
    const playerCpAfter = turn === 'w' ? cpAfter : -cpAfter;

    // Centipawn loss cannot be negative (playing a better move than engine's first choice or equal)
    return Math.max(0, playerCpBefore - playerCpAfter);
  }

  /**
   * Calculates accuracy percentage for a single move based on win probability loss
   * and tactical error magnitude (centipawn loss).
   *
   * Solves the 'lost position anomaly' where further material blunders in an already
   * lost game only drop win probability by 2-5%, which would otherwise assign artificially
   * high scores (70-80%) to major blunders.
   */
  static calculateMoveAccuracy(
    winProbBefore: number,
    winProbAfter: number,
    centipawnLoss: number = 0
  ): number {
    const deltaWinProb = Math.max(0, winProbBefore - winProbAfter);
    if (deltaWinProb <= 0.001 && centipawnLoss <= 5) return 100;

    // Standard CAPS-calibrated exponential decay on win probability loss
    const wpAccuracy = 103.1668 * Math.exp(-0.04354 * deltaWinProb) - 3.1668;

    // Tactical error bound based on centipawn loss:
    // If the player remains overwhelmingly winning (winProbBefore >= 85 && winProbAfter >= 80),
    // a safe simplification (e.g. trading queens for a slightly slower mate) is not penalized.
    const isDecisivelyWinningSimplification = winProbBefore >= 85 && winProbAfter >= 80;

    let cplAccuracy = 100;
    if (centipawnLoss > 15 && !isDecisivelyWinningSimplification) {
      cplAccuracy = 100 * Math.exp(-0.0055 * centipawnLoss);
    }

    const rawAccuracy = Math.min(wpAccuracy, cplAccuracy);
    return Math.max(0, Math.min(100, Math.round(rawAccuracy * 10) / 10));
  }

  /**
   * Calculates average accuracy and average centipawn loss for a set of moves.
   */
  static calculateAggregateMetrics(moveAccuracies: number[], centipawnLosses: number[]): { accuracy: number; acpl: number } {
    if (moveAccuracies.length === 0) {
      return { accuracy: 100, acpl: 0 };
    }

    const totalAccuracy = moveAccuracies.reduce((sum, val) => sum + val, 0);
    const totalCpl = centipawnLosses.reduce((sum, val) => sum + val, 0);

    const accuracy = Math.round((totalAccuracy / moveAccuracies.length) * 10) / 10;
    const acpl = Math.round((totalCpl / centipawnLosses.length) * 10) / 10;

    return { accuracy, acpl };
  }
}
