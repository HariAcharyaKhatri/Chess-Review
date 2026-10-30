import { describe, it, expect } from 'vitest';
import { AccuracyService } from '../src/chess/accuracy';
import { PositionService } from '../src/chess/positionService';

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

  it('correctly models Grandmaster (Hikaru Nakamura) performance at 96-99% accuracy', () => {
    // A typical GM game consists of top engine moves, with minor variations and rare inaccuracies
    const gmAccuracies: number[] = [];
    const gmCpls: number[] = [];

    // 25 best / book moves
    for (let i = 0; i < 25; i++) {
      gmAccuracies.push(100);
      gmCpls.push(0);
    }
    // 4 excellent moves (deltaWinProb ~ 1%, CPL ~ 12)
    for (let i = 0; i < 4; i++) {
      const acc = AccuracyService.calculateMoveAccuracy(55, 54);
      gmAccuracies.push(acc);
      gmCpls.push(12);
    }
    // 1 minor inaccuracy (deltaWinProb ~ 5%, CPL ~ 45)
    const inacc = AccuracyService.calculateMoveAccuracy(55, 50);
    gmAccuracies.push(inacc);
    gmCpls.push(45);

    const metrics = AccuracyService.calculateAggregateMetrics(gmAccuracies, gmCpls);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(96);
    expect(metrics.accuracy).toBeLessThanOrEqual(99.5);
    expect(metrics.acpl).toBeLessThan(10);
  });

  it('correctly reflects low accuracy in blunder-heavy games without artificial inflation', () => {
    const blunderAccuracies: number[] = [];
    const blunderCpls: number[] = [];

    // 2 opening moves
    for (let i = 0; i < 2; i++) {
      blunderAccuracies.push(100);
      blunderCpls.push(0);
    }
    // 5 mistakes (delta ~15%)
    for (let i = 0; i < 5; i++) {
      blunderAccuracies.push(AccuracyService.calculateMoveAccuracy(50, 35));
      blunderCpls.push(150);
    }
    // 8 blunders (delta ~35% - 50%)
    for (let i = 0; i < 8; i++) {
      blunderAccuracies.push(AccuracyService.calculateMoveAccuracy(50, 10));
      blunderCpls.push(400);
    }

    const metrics = AccuracyService.calculateAggregateMetrics(blunderAccuracies, blunderCpls);
    // Real blunder game should be low (~30-40%), not inflated
    expect(metrics.accuracy).toBeLessThan(45);
    expect(metrics.accuracy).toBeGreaterThan(20);
    expect(metrics.acpl).toBeGreaterThan(150);
  });

  it('correctly models 800 Elo performance in the realistic 65-80% range instead of inflated 90%+', () => {
    const elo800Accuracies: number[] = [];
    const elo800Cpls: number[] = [];

    // 4 sound opening / best moves
    for (let i = 0; i < 4; i++) {
      elo800Accuracies.push(100);
      elo800Cpls.push(0);
    }
    // 6 good playable moves (loss ~25 cp)
    for (let i = 0; i < 6; i++) {
      elo800Accuracies.push(AccuracyService.calculateMoveAccuracy(52, 50, 25));
      elo800Cpls.push(25);
    }
    // 4 minor inaccuracies (loss ~50 cp)
    for (let i = 0; i < 4; i++) {
      elo800Accuracies.push(AccuracyService.calculateMoveAccuracy(50, 46, 50));
      elo800Cpls.push(50);
    }
    // 3 mistakes (loss ~130 cp)
    for (let i = 0; i < 3; i++) {
      elo800Accuracies.push(AccuracyService.calculateMoveAccuracy(50, 38, 130));
      elo800Cpls.push(130);
    }
    // 3 blunders (loss ~300 cp)
    for (let i = 0; i < 3; i++) {
      elo800Accuracies.push(AccuracyService.calculateMoveAccuracy(50, 25, 300));
      elo800Cpls.push(300);
    }

    const metrics = AccuracyService.calculateAggregateMetrics(elo800Accuracies, elo800Cpls);
    // Typical 800-Elo game should be in the ~68-76% range, NEVER 90%+
    expect(metrics.accuracy).toBeGreaterThanOrEqual(65);
    expect(metrics.accuracy).toBeLessThanOrEqual(80);
    expect(metrics.acpl).toBeGreaterThanOrEqual(50);
    expect(metrics.acpl).toBeLessThanOrEqual(120);
  });

  it('maintains strict mathematical symmetry between White and Black win probabilities', () => {
    const whiteAdvScore = { type: 'cp' as const, value: 200 };
    const blackAdvScore = { type: 'cp' as const, value: -200 };

    const whiteWinProbWhenWhiteAhead = AccuracyService.getPlayerWinProbability(whiteAdvScore, 'w');
    const blackWinProbWhenWhiteAhead = AccuracyService.getPlayerWinProbability(whiteAdvScore, 'b');

    const whiteWinProbWhenBlackAhead = AccuracyService.getPlayerWinProbability(blackAdvScore, 'w');
    const blackWinProbWhenBlackAhead = AccuracyService.getPlayerWinProbability(blackAdvScore, 'b');

    expect(whiteWinProbWhenWhiteAhead + blackWinProbWhenWhiteAhead).toBeCloseTo(100, 5);
    expect(whiteWinProbWhenBlackAhead + blackWinProbWhenBlackAhead).toBeCloseTo(100, 5);
    expect(whiteWinProbWhenWhiteAhead).toBeCloseTo(blackWinProbWhenBlackAhead, 5);
    expect(blackWinProbWhenWhiteAhead).toBeCloseTo(whiteWinProbWhenBlackAhead, 5);
  });

  it('correctly distinguishes board-wide forced moves from single piece move counts', () => {
    // Starting position: 20 legal moves across the board -> NOT forced
    expect(
      PositionService.isForcedMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    ).toBe(false);

    // Position with strictly 1 legal move across the whole board (Kxb7)
    const forcedFen = 'K1r5/1r6/8/8/8/8/8/7k w - - 0 1';
    const legalMoves = PositionService.getAllLegalMoves(forcedFen);
    expect(legalMoves.length).toBe(1);
    expect(PositionService.isForcedMove(forcedFen)).toBe(true);
  });
});
