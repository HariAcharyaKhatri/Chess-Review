import { PositionEvaluation, EngineTelemetry, BenchmarkResult } from '../types/chess';
import { UciParser } from './uciParser';

export type EngineStatus = 'uninitialized' | 'initializing' | 'ready' | 'evaluating' | 'error';

export interface EvaluateOptions {
  depth?: number;
  timeLimitMs?: number;
  onTelemetry?: (telemetry: EngineTelemetry) => void;
  signal?: AbortSignal;
}

export class EngineClient {
  private worker: Worker | null = null;
  private status: EngineStatus = 'uninitialized';
  private currentResolve: ((evalResult: PositionEvaluation) => void) | null = null;
  private currentReject: ((err: Error) => void) | null = null;
  private currentTelemetryCallback: ((telemetry: EngineTelemetry) => void) | null = null;
  private latestEvaluation: PositionEvaluation | null = null;
  private isEvaluating = false;
  private initPromise: Promise<void> | null = null;
  private lastError: string | null = null;
  private engineVersionString: string = 'Stockfish WASM';

  // Ready listener for sequential command synchronization
  private readyResolve: (() => void) | null = null;

  constructor() {}

  public getStatus(): EngineStatus {
    return this.status;
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getVersion(): string {
    return this.engineVersionString;
  }

  /**
   * Initializes the Stockfish Web Worker and executes the UCI handshake.
   */
  public async init(): Promise<void> {
    if (this.status === 'ready') return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve, reject) => {
      this.status = 'initializing';
      this.lastError = null;

      if (typeof window === 'undefined' || typeof Worker === 'undefined') {
        const msg = 'Web Workers are not available in this environment.';
        this.status = 'error';
        this.lastError = msg;
        reject(new Error(msg));
        return;
      }

      try {
        const origin = window.location.origin;
        let basePath = import.meta.env.BASE_URL || '/';
        if (basePath === './') basePath = '/';
        if (!basePath.startsWith('/')) basePath = '/' + basePath;
        if (!basePath.endsWith('/')) basePath = basePath + '/';

        // Load the battle-tested Stockfish engine worker script
        const workerUrl = new URL(`${basePath}engines/stockfish.js`, origin).href;

        this.worker = new Worker(workerUrl);

        let uciOkReceived = false;

        const timeout = setTimeout(() => {
          if (!uciOkReceived) {
            const err = new Error('Stockfish engine initialization timed out. Failed to receive uciok.');
            this.status = 'error';
            this.lastError = err.message;
            this.initPromise = null;
            this.destroy();
            reject(err);
          }
        }, 10000);

        this.worker.onmessage = (e: MessageEvent) => {
          const line = typeof e.data === 'string' ? e.data.trim() : '';

          if (line.startsWith('id name ')) {
            this.engineVersionString = line.replace('id name ', '').trim();
          }

          if (line === 'uciok') {
            uciOkReceived = true;
            this.worker?.postMessage('isready');
          } else if (line === 'readyok') {
            clearTimeout(timeout);
            this.status = 'ready';
            if (this.readyResolve) {
              const res = this.readyResolve;
              this.readyResolve = null;
              res();
            }
            resolve();
          } else {
            this.handleEngineLine(line);
          }
        };

        this.worker.onerror = (err) => {
          clearTimeout(timeout);
          console.error('[ENGINE ONERROR]', err);
          const msg = `Stockfish Worker encountered an error: ${err.message || 'Worker script failed to load'}`;
          console.error(msg, err);
          this.status = 'error';
          this.lastError = msg;
          this.initPromise = null;
          if (this.currentReject) {
            const rejectFn = this.currentReject;
            this.currentReject = null;
            this.currentResolve = null;
            rejectFn(new Error(msg));
          }
          reject(new Error(msg));
        };

        // Send initial UCI handshake
        this.worker.postMessage('uci');
      } catch (err: any) {
        const msg = `Failed to create Stockfish Worker: ${err.message || err}`;
        this.status = 'error';
        this.lastError = msg;
        this.initPromise = null;
        reject(new Error(msg));
      }
    });

