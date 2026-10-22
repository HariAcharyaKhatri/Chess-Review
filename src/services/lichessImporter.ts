import { GameMetadata, TimeClass } from '../types/chess';
import { PgnParser } from '../chess/pgnParser';

export interface LichessUser {
  id: string;
  username: string;
  title?: string;
  online: boolean;
}

export class LichessImporter {
  private static BASE_URL = 'https://lichess.org/api';

  /**
   * Retrieves Lichess user information.
   */
  static async getUser(username: string): Promise<LichessUser> {
    const cleanUsername = username.trim().toLowerCase();
    const res = await fetch(`${this.BASE_URL}/user/${encodeURIComponent(cleanUsername)}`);
    if (res.status === 404) {
      throw new Error(`Lichess player "${cleanUsername}" was not found.`);
    }
    if (res.status === 429) {
      throw new Error('Lichess rate limit reached. Please wait a minute before retrying.');
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch Lichess profile (HTTP ${res.status}).`);
    }
    return await res.json();
  }

  /**
   * Fetches public games from Lichess.
   */
  static async fetchGames(
    username: string,
    maxGames: number = 50,
    perfType?: string // e.g. blitz, rapid, bullet
  ): Promise<GameMetadata[]> {
    const cleanUsername = username.trim().toLowerCase();
    let url = `${this.BASE_URL}/games/user/${encodeURIComponent(cleanUsername)}?max=${maxGames}&pgnInJson=true&clocks=true&opening=true`;
    if (perfType) {
      url += `&perfType=${perfType}`;
    }

    const res = await fetch(url, {
      headers: {
        Accept: 'application/x-ndjson',
      },
    });

    if (res.status === 404) {
      throw new Error(`Lichess user "${cleanUsername}" does not exist.`);
    }
    if (res.status === 429) {
      throw new Error('Lichess rate limit reached. Please wait a moment and try again.');
    }
    if (!res.ok) {
      throw new Error(`Failed to fetch Lichess games (HTTP ${res.status}).`);
    }

    const text = await res.text();
    const lines = text.split('\n').filter((line) => line.trim().length > 0);
    const games: GameMetadata[] = [];

    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (item.pgn) {
          const parsed = PgnParser.parseGame(item.pgn, `lichess_${item.id}`);
          parsed.metadata.platform = 'lichess';
          parsed.metadata.url = `https://lichess.org/${item.id}`;
          if (item.speed) {
            parsed.metadata.timeClass = item.speed as TimeClass;
          }
          if (item.opening?.name) {
            parsed.metadata.openingName = item.opening.name;
          }
          if (item.opening?.eco) {
            parsed.metadata.eco = item.opening.eco;
          }
          games.push(parsed.metadata);
        }
      } catch (err) {
        // Continue on single malformed item
      }
    }

    return games;
  }
}
