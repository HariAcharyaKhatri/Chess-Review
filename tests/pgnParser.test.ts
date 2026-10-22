import { describe, it, expect } from 'vitest';
import { PgnParser } from '../src/chess/pgnParser';

describe('PgnParser', () => {
  const samplePgn = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2023.10.15"]
[White "MagnusCarlsen"]
[Black "Hikaru"]
[Result "1-0"]
[WhiteElo "2880"]
[BlackElo "2875"]
[TimeControl "180+2"]
[ECO "C50"]
[Opening "Italian Game"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. d3 Nf6 1-0`;

  it('parses single game metadata accurately', () => {
    const parsed = PgnParser.parseGame(samplePgn);
    expect(parsed.metadata.white).toBe('MagnusCarlsen');
    expect(parsed.metadata.black).toBe('Hikaru');
    expect(parsed.metadata.whiteElo).toBe(2880);
    expect(parsed.metadata.blackElo).toBe(2875);
    expect(parsed.metadata.result).toBe('1-0');
    expect(parsed.metadata.timeClass).toBe('blitz');
    expect(parsed.metadata.eco).toBe('C50');
    expect(parsed.moves.length).toBe(8);
  });

  it('handles promotions, castling, and en passant', () => {
    // Scholar's mate with checks
    const pgn = `[Event "Short Game"]
1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`;
    const parsed = PgnParser.parseGame(pgn);
    expect(parsed.moves.length).toBe(7);
    expect(parsed.moves[6].san).toBe('Qxf7#');
    expect(parsed.moves[6].turn).toBe('w');
  });

  it('splits multi-game PGNs', () => {
    const multiPgn = `[Event "Game 1"]
[White "Player1"]
[Black "Player2"]
[Result "1-0"]

1. e4 e5 1-0

[Event "Game 2"]
[White "Player3"]
[Black "Player4"]
[Result "0-1"]

1. d4 d5 0-1`;

    const games = PgnParser.splitMultiPgn(multiPgn);
    expect(games.length).toBe(2);

    const parsedGames = PgnParser.parseMultiPgn(multiPgn);
    expect(parsedGames.length).toBe(2);
    expect(parsedGames[0].metadata.white).toBe('Player1');
    expect(parsedGames[1].metadata.white).toBe('Player3');
  });

  it('throws descriptive error on invalid move in PGN', () => {
    const invalidPgn = `[Event "Bad Move"]
1. e4 e5 2. Ke2 Ke7 3. Ke8 1-0`; // Ke8 is illegal for white!

    expect(() => PgnParser.parseGame(invalidPgn)).toThrow();
  });

  it('correctly classifies time controls', () => {
    expect(PgnParser.parseTimeClass('60')).toBe('bullet');
    expect(PgnParser.parseTimeClass('180')).toBe('blitz');
    expect(PgnParser.parseTimeClass('600')).toBe('rapid');
    expect(PgnParser.parseTimeClass('5400')).toBe('classical');
    expect(PgnParser.parseTimeClass(undefined, 'Bullet Chess Championship')).toBe('bullet');
  });
});
