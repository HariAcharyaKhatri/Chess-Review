import { describe, it, expect } from 'vitest';
import { lookupOpening, analyzeOpening, getOpeningContinuations } from '../src/chess/openings';

describe('Opening Identification & Coach', () => {
  it('correctly identifies Sicilian Defense', () => {
    const opening = lookupOpening(['e4', 'c5']);
    expect(opening).toBeDefined();
    expect(opening?.eco).toBe('B20');
    expect(opening?.name).toContain('Sicilian Defense');
  });

  it('correctly identifies Sicilian Najdorf Variation', () => {
    const opening = lookupOpening(['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6']);
    expect(opening).toBeDefined();
    expect(opening?.eco).toBe('B90');
    expect(opening?.name).toContain('Najdorf');
  });

  it('correctly identifies Ruy Lopez', () => {
    const opening = lookupOpening(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']);
    expect(opening).toBeDefined();
    expect(opening?.eco).toBe('C60');
    expect(opening?.name).toContain('Ruy Lopez');
  });

  it('detects theoretical deviations in opening moves', () => {
    // 1. e4 c5 2. Nf3 Nc6 3. h3 (deviation from open Sicilian/Rossolimo/etc)
    const analysis = analyzeOpening(['e4', 'c5', 'Nf3', 'Nc6', 'h3']);
    expect(analysis).toBeDefined();
    expect(analysis?.opening.name).toContain('Sicilian Defense');
    expect(analysis?.deviation).toBeDefined();
    expect(analysis?.deviation?.playedMove).toBe('h3');
  });

  it('provides theoretical continuations for starting positions', () => {
    const continuations = getOpeningContinuations(['e4', 'e5']);
    expect(continuations.length).toBeGreaterThan(0);
    const moves = continuations.map((c) => c.move);
    expect(moves).toContain('Nf3');
  });
});
