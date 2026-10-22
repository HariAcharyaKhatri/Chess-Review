import { describe, it, expect, beforeEach } from 'vitest';
import { AnalysisQueue } from '../src/analysis/analysisQueue';
import { PlayerAnalytics } from '../src/services/playerAnalytics';
import { GameMetadata, GameAnalysisResult } from '../src/types/chess';

describe('AnalysisQueue', () => {
  let queue: AnalysisQueue;

  const mockGame: GameMetadata = {
    id: 'test_game_1',
    platform: 'chesscom',
    white: 'WhitePlayer',
    black: 'BlackPlayer',
    result: '1-0',
    date: '2023.10.15',
    timeClass: 'blitz',
    pgn: '1. e4 e5 2. Nf3 Nc6 1-0',
    plyCount: 4,
  };

  beforeEach(() => {
    queue = new AnalysisQueue();
  });

  it('adds games to queue and notifies subscribers', () => {
    let notifiedItems: any[] = [];
    queue.subscribe((items) => {
      notifiedItems = items;
    });

    queue.addGames([mockGame]);
    expect(notifiedItems.length).toBe(1);
    expect(notifiedItems[0].status).toBe('queued');
    expect(notifiedItems[0].game.id).toBe('test_game_1');
  });

  it('does not add duplicate games', () => {
    queue.addGames([mockGame]);
    queue.addGames([mockGame]);
    expect(queue.getItems().length).toBe(1);
  });

  it('clears queue properly', () => {
    queue.addGames([mockGame]);
    queue.clear();
    expect(queue.getItems().length).toBe(0);
  });
});

describe('PlayerAnalytics', () => {
  const games: GameMetadata[] = [
    {
      id: 'g1',
      platform: 'chesscom',
      white: 'Hero',
      black: 'Villain',
      result: '1-0',
      date: '2022.01.01',
      timeClass: 'blitz',
      pgn: '1. e4 e5 1-0',
      plyCount: 2,
      openingName: "King's Pawn Game",
      eco: 'B00',
    },
    {
      id: 'g2',
      platform: 'chesscom',
      white: 'Villain',
      black: 'Hero',
      result: '1-0',
      date: '2023.01.01',
      timeClass: 'blitz',
      pgn: '1. d4 d5 1-0',
      plyCount: 2,
      openingName: "Queen's Pawn Game",
      eco: 'D00',
    },
  ];

  const resultsMap = new Map<string, GameAnalysisResult>();
  resultsMap.set('g1', {
    gameId: 'g1',
    analyzedAt: '2023-10-01',
    engineVersion: 'Stockfish WASM',
    targetDepth: 12,
    whiteAccuracy: 92.5,
    blackAccuracy: 65.0,
    whiteAcpl: 15,
    blackAcpl: 60,
    moves: [],
    whiteClassifications: { brilliant: 0, great: 0, best: 1, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0, forced: 0, book: 0 },
    blackClassifications: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 1, missed_win: 0, forced: 0, book: 0 },
    totalPlies: 2,
  });

  it('generates career stats accurately', () => {
    const stats = PlayerAnalytics.generateStats('Hero', games, resultsMap);
    expect(stats.totalGames).toBe(2);
    expect(stats.wins).toBe(1);
    expect(stats.losses).toBe(1);
    expect(stats.winRate).toBe(50);
    expect(stats.averageWhiteAccuracy).toBe(92.5);
  });

  it('handles oldest vs recent comparison and detects overlap', () => {
    const comparison = PlayerAnalytics.compareOldestVsRecent('Hero', games, resultsMap, 1);
    expect(comparison.oldestSample.gameCount).toBe(1);
    expect(comparison.recentSample.gameCount).toBe(1);
    expect(comparison.hasOverlap).toBe(false);
  });
});
