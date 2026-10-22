import { describe, it, expect } from 'vitest';
import { AccuracyService } from '../src/chess/accuracy';

describe('AccuracyService', () => {
  it('converts centipawns to win probability monotonically', () => {
    const probNeg500 = AccuracyService.centipawnsToWinProb(-500);
    const probZero = AccuracyService.centipawnsToWinProb(0);
    const probPos500 = AccuracyService.centipawnsToWinProb(500);

    expect(probZero).toBeCloseTo(50, 1);
    expect(probNeg500).toBeLessThan(probZero);
    expect(probPos500).toBeGreaterThan(probZero);
    expect(probPos500).toBeLessThanOrEqual(100);
    expect(probNeg500).toBeGreaterThanOrEqual(0);
  });

  it('handles mate scores gracefully', () => {
    const whiteMateIn1 = AccuracyService.scoreToCentipawns({ type: 'mate', value: 1 });
    const blackMateIn1 = AccuracyService.scoreToCentipawns({ type: 'mate', value: -1 });

    expect(whiteMateIn1).toBeGreaterThanOrEqual(1000);
    expect(blackMateIn1).toBeLessThanOrEqual(-1000);
  });

  it('calculates move accuracy bounded between 0 and 100', () => {
    // Zero win probability drop -> 100% accuracy
    const perfectAcc = AccuracyService.calculateMoveAccuracy(70, 70);
    expect(perfectAcc).toBe(100);

    // Minor loss
    const minorLossAcc = AccuracyService.calculateMoveAccuracy(60, 56);
    expect(minorLossAcc).toBeGreaterThan(80);
    expect(minorLossAcc).toBeLessThanOrEqual(100);

    // Severe blunder
    const blunderAcc = AccuracyService.calculateMoveAccuracy(85, 10);
    expect(blunderAcc).toBeLessThan(20);
    expect(blunderAcc).toBeGreaterThanOrEqual(0);
  });

  it('calculates player centipawn loss from correct perspective', () => {
    // White move: position was +100 cp, after move it became +50 cp -> CPL = 50
    const whiteCpl = AccuracyService.calculateCentipawnLoss(
      { type: 'cp', value: 100 },
      { type: 'cp', value: 50 },
      'w'
    );
    expect(whiteCpl).toBe(50);

    // Black move: position was -100 cp (White perspective), after move it became 0 -> CPL = 100 for Black
    const blackCpl = AccuracyService.calculateCentipawnLoss(
      { type: 'cp', value: -100 },
      { type: 'cp', value: 0 },
      'b'
    );
    expect(blackCpl).toBe(100);
  });

  it('aggregates accuracies and ACPL properly', () => {
    const res = AccuracyService.calculateAggregateMetrics([100, 90, 80], [0, 20, 40]);
    expect(res.accuracy).toBe(90);
    expect(res.acpl).toBe(20);
  });
});
