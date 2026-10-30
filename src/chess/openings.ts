import openingsList from './openingsData.json';

export interface OpeningInfo {
  eco: string;
  name: string;
  moves: string;
}

export interface OpeningDeviation {
  ply: number;
  playedMove: string;
  theoreticalMove: string;
  continuation: string[];
}

export interface OpeningAnalysisResult {
  opening: OpeningInfo;
  matchedPlies: number;
  totalTheoryPlies: number;
  isInTheory: boolean;
  deviation?: OpeningDeviation;
  candidateContinuations: {
    move: string;
    openingName: string;
    eco: string;
  }[];
}

// Map for O(1) exact sequence lookup
const openingsMap = new Map<string, OpeningInfo>();

// Prefix map: prefix moves string -> list of full openings starting with this prefix
const prefixMap = new Map<string, OpeningInfo[]>();

for (const item of openingsList as OpeningInfo[]) {
  openingsMap.set(item.moves, item);

  const tokens = item.moves.split(' ');
  // Index prefixes up to 10 moves
  for (let i = 1; i < tokens.length && i <= 10; i++) {
    const prefix = tokens.slice(0, i).join(' ');
    let arr = prefixMap.get(prefix);
    if (!arr) {
      arr = [];
      prefixMap.set(prefix, arr);
    }
    if (arr.length < 8) {
      arr.push(item);
    }
  }
}

/**
 * Looks up the most specific opening matching the played moves sequence.
 * Uses longest matching prefix search.
 */
export function lookupOpening(movesSan: string[]): OpeningInfo | undefined {
  if (!movesSan || movesSan.length === 0) return undefined;

  for (let len = movesSan.length; len >= 1; len--) {
    const key = movesSan.slice(0, len).join(' ');
    const found = openingsMap.get(key);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/**
 * Checks whether the played sequence of SAN moves corresponds to established opening book theory.
 */
export function isOpeningBookMove(movesSan: string[]): boolean {
  if (!movesSan || movesSan.length === 0 || movesSan.length > 20) return false;
  const key = movesSan.join(' ');
  return openingsMap.has(key) || prefixMap.has(key);
}

/**
 * Performs deep opening analysis on a sequence of moves.
 * Detects the identified opening, whether the position is still within theory,
 * the exact deviation point (if any), and theoretical next moves.
 */
export function analyzeOpening(movesSan: string[]): OpeningAnalysisResult | undefined {
  if (!movesSan || movesSan.length === 0) return undefined;

  const opening = lookupOpening(movesSan);
  if (!opening) return undefined;

  const theoryMoves = opening.moves.split(' ');
  const matchedPlies = theoryMoves.length;
  const isInTheory = movesSan.length <= matchedPlies;

  let deviation: OpeningDeviation | undefined;

  // If the game continued beyond the matched theory
  if (movesSan.length > matchedPlies) {
    const nextGameMove = movesSan[matchedPlies];
    // Look for any longer openings that branched from here
    const prefix = movesSan.slice(0, matchedPlies).join(' ');
    const candidates = prefixMap.get(prefix) || [];

    const theoreticalCandidate = candidates.find((c) => {
      const cMoves = c.moves.split(' ');
      return cMoves.length > matchedPlies;
    });

    if (theoreticalCandidate) {
      const cMoves = theoreticalCandidate.moves.split(' ');
      deviation = {
        ply: matchedPlies + 1,
        playedMove: nextGameMove,
        theoreticalMove: cMoves[matchedPlies],
        continuation: cMoves.slice(matchedPlies),
      };
    }
  }

  // Find candidate theoretical continuations from the current position
  const currentKey = movesSan.join(' ');
  const matchingOpenings = prefixMap.get(currentKey) || [];
  const candidateContinuations: { move: string; openingName: string; eco: string }[] = [];
  const seenMoves = new Set<string>();

  for (const opt of matchingOpenings) {
    const optMoves = opt.moves.split(' ');
    if (optMoves.length > movesSan.length) {
      const nextMove = optMoves[movesSan.length];
      if (!seenMoves.has(nextMove)) {
        seenMoves.add(nextMove);
        candidateContinuations.push({
          move: nextMove,
          openingName: opt.name,
          eco: opt.eco,
        });
      }
    }
  }

  return {
    opening,
    matchedPlies,
    totalTheoryPlies: theoryMoves.length,
    isInTheory,
    deviation,
    candidateContinuations: candidateContinuations.slice(0, 5),
  };
}

/**
 * Returns top theoretical continuations for a given played sequence.
 */
export function getOpeningContinuations(movesSan: string[]): {
  move: string;
  name: string;
  eco: string;
}[] {
  const currentKey = movesSan.join(' ');
  const candidates = prefixMap.get(currentKey) || [];
  const results: { move: string; name: string; eco: string }[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    const moves = c.moves.split(' ');
    if (moves.length > movesSan.length) {
      const nextMove = moves[movesSan.length];
      if (!seen.has(nextMove)) {
        seen.add(nextMove);
        results.push({ move: nextMove, name: c.name, eco: c.eco });
      }
    }
  }
  return results.slice(0, 5);
}
