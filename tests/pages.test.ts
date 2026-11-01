import { describe, it, expect } from 'vitest';
import openingsList from '../src/chess/openingsData.json';
import { OpeningInfo } from '../src/chess/openings';
import { PlayerAnalytics } from '../src/services/playerAnalytics';
import { GameMetadata, GameAnalysisResult } from '../src/types/chess';

describe('Openings Catalog & Explorer Data', () => {
  it('loads 3,865 official ECO openings', () => {
    expect((openingsList as OpeningInfo[]).length).toBe(3865);
  });

  it('contains famous mainline openings across all ECO categories', () => {
    const list = openingsList as OpeningInfo[];
    const ruyLopez = list.find((o) => o.eco === 'C89' || o.name.includes('Ruy Lopez'));
    const sicilian = list.find((o) => o.eco.startsWith('B') && o.name.includes('Sicilian'));
    const queensGambit = list.find((o) => o.eco.startsWith('D') && o.name.includes("Queen's Gambit"));
    const kingsIndian = list.find((o) => o.eco.startsWith('E') && o.name.includes("King's Indian"));

    expect(ruyLopez).toBeDefined();
    expect(sicilian).toBeDefined();
    expect(queensGambit).toBeDefined();
    expect(kingsIndian).toBeDefined();
  });

  it('filters correctly by ECO category', () => {
    const list = openingsList as OpeningInfo[];
    const catB = list.filter((o) => o.eco.startsWith('B'));
    expect(catB.length).toBeGreaterThan(500);

    const catC = list.filter((o) => o.eco.startsWith('C'));
    expect(catC.length).toBeGreaterThan(500);
  });
});

describe('Player Analytics & Cohort Comparison', () => {
  const dummyGames: GameMetadata[] = [
    {
      id: 'g1',
      white: 'PlayerA',
      black: 'Opponent1',
      whiteElo: 1200,
      blackElo: 1200,
      result: '1-0',
      date: '2024-01-01',
      timeControl: '600',
      timeClass: 'rapid',
      eco: 'C50',
      openingName: 'Italian Game',
      plyCount: 4,
      pgn: '1. e4 e5 2. Nf3 Nc6 1-0',
      platform: 'chesscom',
    },
    {
      id: 'g2',
      white: 'Opponent2',
      black: 'PlayerA',
      whiteElo: 1250,
      blackElo: 1220,
      result: '0-1',
      date: '2024-02-01',
      timeControl: '600',
      timeClass: 'rapid',
      eco: 'B20',
      openingName: 'Sicilian Defense',
      plyCount: 2,
      pgn: '1. e4 c5 0-1',
      platform: 'chesscom',
    },
    {
      id: 'g3',
      white: 'PlayerA',
      black: 'Opponent3',
      whiteElo: 1300,
      blackElo: 1280,
      result: '1/2-1/2',
      date: '2024-03-01',
      timeControl: '180',
      timeClass: 'blitz',
      eco: 'D00',
      openingName: "Queen's Pawn",
      plyCount: 2,
      pgn: '1. d4 d5 1/2-1/2',
      platform: 'chesscom',
    },
  ];

  const dummyResults = new Map<string, GameAnalysisResult>([
    [
      'g1',
      {
        gameId: 'g1',
        analyzedAt: '2024-01-01T00:00:00Z',
        engineVersion: 'Stockfish 16.1',
        whiteAccuracy: 88,
        blackAccuracy: 75,
        whiteAcpl: 25,
        blackAcpl: 55,
        targetDepth: 12,
        totalPlies: 4,
        whiteClassifications: { brilliant: 0, great: 0, best: 2, excellent: 1, good: 1, book: 0, inaccuracy: 0, mistake: 0, forced: 0, missed_win: 0, blunder: 0 },
        blackClassifications: { brilliant: 0, great: 0, best: 1, excellent: 0, good: 1, book: 0, inaccuracy: 1, mistake: 1, forced: 0, missed_win: 0, blunder: 0 },
        moves: [],
      },
    ],
    [
      'g2',
      {
        gameId: 'g2',
        analyzedAt: '2024-02-01T00:00:00Z',
        engineVersion: 'Stockfish 16.1',
        whiteAccuracy: 70,
        blackAccuracy: 92,
        whiteAcpl: 60,
        blackAcpl: 18,
        targetDepth: 12,
        totalPlies: 2,
        whiteClassifications: { brilliant: 0, great: 0, best: 1, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, forced: 0, missed_win: 0, blunder: 0 },
        blackClassifications: { brilliant: 0, great: 0, best: 1, excellent: 0, good: 0, book: 0, inaccuracy: 0, mistake: 0, forced: 0, missed_win: 0, blunder: 0 },
        moves: [],
      },
    ],
  ]);

  it('generates accurate career stats for PlayerA', () => {
    const stats = PlayerAnalytics.generateStats('PlayerA', dummyGames, dummyResults);
    expect(stats.username).toBe('PlayerA');
    expect(stats.totalGames).toBe(3);
    expect(stats.wins).toBe(2);
    expect(stats.draws).toBe(1);
    expect(stats.losses).toBe(0);
    expect(stats.winRate).toBe(66.7);
    expect(stats.analyzedGames).toBe(2);
    expect(stats.averageAccuracy).toBe(90); // (88 + 92) / 2
  });

  it('compares oldest vs recent cohorts properly', () => {
    const comp = PlayerAnalytics.compareOldestVsRecent('PlayerA', dummyGames, dummyResults, 1);
    expect(comp).toBeDefined();
    expect(comp.oldestSample.gameCount).toBe(1);
    expect(comp.recentSample.gameCount).toBe(1);
  });
});
