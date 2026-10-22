import { GameMetadata, AnalysisQueueItem, GameAnalysisResult, EngineSettings } from '../types/chess';
import { ReviewPipeline } from './reviewPipeline';
import { storageService, DEFAULT_SETTINGS } from '../storage/indexedDb';

export type QueueListener = (items: AnalysisQueueItem[], isRunning: boolean, isPaused: boolean) => void;

export class AnalysisQueue {
  private items: AnalysisQueueItem[] = [];
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private currentAbortController: AbortController | null = null;
  private listeners: Set<QueueListener> = new Set();
  private sessionStartTime: number = 0;
  private totalPliesAnalyzedInSession: number = 0;
  private totalTimeMsInSession: number = 0;

  constructor() {}

  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener([...this.items], this.isRunning, this.isPaused);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener([...this.items], this.isRunning, this.isPaused));
  }

  public getItems(): AnalysisQueueItem[] {
    return [...this.items];
  }

  public getStatus(): { isRunning: boolean; isPaused: boolean; currentItem?: AnalysisQueueItem; completedCount: number; totalCount: number } {
    const completedCount = this.items.filter((i) => i.status === 'completed').length;
    const currentItem = this.items.find((i) => i.status === 'running');
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      currentItem,
      completedCount,
      totalCount: this.items.length,
    };
  }

  /**
   * Adds games to the queue.
   */
  public addGames(games: GameMetadata[]): void {
    const existingIds = new Set(this.items.map((i) => i.game.id));
    const newItems: AnalysisQueueItem[] = games
      .filter((g) => !existingIds.has(g.id))
      .map((game) => ({
        game,
        status: 'queued',
        progress: 0,
      }));

    this.items.push(...newItems);
    this.notify();
  }

  /**
   * Clears the queue.
   */
  public clear(): void {
    if (this.isRunning) {
      this.cancel();
    }
    this.items = [];
    this.notify();
  }

  /**
   * Starts or resumes processing the queue.
   */
  public async start(settings?: EngineSettings): Promise<void> {
    if (this.isRunning && !this.isPaused) return;

    this.isRunning = true;
    this.isPaused = false;
    this.sessionStartTime = Date.now();
    this.notify();

    const engineSettings = settings || (await storageService.getSettings()) || DEFAULT_SETTINGS;

    while (this.isRunning && !this.isPaused) {
      // Check session time limit
      if (engineSettings.sessionTimeLimitMinutes > 0) {
        const elapsedMinutes = (Date.now() - this.sessionStartTime) / (1000 * 60);
        if (elapsedMinutes >= engineSettings.sessionTimeLimitMinutes) {
          console.info('Session time limit reached. Pausing queue.');
          this.pause();
          break;
        }
      }

      // Find next queued item
      const itemIndex = this.items.findIndex((i) => i.status === 'queued');
      if (itemIndex === -1) {
        // All items finished
        this.isRunning = false;
        this.notify();
        break;
      }

      const item = this.items[itemIndex];
      item.status = 'running';
      item.startedAt = Date.now();
      item.progress = 0;
      this.notify();

      // Check if already analyzed in IndexedDB
      const cached = await storageService.getAnalysisResult(item.game.id);
      if (cached && cached.targetDepth >= engineSettings.depth) {
        item.status = 'completed';
        item.progress = 100;
        item.result = cached;
        item.finishedAt = Date.now();
        this.notify();
        continue;
      }

      this.currentAbortController = new AbortController();

      try {
        const startPlyTime = Date.now();
        const result: GameAnalysisResult = await ReviewPipeline.analyzeGame(item.game, {
          depth: engineSettings.depth,
          movetimeMs: engineSettings.movetimeMs,
          signal: this.currentAbortController.signal,
          onProgress: (currentPly, totalPlies) => {
            item.currentPly = currentPly;
            item.totalPlies = totalPlies;
            item.progress = Math.round((currentPly / totalPlies) * 100);
            this.notify();
          },
        });

        // Save result incrementally to IndexedDB
        await storageService.saveAnalysisResult(result);

        const duration = Date.now() - startPlyTime;
        this.totalPliesAnalyzedInSession += result.totalPlies;
        this.totalTimeMsInSession += duration;

        item.status = 'completed';
        item.progress = 100;
        item.result = result;
        item.finishedAt = Date.now();
        this.notify();
      } catch (err: any) {
        if (err.name === 'AbortError' || this.isPaused) {
          item.status = 'paused';
        } else {
          console.error(`Failed to analyze game ${item.game.id}:`, err);
          item.status = 'failed';
          item.error = err.message || 'Analysis error';
        }
        this.notify();
      } finally {
        this.currentAbortController = null;
      }
    }

    if (!this.isPaused) {
      this.isRunning = false;
    }
    this.notify();
  }

  /**
   * Pauses the active analysis queue.
   */
  public pause(): void {
    if (!this.isRunning) return;
    this.isPaused = true;
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }
    this.notify();
  }

  /**
   * Resumes the paused analysis queue.
   */
  public resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.start();
    }
  }

  /**
   * Cancels the active queue and marks running/queued items as cancelled.
   */
  public cancel(): void {
    this.isRunning = false;
    this.isPaused = false;
    if (this.currentAbortController) {
      this.currentAbortController.abort();
    }

    this.items.forEach((item) => {
      if (item.status === 'running' || item.status === 'queued') {
        item.status = 'cancelled';
      }
    });

    this.notify();
  }

  /**
   * Retries all failed or cancelled items.
   */
  public retryFailed(): void {
    this.items.forEach((item) => {
      if (item.status === 'failed' || item.status === 'cancelled') {
        item.status = 'queued';
        item.error = undefined;
        item.progress = 0;
      }
    });
    this.notify();
    this.start();
  }

  /**
   * Estimates remaining time in seconds based on plies left and average time per ply.
   */
  public getEstimatedRemainingSeconds(): number {
    const uncompletedItems = this.items.filter((i) => i.status === 'queued' || i.status === 'running');
    if (uncompletedItems.length === 0) return 0;

    let remainingPlies = 0;
    uncompletedItems.forEach((i) => {
      const total = i.totalPlies || i.game.plyCount || 60;
      const current = i.currentPly || 0;
      remainingPlies += Math.max(0, total - current);
    });

    const msPerPly =
      this.totalPliesAnalyzedInSession > 0
        ? this.totalTimeMsInSession / this.totalPliesAnalyzedInSession
        : 120; // default initial estimate ~120ms/ply

    return Math.round((remainingPlies * msPerPly) / 1000);
  }
}

export const analysisQueue = new AnalysisQueue();
