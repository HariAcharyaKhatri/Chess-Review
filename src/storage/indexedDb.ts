import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { GameMetadata, GameAnalysisResult, EngineSettings, PlayerStats, AnalysisSession, BenchmarkResult } from '../types/chess';

export const DEFAULT_SETTINGS: EngineSettings = {
  preset: 'balanced',
  depth: 12,
  movetimeMs: 1500,
  threads: 1,
  hashMb: 32,
  sessionTimeLimitMinutes: 10,
  boardTheme: 'green',
  soundEnabled: true,
};

interface ChessAppDB extends DBSchema {
  games: {
    key: string;
    value: GameMetadata;
    indexes: { 'by-date': string; 'by-platform': string; 'by-white': string; 'by-black': string };
  };
  analysisResults: {
    key: string;
    value: GameAnalysisResult;
    indexes: { 'by-date': string };
  };
  playerProfiles: {
    key: string;
    value: PlayerStats;
  };
  settings: {
    key: string;
    value: any;
  };
  sessions: {
    key: string;
    value: AnalysisSession;
    indexes: { 'by-date': string; 'by-status': string };
  };
  benchmarks: {
    key: string;
    value: BenchmarkResult;
  };
}

const DB_NAME = 'chess_player_analytics_db';
const DB_VERSION = 2;

class StorageService {
  private dbPromise: Promise<IDBPDatabase<ChessAppDB>> | null = null;

  private async getDB(): Promise<IDBPDatabase<ChessAppDB>> {
    if (!this.dbPromise) {
      this.dbPromise = openDB<ChessAppDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
          // Games Store
          if (!db.objectStoreNames.contains('games')) {
            const gameStore = db.createObjectStore('games', { keyPath: 'id' });
            gameStore.createIndex('by-date', 'date');
            gameStore.createIndex('by-platform', 'platform');
            gameStore.createIndex('by-white', 'white');
            gameStore.createIndex('by-black', 'black');
          }

          // Analysis Results Store
          if (!db.objectStoreNames.contains('analysisResults')) {
            const analysisStore = db.createObjectStore('analysisResults', { keyPath: 'gameId' });
            analysisStore.createIndex('by-date', 'analyzedAt');
          }

          // Player Profiles Store
          if (!db.objectStoreNames.contains('playerProfiles')) {
            db.createObjectStore('playerProfiles', { keyPath: 'username' });
          }

          // Settings Store
          if (!db.objectStoreNames.contains('settings')) {
            db.createObjectStore('settings');
          }

          // Version 2 stores: Sessions & Benchmarks
          if (oldVersion < 2) {
            if (!db.objectStoreNames.contains('sessions')) {
              const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
              sessionStore.createIndex('by-date', 'createdAt');
              sessionStore.createIndex('by-status', 'status');
            }

            if (!db.objectStoreNames.contains('benchmarks')) {
              db.createObjectStore('benchmarks', { keyPath: 'date' });
            }
          }
        },
      });
    }
    return this.dbPromise;
  }

  // --- Games CRUD ---

  async saveGame(game: GameMetadata): Promise<void> {
    const db = await this.getDB();
    await db.put('games', game);
  }

  async saveGames(games: GameMetadata[]): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction('games', 'readwrite');
    await Promise.all(games.map((g) => tx.store.put(g)));
    await tx.done;
  }

  async getGame(id: string): Promise<GameMetadata | undefined> {
    const db = await this.getDB();
    return db.get('games', id);
  }

  async getAllGames(): Promise<GameMetadata[]> {
    const db = await this.getDB();
    return db.getAll('games');
  }

  async deleteGame(id: string): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['games', 'analysisResults'], 'readwrite');
    await tx.objectStore('games').delete(id);
    await tx.objectStore('analysisResults').delete(id);
    await tx.done;
  }

  // --- Analysis Results CRUD ---

  async saveAnalysisResult(result: GameAnalysisResult): Promise<void> {
    const db = await this.getDB();
    await db.put('analysisResults', result);
  }

  async getAnalysisResult(gameId: string): Promise<GameAnalysisResult | undefined> {
    const db = await this.getDB();
    return db.get('analysisResults', gameId);
  }

  async getAllAnalysisResults(): Promise<GameAnalysisResult[]> {
    const db = await this.getDB();
    return db.getAll('analysisResults');
  }

  // --- Sessions CRUD ---

  async saveSession(session: AnalysisSession): Promise<void> {
    const db = await this.getDB();
    await db.put('sessions', session);
  }

  async getSession(id: string): Promise<AnalysisSession | undefined> {
    const db = await this.getDB();
    return db.get('sessions', id);
  }

  async getAllSessions(): Promise<AnalysisSession[]> {
    const db = await this.getDB();
    return db.getAll('sessions');
  }

  async deleteSession(id: string): Promise<void> {
    const db = await this.getDB();
    await db.delete('sessions', id);
  }

  // --- Benchmarks CRUD ---

  async saveBenchmark(benchmark: BenchmarkResult): Promise<void> {
    const db = await this.getDB();
    await db.put('benchmarks', benchmark);
  }

  async getLatestBenchmark(): Promise<BenchmarkResult | undefined> {
    const db = await this.getDB();
    const all = await db.getAll('benchmarks');
    if (all.length === 0) return undefined;
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  }

  // --- Settings CRUD ---

  async getSettings(): Promise<EngineSettings> {
    try {
      const db = await this.getDB();
      const settings = await db.get('settings', 'engine_settings');
      return settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  async saveSettings(settings: Partial<EngineSettings>): Promise<void> {
    const db = await this.getDB();
    const current = await this.getSettings();
    await db.put('settings', { ...current, ...settings }, 'engine_settings');
  }

  // --- Data Export & Import ---

  async exportAllData(): Promise<string> {
    const games = await this.getAllGames();
    const results = await this.getAllAnalysisResults();
    const sessions = await this.getAllSessions();
    const settings = await this.getSettings();

    const data = {
      version: 2,
      exportedAt: new Date().toISOString(),
      games,
      analysisResults: results,
      sessions,
      settings,
    };

    return JSON.stringify(data, null, 2);
  }

  async importData(jsonString: string): Promise<{ gamesImported: number; resultsImported: number }> {
    const data = JSON.parse(jsonString);
    if (!data || !Array.isArray(data.games)) {
      throw new Error('Invalid backup file format: missing games list');
    }

    if (data.games.length > 0) {
      await this.saveGames(data.games);
    }

    let resultsImported = 0;
    if (Array.isArray(data.analysisResults)) {
      const db = await this.getDB();
      const tx = db.transaction('analysisResults', 'readwrite');
      for (const res of data.analysisResults) {
        await tx.store.put(res);
        resultsImported++;
      }
      await tx.done;
    }

    if (Array.isArray(data.sessions)) {
      const db = await this.getDB();
      const tx = db.transaction('sessions', 'readwrite');
      for (const s of data.sessions) {
        await tx.store.put(s);
      }
      await tx.done;
    }

    return {
      gamesImported: data.games.length,
      resultsImported,
    };
  }

  async clearAllGames(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['games', 'analysisResults'], 'readwrite');
    await tx.objectStore('games').clear();
    await tx.objectStore('analysisResults').clear();
    await tx.done;
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['games', 'analysisResults', 'playerProfiles', 'sessions', 'benchmarks'], 'readwrite');
    await tx.objectStore('games').clear();
    await tx.objectStore('analysisResults').clear();
    await tx.objectStore('playerProfiles').clear();
    await tx.objectStore('sessions').clear();
    await tx.objectStore('benchmarks').clear();
    await tx.done;
  }
}

export const storageService = new StorageService();
