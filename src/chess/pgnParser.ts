import { Chess } from 'chess.js';
import { GameMetadata, TimeClass, GameResult } from '../types/chess';
import { lookupOpening } from './openings';

export interface ParsedMove {
  ply: number;
  turn: 'w' | 'b';
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
}

export interface ParsedGame {
  metadata: GameMetadata;
  moves: ParsedMove[];
}

export class PgnParser {
  /**
   * Determines time control classification from timeControl string or event name.
   */
  static parseTimeClass(timeControl?: string, eventName?: string): TimeClass {
    const text = `${timeControl || ''} ${eventName || ''}`.toLowerCase();

    if (text.includes('bullet') || text.includes('hyperbullet') || text.includes('ultra')) {
      return 'bullet';
    }
    if (text.includes('blitz')) {
      return 'blitz';
    }
    if (text.includes('rapid')) {
      return 'rapid';
    }
    if (text.includes('classical') || text.includes('standard')) {
      return 'classical';
    }
    if (text.includes('daily') || text.includes('correspondence')) {
      return 'daily';
    }

    // Try parsing numbers e.g. "180+2", "300", "600+5"
    if (timeControl) {
      const match = timeControl.match(/^(\d+)(?:\+(\d+))?$/);
      if (match) {
        const baseSeconds = parseInt(match[1], 10);
        const inc = match[2] ? parseInt(match[2], 10) : 0;
        const totalEstimated = baseSeconds + inc * 40;

        if (totalEstimated < 180) return 'bullet';
        if (totalEstimated < 600) return 'blitz';
        if (totalEstimated < 3600) return 'rapid';
        return 'classical';
      }
    }

    return 'blitz'; // sensible fallback
  }

  /**
   * Splits a multi-game PGN string into individual PGN game strings.
   */
  static splitMultiPgn(pgnText: string): string[] {
    const cleanText = pgnText.replace(/\r\n/g, '\n').trim();
    if (!cleanText) return [];

    // Split on headers starting with [Event
    const games: string[] = [];
    const lines = cleanText.split('\n');
    let currentGameLines: string[] = [];
    let insideGame = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.startsWith('[Event ') && currentGameLines.length > 0 && insideGame) {
        const gameStr = currentGameLines.join('\n').trim();
        if (gameStr) games.push(gameStr);
        currentGameLines = [line];
      } else {
        if (line.trim().length > 0) {
          insideGame = true;
        }
        currentGameLines.push(line);
      }
    }

    if (currentGameLines.length > 0) {
      const gameStr = currentGameLines.join('\n').trim();
      if (gameStr) games.push(gameStr);
    }

    return games;
  }

  /**
   * Parses a single PGN string into game metadata and full move list.
   */
  static parseGame(pgnText: string, defaultId?: string): ParsedGame {
    const chess = new Chess();
    try {
      chess.loadPgn(pgnText, { strict: false });
    } catch {
      throw new Error('Failed to parse PGN: syntax or move legality error');
    }

    const headers = chess.header();
    const white = (headers['White'] || 'White') as string;
    const black = (headers['Black'] || 'Black') as string;
    const rawResult = (headers['Result'] || '*') as string;
    const result: GameResult = ['1-0', '0-1', '1/2-1/2'].includes(rawResult)
      ? (rawResult as GameResult)
      : '*';

    const whiteEloStr = headers['WhiteElo'];
    const blackEloStr = headers['BlackElo'];
    const whiteElo = whiteEloStr ? parseInt(whiteEloStr, 10) : undefined;
    const blackElo = blackEloStr ? parseInt(blackEloStr, 10) : undefined;
    const date = (headers['Date'] || headers['UTCDate'] || new Date().toISOString().split('T')[0]) as string;
    const timeControl = (headers['TimeControl'] || undefined) as string | undefined;
    const event = (headers['Event'] || undefined) as string | undefined;
    const site = (headers['Site'] || undefined) as string | undefined;
    const timeClass = this.parseTimeClass(timeControl, event);

    // Replay moves to extract FENs and SAN/UCI
    const history = chess.history({ verbose: true });
    const moves: ParsedMove[] = [];
    const replayChess = new Chess();
    const sanList: string[] = [];

    for (let i = 0; i < history.length; i++) {
      const move = history[i];
      const fenBefore = replayChess.fen();
      const madeMove = replayChess.move(move.san);
      if (!madeMove) break;
      const fenAfter = replayChess.fen();

      sanList.push(move.san);
      moves.push({
        ply: i + 1,
        turn: move.color,
        san: move.san,
        uci: `${move.from}${move.to}${move.promotion || ''}`,
        fenBefore,
        fenAfter,
      });
    }

    // Determine ECO / opening name
    let eco = (headers['ECO'] || undefined) as string | undefined;
    let openingName = (headers['Opening'] || headers['Variant'] || undefined) as string | undefined;
    if (!openingName) {
      const identified = lookupOpening(sanList);
      if (identified) {
        if (!eco) eco = identified.eco;
        openingName = identified.name;
      }
    }

    const id = defaultId || `${white}_vs_${black}_${date}_${Math.random().toString(36).substring(2, 7)}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    const metadata: GameMetadata = {
      id,
      platform: 'pgn_upload',
      url: headers['Link'] || (site && site.startsWith('http') ? site : undefined),
      white,
      black,
      whiteElo: Number.isNaN(whiteElo) ? undefined : whiteElo,
      blackElo: Number.isNaN(blackElo) ? undefined : blackElo,
      result,
      date,
      event,
      site,
      timeControl,
      timeClass,
      eco,
      openingName,
      pgn: pgnText,
      plyCount: moves.length,
    };

    return { metadata, moves };
  }

  /**
   * Parses multiple PGN games from a single text.
   */
  static parseMultiPgn(pgnText: string): ParsedGame[] {
    const pgnStrings = this.splitMultiPgn(pgnText);
    const results: ParsedGame[] = [];

    for (let i = 0; i < pgnStrings.length; i++) {
      try {
        const game = this.parseGame(pgnStrings[i]);
        results.push(game);
      } catch (err) {
        console.warn(`Skipping malformed PGN game index ${i}:`, err);
      }
    }

    return results;
  }
}
