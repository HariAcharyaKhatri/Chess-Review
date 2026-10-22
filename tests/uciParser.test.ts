import { describe, it, expect } from 'vitest';
import { UciParser } from '../src/engine/uciParser';

describe('UciParser', () => {
  it('formats cp and mate scores accurately', () => {
    expect(UciParser.formatScore({ type: 'cp', value: 145 })).toBe('+1.45');
    expect(UciParser.formatScore({ type: 'cp', value: -70 })).toBe('-0.70');
    expect(UciParser.formatScore({ type: 'cp', value: 0 })).toBe('0.00');
    expect(UciParser.formatScore({ type: 'mate', value: 3 })).toBe('M3');
    expect(UciParser.formatScore({ type: 'mate', value: -2 })).toBe('-M2');
  });

  it('parses typical Stockfish info line with telemetry', () => {
    const line = 'info depth 14 seldepth 21 multipv 1 score cp 38 nodes 158420 nps 1250000 hashfull 45 tbhits 0 time 126 pv e2e4 c7c5 g1f3 d7d6';
    const parsed = UciParser.parseInfoLine(line);

    expect(parsed).not.toBeNull();
    expect(parsed?.depth).toBe(14);
    expect(parsed?.seldepth).toBe(21);
    expect(parsed?.score).toEqual({ type: 'cp', value: 38 });
    expect(parsed?.nodes).toBe(158420);
    expect(parsed?.nps).toBe(1250000);
    expect(parsed?.hashfull).toBe(45);
    expect(parsed?.timeMs).toBe(126);
    expect(parsed?.bestMove).toBe('e2e4');
    expect(parsed?.pv).toEqual(['e2e4', 'c7c5', 'g1f3', 'd7d6']);
  });

  it('parses mate score line and formats telemetry', () => {
    const line = 'info depth 8 seldepth 12 score mate -3 nodes 4500 nps 300000 time 15 pv e1e2 d8e8';
    const telemetry = UciParser.parseTelemetry(line);

    expect(telemetry).not.toBeNull();
    expect(telemetry?.depth).toBe(8);
    expect(telemetry?.seldepth).toBe(12);
    expect(telemetry?.score).toEqual({ type: 'mate', value: -3 });
    expect(telemetry?.rawScoreString).toBe('-M3');
    expect(telemetry?.bestMove).toBe('e1e2');
  });

  it('parses currmove and currmovenumber', () => {
    const line = 'info depth 12 currmove g1f3 currmovenumber 4 nodes 45000 nps 900000 score cp 12 pv g1f3';
    const parsed = UciParser.parseInfoLine(line);

    expect(parsed?.currmove).toBe('g1f3');
    expect(parsed?.currmovenumber).toBe(4);
  });

  it('parses bestmove output', () => {
    const res1 = UciParser.parseBestMove('bestmove e2e4 ponder e7e5');
    expect(res1).toEqual({ bestMove: 'e2e4', ponder: 'e7e5' });

    const res2 = UciParser.parseBestMove('bestmove d7d8q');
    expect(res2).toEqual({ bestMove: 'd7d8q', ponder: undefined });

    const res3 = UciParser.parseBestMove('info depth 10');
    expect(res3).toBeNull();
  });
});
