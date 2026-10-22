import { EngineScore, PositionEvaluation } from '../types/chess';

export class UciParser {
  /**
   * Parses an `info ...` line from Stockfish.
   */
  static parseInfoLine(line: string): Partial<PositionEvaluation> | null {
    if (!line.startsWith('info ')) return null;

    const tokens = line.split(' ');
    let depth = 0;
    let score: EngineScore | null = null;
    let nodes: number | undefined;
    let timeMs: number | undefined;
    const pv: string[] = [];

    let i = 1;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === 'depth') {
        depth = parseInt(tokens[i + 1], 10) || 0;
        i += 2;
      } else if (token === 'score') {
        const scoreType = tokens[i + 1]; // 'cp' or 'mate'
        const scoreVal = parseInt(tokens[i + 2], 10) || 0;
        if (scoreType === 'cp' || scoreType === 'mate') {
          score = { type: scoreType, value: scoreVal };
        }
        i += 3;
      } else if (token === 'nodes') {
        nodes = parseInt(tokens[i + 1], 10);
        i += 2;
      } else if (token === 'time') {
        timeMs = parseInt(tokens[i + 1], 10);
        i += 2;
      } else if (token === 'pv') {
        // All remaining tokens are PV moves
        for (let j = i + 1; j < tokens.length; j++) {
          const move = tokens[j];
          if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) {
            pv.push(move);
          } else {
            break;
          }
        }
        break;
      } else {
        i++;
      }
    }

    if (!score) return null;

    return {
      depth,
      score,
      nodes,
      timeMs,
      pv,
      bestMove: pv[0] || '',
    };
  }

  /**
   * Parses a `bestmove ...` line.
   */
  static parseBestMove(line: string): { bestMove: string; ponder?: string } | null {
    if (!line.startsWith('bestmove ')) return null;
    const tokens = line.split(' ');
    const bestMove = tokens[1];
    let ponder: string | undefined;

    const ponderIndex = tokens.indexOf('ponder');
    if (ponderIndex !== -1 && tokens[ponderIndex + 1]) {
      ponder = tokens[ponderIndex + 1];
    }

    return { bestMove, ponder };
  }
}
