import { describe, it, expect } from 'vitest';
import { ClassificationService } from '../src/chess/classification';

describe('ClassificationService', () => {
  it('classifies forced moves when only 1 legal move exists', () => {
    const res = ClassificationService.classifyMove({
      san: 'Kh8',
      uci: 'g8h8',
      bestMove: 'g8h8',
      turn: 'b',
      evalBefore: { type: 'cp', value: 300 },
      evalAfter: { type: 'cp', value: 300 },
      centipawnLoss: 0,
      winProbBefore: 10,
      winProbAfter: 10,
      legalMoveCount: 1, // forced!
      ply: 25,
      isCapture: false,
    });

    expect(res.classification).toBe('forced');
  });

  it('classifies blunders on large win probability loss', () => {
    const res = ClassificationService.classifyMove({
      san: 'Qxf7+',
      uci: 'f3f7',
      bestMove: 'e2e4',
      turn: 'w',
      evalBefore: { type: 'cp', value: 150 },
      evalAfter: { type: 'cp', value: -400 },
      centipawnLoss: 550,
      winProbBefore: 70,
      winProbAfter: 15,
      legalMoveCount: 30,
      ply: 20,
      isCapture: true,
    });

    expect(res.classification).toBe('blunder');
  });

  it('classifies missed wins when winning advantage is surrendered', () => {
    const res = ClassificationService.classifyMove({
      san: 'Rf1',
      uci: 'f8f1',
      bestMove: 'h2h1q',
      turn: 'b',
      evalBefore: { type: 'cp', value: -600 },
      evalAfter: { type: 'cp', value: 0 },
      centipawnLoss: 600,
      winProbBefore: 95,
      winProbAfter: 50,
      legalMoveCount: 20,
      ply: 40,
      isCapture: false,
    });

    expect(res.classification).toBe('missed_win');
  });

  it('classifies top engine choices as best', () => {
    const res = ClassificationService.classifyMove({
      san: 'Nf3',
      uci: 'g1f3',
      bestMove: 'g1f3',
      turn: 'w',
      evalBefore: { type: 'cp', value: 20 },
      evalAfter: { type: 'cp', value: 25 },
      centipawnLoss: 0,
      winProbBefore: 53,
      winProbAfter: 54,
      legalMoveCount: 20,
      ply: 12,
      isCapture: false,
    });

    expect(res.classification).toBe('best');
  });
});
