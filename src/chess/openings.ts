export interface OpeningInfo {
  eco: string;
  name: string;
}

// Map common opening move sequences (first 2-4 plies) to ECO and opening name
export const KNOWN_OPENINGS: Record<string, OpeningInfo> = {
  'e4': { eco: 'B00', name: "King's Pawn Game" },
  'e4 c5': { eco: 'B20', name: 'Sicilian Defense' },
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': { eco: 'B90', name: 'Sicilian Defense: Najdorf Variation' },
  'e4 e5': { eco: 'C20', name: "Open Game (King's Pawn)" },
  'e4 e5 Nf3 Nc6 Bb5': { eco: 'C60', name: 'Ruy Lopez' },
  'e4 e5 Nf3 Nc6 Bc4': { eco: 'C50', name: 'Italian Game' },
  'e4 e5 Nf3 Nc6 Bc4 Bc5': { eco: 'C53', name: 'Giuoco Piano' },
  'e4 e5 Nf3 Nc6 Bc4 Nf6': { eco: 'C55', name: 'Two Knights Defense' },
  'e4 e5 Nf3 Nc6 d4': { eco: 'C44', name: 'Scotch Game' },
  'e4 e5 f4': { eco: 'C30', name: "King's Gambit" },
  'e4 e6': { eco: 'C00', name: 'French Defense' },
  'e4 c6': { eco: 'B10', name: 'Caro-Kann Defense' },
  'e4 d6': { eco: 'B07', name: 'Pirc Defense' },
  'e4 d5': { eco: 'B01', name: 'Scandinavian Defense' },
  'e4 Nf6': { eco: 'B02', name: "Alekhine's Defense" },
  'd4': { eco: 'A40', name: "Queen's Pawn Game" },
  'd4 d5': { eco: 'D00', name: "Queen's Pawn Game: Closed" },
  'd4 d5 c4': { eco: 'D06', name: "Queen's Gambit" },
  'd4 d5 c4 e6': { eco: 'D30', name: "Queen's Gambit Declined" },
  'd4 d5 c4 c6': { eco: 'D10', name: 'Slav Defense' },
  'd4 d5 c4 dxc4': { eco: 'D20', name: "Queen's Gambit Accepted" },
  'd4 Nf6': { eco: 'A45', name: 'Indian Defense' },
  'd4 Nf6 c4 g6': { eco: 'E60', name: "King's Indian Defense" },
  'd4 Nf6 c4 e6': { eco: 'E00', name: 'East Indian Defense' },
  'd4 Nf6 c4 c5': { eco: 'A56', name: 'Benoni Defense' },
  'd4 f5': { eco: 'A80', name: 'Dutch Defense' },
  'c4': { eco: 'A10', name: 'English Opening' },
  'Nf3': { eco: 'A04', name: 'Réti Opening' },
  'g3': { eco: 'A00', name: 'Benko Opening' },
  'b3': { eco: 'A01', name: 'Nimzo-Larsen Attack' },
  'f4': { eco: 'A02', name: "Bird's Opening" },
};

export function lookupOpening(movesSan: string[]): OpeningInfo | undefined {
  // Try longest matching prefix first (up to 8 plies)
  for (let len = Math.min(movesSan.length, 8); len >= 1; len--) {
    const key = movesSan.slice(0, len).join(' ');
    if (KNOWN_OPENINGS[key]) {
      return KNOWN_OPENINGS[key];
    }
  }
  return undefined;
}
