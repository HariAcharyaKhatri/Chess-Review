import { GameMetadata } from '../types/chess';
import { PgnParser } from '../chess/pgnParser';

export interface ChessComProfile {
  username: string;
  name?: string;
  avatar?: string;
  url: string;
  status: string;
}

export class ChessComImporter {
  private static BASE_URL = 'https://api.chess.com/pub';

  /**
   * Validates username and retrieves profile info.
   */
  static async getProfile(username: string): Promise<ChessComProfile> {
    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      throw new Error('Username is required');
    }

    try {
      const res = await fetch(`${this.BASE_URL}/player/${encodeURIComponent(cleanUsername)}`);
      if (res.status === 404) {
        throw new Error(`Chess.com player "${cleanUsername}" was not found.`);
      }
      if (res.status === 429) {
        throw new Error('Chess.com API rate limit reached. Please wait a moment and try again.');
      }
      if (!res.ok) {
        throw new Error(`Chess.com request failed with status: ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Network error or CORS restriction connecting to Chess.com. You can also import games directly using PGN upload.');
      }
      throw err;
    }
  }

  /**
   * Fetches public games archives for a player and extracts games.
   * @param username Chess.com username
   * @param maxMonths Number of recent months to inspect (default 6)
   * @param maxGames Maximum number of games to retrieve
   */
  static async fetchGames(
    username: string,
    maxMonths: number = 6,
    maxGames: number = 50
  ): Promise<GameMetadata[]> {
    const cleanUsername = username.trim().toLowerCase();
    const archivesRes = await fetch(`${this.BASE_URL}/player/${encodeURIComponent(cleanUsername)}/games/archives`);

    if (archivesRes.status === 404) {
      throw new Error(`Player "${cleanUsername}" does not exist on Chess.com.`);
    }
    if (archivesRes.status === 429) {
      throw new Error('Rate limit exceeded. Please wait a moment before fetching again.');
    }
    if (!archivesRes.ok) {
      throw new Error(`Failed to fetch game archives (HTTP ${archivesRes.status}).`);
    }

    const { archives } = (await archivesRes.json()) as { archives: string[] };
    if (!archives || archives.length === 0) {
      return [];
    }

    // Inspect archives in reverse chronological order (newest months first)
    const recentArchives = archives.slice(-maxMonths).reverse();
    const allGames: GameMetadata[] = [];
    const seenIds = new Set<string>();

    for (const archiveUrl of recentArchives) {
      if (allGames.length >= maxGames) break;

      try {
        const monthRes = await fetch(archiveUrl);
        if (!monthRes.ok) continue;

        const data = await monthRes.json();
        const gamesList = data.games || [];

        // Reverse to get newest games in the month first
        for (let i = gamesList.length - 1; i >= 0; i--) {
          if (allGames.length >= maxGames) break;
          const g = gamesList[i];

          // Chess.com standard game object contains pgn, white, black, time_control, url
          if (!g.pgn) continue;

          const gameId = g.url ? g.url.split('/').pop() || g.uuid : `chesscom_${Date.now()}_${Math.random()}`;
          if (seenIds.has(gameId)) continue;
          seenIds.add(gameId);

          try {
            const parsed = PgnParser.parseGame(g.pgn, `chesscom_${gameId}`);
            parsed.metadata.platform = 'chesscom';
            parsed.metadata.url = g.url;
            if (g.time_class) {
              parsed.metadata.timeClass = g.time_class.toLowerCase();
            }

            allGames.push(parsed.metadata);
          } catch {
            // If individual game PGN has an issue, continue to next
          }
        }
      } catch (err) {
        console.warn('Error fetching month archive:', err);
      }
    }

    // Sort descending by date
    allGames.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allGames;
  }
}
