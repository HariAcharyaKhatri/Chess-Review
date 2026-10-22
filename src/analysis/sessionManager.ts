import {
  GameMetadata,
  GameAnalysisResult,
  EngineSettings,
  AnalysisSession,
  EngineTelemetry,
} from '../types/chess';
import { ReviewPipeline } from './reviewPipeline';
import { storageService, DEFAULT_SETTINGS } from '../storage/indexedDb';
import { engineClient } from '../engine/engineClient';

export type SessionListener = (session: AnalysisSession) => void;

export class SessionManager {
  private activeSessions = new Map<string, AnalysisSession>();
  private listeners = new Map<string, Set<SessionListener>>();
  private abortControllers = new Map<string, AbortController>();

  constructor() {}

  public subscribe(sessionId: string, listener: SessionListener): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    const set = this.listeners.get(sessionId)!;
    set.add(listener);

    // Initial notification if in-memory
    const existing = this.activeSessions.get(sessionId);
    if (existing) {
      listener({ ...existing });
    } else {
      // Try loading from DB
      storageService.getSession(sessionId).then((s) => {
        if (s) {
          this.activeSessions.set(sessionId, s);
          listener({ ...s });
        }
      });
    }

    return () => {
      set.delete(listener);
    };
  }

  private notify(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    const set = this.listeners.get(sessionId);
    if (set) {
      const cloned = { ...session };
      set.forEach((l) => l(cloned));
    }
  }

  /**
   * Creates a new AnalysisSession and persists it in IndexedDB.
   */
  public async createSession(
    games: GameMetadata[],
    settings: EngineSettings = DEFAULT_SETTINGS,
    title?: string,
    player?: string
  ): Promise<AnalysisSession> {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const platform = games[0]?.platform || 'chesscom';
    const inferredPlayer =
      player ||
      (games.length > 0 ? (games[0].white !== 'Unknown' ? games[0].white : undefined) : undefined);

    const session: AnalysisSession = {
      id,
      title: title || (games.length === 1 ? `Review: ${games[0].white} vs ${games[0].black}` : `Batch Analysis (${games.length} games)`),
      player: inferredPlayer,
      platform,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending',
      settings,
      gameIds: games.map((g) => g.id),
      games,
      completedGameIds: [],
      currentGameIndex: 0,
      currentPly: 0,
      totalPliesInCurrentGame: games[0]?.plyCount || 0,
      completedResults: {},
      gameAccuracies: {},
    };

    this.activeSessions.set(id, session);
    await storageService.saveSession(session);
    this.notify(id);
    return session;
  }

  /**
   * Retrieves a session from memory or IndexedDB.
   */
  public async getSession(sessionId: string): Promise<AnalysisSession | undefined> {
    if (this.activeSessions.has(sessionId)) {
      return this.activeSessions.get(sessionId);
    }
    const fromDb = await storageService.getSession(sessionId);
    if (fromDb) {
      this.activeSessions.set(sessionId, fromDb);
      return fromDb;
    }
    return undefined;
  }

  /**
   * Starts or resumes processing games in the session.
   */
  public async startSession(sessionId: string): Promise<void> {
    let session = await this.getSession(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.status === 'running') return;

    if (engineClient.getStatus() === 'error') {
      engineClient.destroy();
    }

    session.status = 'running';
    session.error = undefined;
    session.updatedAt = new Date().toISOString();
    this.notify(sessionId);
    await storageService.saveSession(session);

    const abortController = new AbortController();
    this.abortControllers.set(sessionId, abortController);

    try {
      const sessionStartTime = Date.now();

      for (let i = 0; i < session.games.length; i++) {
        // Reload fresh reference
        session = this.activeSessions.get(sessionId)!;
        if (!session || session.status !== 'running') break;

        const game = session.games[i];
        session.currentGameIndex = i;
        session.totalPliesInCurrentGame = game.plyCount || 60;
        session.currentPly = 0;
        this.notify(sessionId);

        // Check if already completed
        if (session.completedGameIds.includes(game.id) && session.completedResults[game.id]) {
          continue;
        }

        // Check IndexedDB cache
        const cachedResult = await storageService.getAnalysisResult(game.id);
        if (cachedResult && cachedResult.targetDepth >= session.settings.depth) {
          this.recordGameCompletion(session, game, cachedResult);
          await storageService.saveSession(session);
          this.notify(sessionId);
          continue;
        }

        // Check session time limit
        if (session.settings.sessionTimeLimitMinutes > 0) {
          const elapsedMin = (Date.now() - sessionStartTime) / (1000 * 60);
          if (elapsedMin >= session.settings.sessionTimeLimitMinutes) {
            session.status = 'paused';
            session.updatedAt = new Date().toISOString();
            await storageService.saveSession(session);
            this.notify(sessionId);
            break;
          }
        }

        // Run real review pipeline for this game
        const result = await ReviewPipeline.analyzeGame(game, {
          depth: session.settings.depth,
          movetimeMs: session.settings.movetimeMs,
          signal: abortController.signal,
          onPositionStart: (ply, total, san, turn, fen) => {
            session!.currentPly = ply;
            session!.totalPliesInCurrentGame = total;
            session!.currentMoveSan = san;
            session!.currentTurn = turn;
            session!.currentPositionFen = fen;
            this.notify(sessionId);
          },
          onTelemetry: (telemetry: EngineTelemetry) => {
            session!.telemetry = telemetry;
            this.notify(sessionId);
          },
          onProgress: (ply, total) => {
            session!.currentPly = ply;
            session!.totalPliesInCurrentGame = total;
            this.notify(sessionId);
          },
        });

        // Save result
        await storageService.saveAnalysisResult(result);
        this.recordGameCompletion(session, game, result);
        await storageService.saveSession(session);
        this.notify(sessionId);

        // Check if user requested "Stop After Current Game"
        if (session.stopAfterCurrent) {
          session.status = 'stopped';
          session.stopAfterCurrent = false;
          session.updatedAt = new Date().toISOString();
          await storageService.saveSession(session);
          this.notify(sessionId);
          break;
        }
      }

      session = this.activeSessions.get(sessionId)!;
      if (session && session.status === 'running') {
        session.status = 'completed';
        session.updatedAt = new Date().toISOString();
        await storageService.saveSession(session);
        this.notify(sessionId);
      }
    } catch (err: any) {
      session = this.activeSessions.get(sessionId)!;
      if (!session) return;

      if (err.name === 'AbortError') {
        if (session.status !== 'cancelled' && session.status !== 'stopped') {
          session.status = 'paused';
        }
      } else {
        console.error(`Session ${sessionId} error:`, err);
        session.status = 'error';
        session.error = err.message || 'An error occurred during analysis';
      }
      session.updatedAt = new Date().toISOString();
      await storageService.saveSession(session);
      this.notify(sessionId);
    } finally {
      this.abortControllers.delete(sessionId);
    }
  }

  private recordGameCompletion(session: AnalysisSession, game: GameMetadata, result: GameAnalysisResult) {
    if (!session.completedGameIds.includes(game.id)) {
      session.completedGameIds.push(game.id);
    }
    session.completedResults[game.id] = result;

    // Calculate game accuracy (respecting player role if specified, otherwise game mean)
    let gameAcc: number;
    if (session.player) {
      const pNorm = session.player.trim().toLowerCase();
      if (game.white && game.white.trim().toLowerCase() === pNorm) {
        gameAcc = result.whiteAccuracy;
      } else if (game.black && game.black.trim().toLowerCase() === pNorm) {
        gameAcc = result.blackAccuracy;
      } else {
        gameAcc = Math.round(((result.whiteAccuracy + result.blackAccuracy) / 2) * 10) / 10;
      }
    } else {
      gameAcc = Math.round(((result.whiteAccuracy + result.blackAccuracy) / 2) * 10) / 10;
    }
    session.gameAccuracies[game.id] = gameAcc;

    // Calculate running average strictly across completed games only (arithmetic mean)
    const validAccuracies = session.completedGameIds
      .map((id) => session.gameAccuracies[id])
      .filter((acc): acc is number => typeof acc === 'number' && !isNaN(acc));

    if (validAccuracies.length > 0) {
      const sum = validAccuracies.reduce((a, b) => a + b, 0);
      session.runningAverageAccuracy = Math.round((sum / validAccuracies.length) * 10) / 10;
    }
  }

  /**
   * Pauses the active analysis session after current position.
   */
  public pauseSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    session.status = 'paused';
    session.updatedAt = new Date().toISOString();
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
    }
    engineClient.stop();
    this.notify(sessionId);
    storageService.saveSession(session);
  }

  /**
   * Stops the session gracefully after the current game finishes.
   */
  public stopAfterCurrentGame(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    session.stopAfterCurrent = true;
    this.notify(sessionId);
    storageService.saveSession(session);
  }

  /**
   * Cancels the active position search immediately.
   */
  public cancelCurrentSearch(sessionId: string): void {
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
    }
    engineClient.stop();
  }

  /**
   * Cancels the entire session.
   */
  public cancelSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;
    session.status = 'cancelled';
    session.updatedAt = new Date().toISOString();
    const controller = this.abortControllers.get(sessionId);
    if (controller) {
      controller.abort();
    }
    engineClient.stop();
    this.notify(sessionId);
    storageService.saveSession(session);
  }

  /**
   * Restarts analysis for a specific game in the session.
   */
  public async restartGameInSession(sessionId: string, gameId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) return;

    session.completedGameIds = session.completedGameIds.filter((id) => id !== gameId);
    delete session.completedResults[gameId];
    delete session.gameAccuracies[gameId];

    // Recalculate average
    const validAccuracies = session.completedGameIds
      .map((id) => session.gameAccuracies[id])
      .filter((acc) => typeof acc === 'number' && !isNaN(acc));

    session.runningAverageAccuracy =
      validAccuracies.length > 0
        ? Math.round((validAccuracies.reduce((a, b) => a + b, 0) / validAccuracies.length) * 10) / 10
        : undefined;

    await storageService.saveSession(session);
    this.notify(sessionId);
    this.startSession(sessionId);
  }
}

export const sessionManager = new SessionManager();
