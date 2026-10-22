import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionManager } from '../src/analysis/sessionManager';
import { GameMetadata, GameAnalysisResult } from '../src/types/chess';

// Mock storageService so unit tests don't require IndexedDB in Node environment
vi.mock('../src/storage/indexedDb', () => {
  const store = new Map<string, any>();
  return {
    DEFAULT_SETTINGS: {
      depth: 12,
      movetimeMs: 1500,
      threads: 1,
      hashMb: 32,
      multipv: 1,
      preset: 'balanced',
      batchSize: 5,
      autoQueue: false,
      sessionTimeLimitMinutes: 0,
      confidenceReporting: true,
      autoDeviceTuning: true,
    },
    storageService: {
      saveSession: vi.fn(async (s) => {
        store.set(s.id, s);
      }),
      getSession: vi.fn(async (id) => store.get(id)),
      getAnalysisResult: vi.fn(async () => null),
      saveAnalysisResult: vi.fn(async () => {}),
      getLatestBenchmark: vi.fn(async () => null),
    },
  };
});

describe('SessionManager', () => {
  let manager: SessionManager;

  const mockGames: GameMetadata[] = [
    {
      id: 'game_1',
      platform: 'chesscom',
      white: 'Hero',
      black: 'Rival1',
      result: '1-0',
      date: '2023.01.01',
      timeClass: 'rapid',
      pgn: '1. e4 e5 1-0',
      plyCount: 2,
    },
    {
      id: 'game_2',
      platform: 'chesscom',
      white: 'Rival2',
      black: 'Hero',
      result: '0-1',
      date: '2023.01.02',
      timeClass: 'rapid',
      pgn: '1. d4 d5 0-1',
      plyCount: 2,
    },
    {
      id: 'game_3',
      platform: 'chesscom',
      white: 'Hero',
      black: 'Rival3',
      result: '1-0',
      date: '2023.01.03',
      timeClass: 'rapid',
      pgn: '1. c4 c5 1-0',
      plyCount: 2,
    },
  ];

  beforeEach(() => {
    manager = new SessionManager();
  });

  it('creates an analysis session in pending status', async () => {
    const session = await manager.createSession(mockGames, undefined, 'My Session', 'Hero');
    expect(session.id).toBeDefined();
    expect(session.status).toBe('pending');
    expect(session.player).toBe('Hero');
    expect(session.gameIds.length).toBe(3);
    expect(session.completedGameIds.length).toBe(0);
    expect(session.runningAverageAccuracy).toBeUndefined();
  });

  it('calculates running average accuracy strictly as arithmetic mean of completed games', async () => {
    const session = await manager.createSession(mockGames, undefined, 'Test Session', 'Hero');

    // Simulate completion of Game 1: Hero is White (82.0%)
    const result1: GameAnalysisResult = {
      gameId: 'game_1',
      analyzedAt: new Date().toISOString(),
      engineVersion: 'Stockfish WASM',
      targetDepth: 12,
      whiteAccuracy: 82.0,
      blackAccuracy: 60.0,
      whiteAcpl: 20,
      blackAcpl: 55,
      moves: [],
      whiteClassifications: { brilliant: 0, great: 0, best: 1, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0, forced: 0, book: 0 },
      blackClassifications: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 1, missed_win: 0, forced: 0, book: 0 },
      totalPlies: 2,
    };

    // Invoke private recordGameCompletion via reflection/any
    (manager as any).recordGameCompletion(session, mockGames[0], result1);
    expect(session.gameAccuracies['game_1']).toBe(82.0);
    expect(session.runningAverageAccuracy).toBe(82.0);

    // Simulate completion of Game 2: Hero is Black (76.0%)
    const result2: GameAnalysisResult = {
      gameId: 'game_2',
      analyzedAt: new Date().toISOString(),
      engineVersion: 'Stockfish WASM',
      targetDepth: 12,
      whiteAccuracy: 50.0,
      blackAccuracy: 76.0,
      whiteAcpl: 70,
      blackAcpl: 30,
      moves: [],
      whiteClassifications: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 1, missed_win: 0, forced: 0, book: 0 },
      blackClassifications: { brilliant: 0, great: 0, best: 1, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0, forced: 0, book: 0 },
      totalPlies: 2,
    };

    (manager as any).recordGameCompletion(session, mockGames[1], result2);
    expect(session.gameAccuracies['game_2']).toBe(76.0);
    // (82.0 + 76.0) / 2 = 79.0%
    expect(session.runningAverageAccuracy).toBe(79.0);

    // Simulate completion of Game 3: Hero is White (88.0%)
    const result3: GameAnalysisResult = {
      gameId: 'game_3',
      analyzedAt: new Date().toISOString(),
      engineVersion: 'Stockfish WASM',
      targetDepth: 12,
      whiteAccuracy: 88.0,
      blackAccuracy: 64.0,
      whiteAcpl: 15,
      blackAcpl: 45,
      moves: [],
      whiteClassifications: { brilliant: 0, great: 0, best: 1, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0, missed_win: 0, forced: 0, book: 0 },
      blackClassifications: { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 1, missed_win: 0, forced: 0, book: 0 },
      totalPlies: 2,
    };

    (manager as any).recordGameCompletion(session, mockGames[2], result3);
    expect(session.gameAccuracies['game_3']).toBe(88.0);
    // (82.0 + 76.0 + 88.0) / 3 = 82.0%
    expect(session.runningAverageAccuracy).toBe(82.0);
  });

  it('sets stopAfterCurrentGame flag properly', async () => {
    const session = await manager.createSession(mockGames);
    manager.stopAfterCurrentGame(session.id);
    const updated = await manager.getSession(session.id);
    expect(updated?.stopAfterCurrent).toBe(true);
  });
});
