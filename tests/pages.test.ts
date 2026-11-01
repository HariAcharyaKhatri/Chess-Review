import { describe, it, expect } from 'vitest';
import openingsList from '../src/chess/openingsData.json';
import { OpeningInfo } from '../src/chess/openings';

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
