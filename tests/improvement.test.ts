import { describe, it, expect } from 'vitest';
import { ImprovementService } from '../src/services/improvementService';
import { GameMetadata, GameAnalysisResult } from '../src/types/chess';

describe('ImprovementService & Mistake Trainer', () => {
  const mockGame: GameMetadata = {
    id: 'game_test_1',
    platform: 'chesscom',
    white: 'Hero',
    black: 'Opponent',
    result: '0-1',
    date: '2023.05.10',
    timeClass: 'rapid',
    pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 5. Bg5 h6 6. Bh4 g5 7. Bg3 d6 8. c3 a6 0-1',
    plyCount: 16,
  };

  const mockAnalysis: GameAnalysisResult = {
    gameId: 'game_test_1',
    analyzedAt: new Date().toISOString(),
    engineVersion: 'Stockfish WASM',
    targetDepth: 12,
    whiteAccuracy: 74.5,
    blackAccuracy: 88.0,
    whiteAcpl: 45,
    blackAcpl: 18,
    totalPlies: 4,
    whiteClassifications: {
      brilliant: 0,
      great: 0,
      best: 1,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 1,
      missed_win: 0,
      forced: 0,
      book: 0,
    },
    blackClassifications: {
      brilliant: 0,
      great: 0,
      best: 2,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      missed_win: 0,
      forced: 0,
      book: 0,
    },
    moves: [
      {
        ply: 1,
        turn: 'w',
        san: 'e4',
        uci: 'e2e4',
        fenBefore: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        fenAfter: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        evalBefore: { score: { type: 'cp', value: 20 }, depth: 12, bestMove: 'e2e4', pv: ['e2e4'] },
        evalAfter: { score: { type: 'cp', value: 25 }, depth: 12, bestMove: 'e7e5', pv: ['e7e5'] },
        bestMove: 'e2e4',
        bestMoveSan: 'e4',
        centipawnLoss: 0,
        winProbabilityBefore: 53.6,
        winProbabilityAfter: 54.5,
        accuracy: 100,
        classification: 'best',
        commentary: 'Best move in the position.',
      },
      {
        ply: 2,
        turn: 'b',
        san: 'e5',
        uci: 'e7e5',
        fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        evalBefore: { score: { type: 'cp', value: 25 }, depth: 12, bestMove: 'e7e5', pv: ['e7e5'] },
        evalAfter: { score: { type: 'cp', value: 20 }, depth: 12, bestMove: 'g1f3', pv: ['g1f3'] },
        bestMove: 'e7e5',
        bestMoveSan: 'e5',
        centipawnLoss: 0,
        winProbabilityBefore: 45.5,
        winProbabilityAfter: 46.4,
        accuracy: 100,
        classification: 'best',
        commentary: 'Best move in the position.',
      },
      {
        ply: 3,
        turn: 'w',
        san: 'f4',
        uci: 'f2f4',
        fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        fenAfter: 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3 0 2',
        evalBefore: { score: { type: 'cp', value: 20 }, depth: 12, bestMove: 'g1f3', pv: ['g1f3'] },
        evalAfter: { score: { type: 'cp', value: -310 }, depth: 12, bestMove: 'd8h4', pv: ['d8h4'] },
        bestMove: 'g1f3',
        bestMoveSan: 'Nf3',
        centipawnLoss: 330,
        winProbabilityBefore: 53.6,
        winProbabilityAfter: 22.0,
        accuracy: 18,
        classification: 'blunder',
        commentary: 'Blunder losing significant material or positional advantage.',
      },
      {
        ply: 4,
        turn: 'b',
        san: 'Qh4+',
        uci: 'd8h4',
        fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq f3 0 2',
        fenAfter: 'rnb1kbnr/pppp1ppp/8/4p3/4PP1q/8/PPPP2PP/RNBQKBNR w KQkq - 1 3',
        evalBefore: { score: { type: 'cp', value: -310 }, depth: 12, bestMove: 'd8h4', pv: ['d8h4'] },
        evalAfter: { score: { type: 'cp', value: -300 }, depth: 12, bestMove: 'g2g3', pv: ['g2g3'] },
        bestMove: 'd8h4',
        bestMoveSan: 'Qh4+',
        centipawnLoss: 0,
        winProbabilityBefore: 78.0,
        winProbabilityAfter: 77.5,
        accuracy: 100,
        classification: 'best',
        commentary: 'Best move in the position.',
      },
    ],
  };

  it('generates personalized strengths, weaknesses, and priority actions', () => {
    const plan = ImprovementService.generatePlan(mockGame, mockAnalysis, 'Hero');
    expect(plan).toBeDefined();
    expect(plan.playerFocus).toBe('Hero');
    expect(plan.playerColor).toBe('white');
    expect(plan.overallAccuracy).toBe(74.5);
    expect(plan.weaknesses.length).toBeGreaterThan(0);
    expect(plan.strengths.length).toBeGreaterThan(0);
    expect(plan.priorityActions.length).toBeGreaterThan(0);
  });

  it('generates interactive practice positions from played blunders', () => {
    const plan = ImprovementService.generatePlan(mockGame, mockAnalysis, 'Hero');
    expect(plan.practicePositions.length).toBe(1);
    const p = plan.practicePositions[0];
    expect(p.ply).toBe(3);
    expect(p.playedSan).toBe('f4');
    expect(p.bestMoveSan).toBe('Nf3');
    expect(p.classification).toBe('blunder');
    expect(p.centipawnLoss).toBe(330);
  });
});
