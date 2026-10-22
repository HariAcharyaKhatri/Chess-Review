import { EngineScore, PositionEvaluation, EngineTelemetry } from '../types/chess';

export class UciParser {
  /**
   * Formats an EngineScore into human-readable score string (e.g. "+1.42", "-0.80", "M3", "-M1").
   */
  static formatScore(score: EngineScore): string {
    if (score.type === 'mate') {
      return score.value > 0 ? `M${score.value}` : `-M${Math.abs(score.value)}`;
    }
    const pawns = score.value / 100;
    const formatted = pawns > 0 ? `+${pawns.toFixed(2)}` : pawns.toFixed(2);
    return formatted === '-0.00' ? '0.00' : formatted;
  }

  /**
   * Parses an `info ...` line from Stockfish and extracts complete telemetry.
   */
  static parseInfoLine(line: string): Partial<PositionEvaluation> | null {
    if (!line.startsWith('info ')) return null;

    const tokens = line.split(' ');
    let depth = 0;
    let seldepth: number | undefined;
    let score: EngineScore | null = null;
    let nodes: number | undefined;
    let nps: number | undefined;
    let timeMs: number | undefined;
    let hashfull: number | undefined;
    let currmove: string | undefined;
    let currmovenumber: number | undefined;
    const pv: string[] = [];

    let i = 1;
    while (i < tokens.length) {
      const token = tokens[i];
      if (token === 'depth') {
        depth = parseInt(tokens[i + 1], 10) || 0;
        i += 2;
      } else if (token === 'seldepth') {
        seldepth = parseInt(tokens[i + 1], 10) || undefined;
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
      } else if (token === 'nps') {
        nps = parseInt(tokens[i + 1], 10);
        i += 2;
      } else if (token === 'time') {
        timeMs = parseInt(tokens[i + 1], 10);
        i += 2;
      } else if (token === 'hashfull') {
        hashfull = parseInt(tokens[i + 1], 10);
        i += 2;
      } else if (token === 'currmove') {
        currmove = tokens[i + 1];
        i += 2;
      } else if (token === 'currmovenumber') {
        currmovenumber = parseInt(tokens[i + 1], 10);
        i += 2;
      } else if (token === 'pv') {
        // All remaining tokens up to non-move are PV moves
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
      seldepth,
      score,
      nodes,
      nps,
      timeMs,
      hashfull,
      currmove,
      currmovenumber,
      pv,
      bestMove: pv[0] || '',
    };
  }

  /**
   * Converts a parsed info line into full EngineTelemetry if score is present.
   */
  static parseTelemetry(line: string): EngineTelemetry | null {
    const parsed = this.parseInfoLine(line);
    if (!parsed || !parsed.score || !parsed.depth) return null;

    return {
      depth: parsed.depth,
      seldepth: parsed.seldepth,
      score: parsed.score,
      nodes: parsed.nodes || 0,
      nps: parsed.nps || 0,
      timeMs: parsed.timeMs || 0,
      pv: parsed.pv || [],
      bestMove: parsed.bestMove || (parsed.pv && parsed.pv[0]) || '',
      currmove: parsed.currmove,
      currmovenumber: parsed.currmovenumber,
      hashfull: parsed.hashfull,
      rawScoreString: this.formatScore(parsed.score),
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