    return this.initPromise;
  }

  private handleEngineLine(line: string) {
    if (line.startsWith('info ')) {
      const parsed = UciParser.parseInfoLine(line);
      if (parsed && parsed.score) {
        this.latestEvaluation = {
          score: parsed.score,
          depth: parsed.depth || 1,
          seldepth: parsed.seldepth,
          bestMove: parsed.bestMove || (this.latestEvaluation ? this.latestEvaluation.bestMove : ''),
          pv: parsed.pv || [],
          nodes: parsed.nodes,
          nps: parsed.nps,
          timeMs: parsed.timeMs,
          currmove: parsed.currmove,
          currmovenumber: parsed.currmovenumber,
          hashfull: parsed.hashfull,
        };

        const telemetry = UciParser.parseTelemetry(line);
        if (telemetry && this.currentTelemetryCallback) {
          this.currentTelemetryCallback(telemetry);
        }
      }
    } else if (line.startsWith('bestmove ')) {
      const parsed = UciParser.parseBestMove(line);
      if (parsed) {
        const finalEval: PositionEvaluation = this.latestEvaluation || {
          score: { type: 'cp', value: 0 },
          depth: 1,
          bestMove: parsed.bestMove,
          pv: [parsed.bestMove],
        };

        finalEval.bestMove = parsed.bestMove;
        this.isEvaluating = false;
        this.status = 'ready';
        this.currentTelemetryCallback = null;

        if (this.currentResolve) {
          const resolve = this.currentResolve;
          this.currentResolve = null;
          this.currentReject = null;
          resolve(finalEval);
        }
      }
    }
  }

  /**
   * Waits for the engine to confirm it is idle and ready for the next task.
   */
  public async waitUntilReady(): Promise<void> {
    if (!this.worker) return;
    return new Promise<void>((resolve) => {
      this.readyResolve = resolve;
      this.worker?.postMessage('isready');
    });
  }

  /**
   * Evaluates a chess position given its FEN and options.
   * Emits live telemetry during the search.
   */
  public async evaluatePosition(
    fen: string,
    optionsOrDepth: EvaluateOptions | number = 12,
    legacyTimeLimitMs: number = 3000,
    legacySignal?: AbortSignal
  ): Promise<PositionEvaluation> {
    await this.init();

    if (!this.worker || this.status === 'error') {
      throw new Error(`Stockfish engine is unavailable: ${this.lastError || 'Engine not initialized'}`);
    }

    let depth = 12;
    let timeLimitMs = 3000;
    let onTelemetry: ((t: EngineTelemetry) => void) | undefined;
    let signal: AbortSignal | undefined;

    if (typeof optionsOrDepth === 'number') {
      depth = optionsOrDepth;
      timeLimitMs = legacyTimeLimitMs;
      signal = legacySignal;
    } else {
      depth = optionsOrDepth.depth || 12;
      timeLimitMs = optionsOrDepth.timeLimitMs || 3000;
      onTelemetry = optionsOrDepth.onTelemetry;
      signal = optionsOrDepth.signal;
    }

    // If already evaluating, stop previous search safely before starting new one
    if (this.isEvaluating) {
      await this.stopAndWait();
    }

    return new Promise<PositionEvaluation>((resolve, reject) => {
      this.isEvaluating = true;
      this.status = 'evaluating';
      this.latestEvaluation = null;
      this.currentResolve = resolve;
      this.currentReject = reject;
      this.currentTelemetryCallback = onTelemetry || null;

      // Handle abort signal
      if (signal) {
        if (signal.aborted) {
          this.stop();
          reject(new DOMException('Evaluation aborted', 'AbortError'));
          return;
        }
        signal.addEventListener('abort', () => {
          this.stop();
          reject(new DOMException('Evaluation aborted', 'AbortError'));
        });
      }

      // Safety timeout
      const timer = setTimeout(() => {
        if (this.isEvaluating) {
          this.stop();
          if (this.latestEvaluation) {
            resolve(this.latestEvaluation);
          } else {
            reject(new Error('Search timed out before receiving engine evaluation.'));
          }
        }
      }, timeLimitMs + 3000);

      this.worker?.postMessage(`position fen ${fen}`);
      this.worker?.postMessage(`go depth ${depth} movetime ${timeLimitMs}`);

      // Clear timer on complete
      const origResolve = this.currentResolve;
      this.currentResolve = (result) => {
        clearTimeout(timer);
        origResolve?.(result);
      };
    });
  }

  /**
   * Stops the current search.
   */
  public stop(): void {
    if (this.worker && this.isEvaluating) {
      this.worker.postMessage('stop');
      this.isEvaluating = false;
      this.status = 'ready';
      this.currentTelemetryCallback = null;
    }
  }

  /**
   * Stops search and waits until the engine confirms readyok.
   */
  public async stopAndWait(): Promise<void> {
    this.stop();
    await this.waitUntilReady();
  }

  /**
   * Benchmarks the local Stockfish WASM engine using standard positions.
   * Measures actual elapsed time, total nodes searched, and real measured NPS.
   */
  public async runBenchmark(
    targetDepth: number = 10,
    positions: string[] = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 5',
      'r1b1k2r/ppppqppp/2n5/4P3/2B5/1Q3N2/PB1b1PPP/R4RK1 b kq - 1 11',
    ]
  ): Promise<BenchmarkResult> {
    await this.init();

    let totalNodes = 0;
    const startTime = performance.now();

    for (const fen of positions) {
      const res = await this.evaluatePosition(fen, {
        depth: targetDepth,
        timeLimitMs: 8000,
      });
      totalNodes += res.nodes || 0;
    }

    const elapsedMs = Math.round(performance.now() - startTime);
    const measuredNps = elapsedMs > 0 ? Math.round((totalNodes / elapsedMs) * 1000) : 0;

    return {
      date: new Date().toISOString(),
      positionsAnalyzed: positions.length,
      totalNodes,
      elapsedMs,
      measuredNps,
      depth: targetDepth,
      deviceCores: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
      deviceMemoryGb: typeof navigator !== 'undefined' ? (navigator as any).deviceMemory : undefined,
    };
  }

  /**
   * Destroys worker instance.
   */
  public destroy(): void {
    if (this.worker) {
      try {
        this.worker.postMessage('quit');
      } catch {
        // Ignore if already terminated
      }
      this.worker.terminate();
      this.worker = null;
      this.status = 'uninitialized';
      this.initPromise = null;
      this.isEvaluating = false;
      this.currentResolve = null;
      this.currentReject = null;
      this.currentTelemetryCallback = null;
    }
  }
}

// Export singleton instance for reuse across pages
export const engineClient = new EngineClient();
