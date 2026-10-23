import { PositionEvaluation, EngineTelemetry, BenchmarkResult } from '../types/chess';
import { UciParser } from './uciParser';

export type EngineStatus = 'uninitialized' | 'initializing' | 'ready' | 'evaluating' | 'error';

export interface EvaluateOptions {
  depth?: number;
  timeLimitMs?: number;
  onTelemetry?: (telemetry: EngineTelemetry) => void;
  signal?: AbortSignal;
}

/**
 * Computes candidate URLs for the Stockfish worker script based on
 * current window location, base URI, and Vite configuration.
 */
export function getWorkerCandidateUrls(
  origin: string = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/',
  baseUri?: string,
  rawBase: string = import.meta.env.BASE_URL || './'
): string[] {
  const baseDir = pathname.replace(/[^/]*$/, ''); // keeps trailing slash

  const candidates: string[] = [];

  // Candidate 1: relative to current base directory (handles subpaths like /Chess-Review/)
  try {
    candidates.push(new URL('engines/stockfish.js', origin + baseDir).href);
  } catch {}

  // Candidate 2: first segment of path (standard GitHub Pages repo path: /<repo-name>/engines/stockfish.js)
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0 && !segments[0].includes('.')) {
    try {
      candidates.push(new URL(`/${segments[0]}/engines/stockfish.js`, origin).href);
    } catch {}
  }

  // Candidate 3: root /engines/stockfish.js
  try {
    candidates.push(new URL('/engines/stockfish.js', origin).href);
  } catch {}

  // Candidate 4: baseUri if available
  if (baseUri) {
    try {
      const docBaseDir = baseUri.split(/[?#]/)[0].replace(/[^/]*$/, '');
      candidates.push(new URL('engines/stockfish.js', docBaseDir).href);
    } catch {}
  }

  // Candidate 5: Vite BASE_URL if explicitly configured and not default './' or '/'
  if (rawBase && rawBase !== './' && rawBase !== '/') {
    try {
      const cleanBase = rawBase.startsWith('/') ? rawBase : '/' + rawBase;
      const finalBase = cleanBase.endsWith('/') ? cleanBase : cleanBase + '/';
      candidates.push(new URL(`${finalBase}engines/stockfish.js`, origin).href);
    } catch {}
  }

  return Array.from(new Set(candidates));
}

export class EngineClient {
  private worker: Worker | null = null;
  private workerBlobUrl: string | null = null;
  private resolvedWorkerUrl: string | null = null;
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

  public getResolvedWorkerUrl(): string | null {
    return this.resolvedWorkerUrl;
  }

  /**
   * Discovers and instantiates the Stockfish Worker using candidate URL probing
   * and Blob URL creation for 100% reliable cross-environment loading.
   */
  private async createWorker(): Promise<{ worker: Worker; workerUrl: string; blobUrl?: string }> {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      throw new Error('Web Workers are not available in this environment.');
    }

    const docBase = typeof document !== 'undefined' ? document.baseURI : undefined;
    const uniqueCandidates = getWorkerCandidateUrls(
      window.location.origin,
      window.location.pathname,
      docBase,
      import.meta.env.BASE_URL
    );

    let lastProbeError = '';

    // Probe candidates with fetch to find the script and create a reliable Blob worker
    for (const candidateUrl of uniqueCandidates) {
      try {
        const resp = await fetch(candidateUrl);
        if (!resp.ok) {
          lastProbeError = `HTTP ${resp.status} ${resp.statusText} from ${candidateUrl}`;
          continue;
        }

        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          lastProbeError = `Received text/html instead of javascript from ${candidateUrl}`;
          continue;
        }

        const scriptText = await resp.text();
        if (
          !scriptText.includes('uci_command') &&
          !scriptText.includes('Stockfish') &&
          !scriptText.includes('Module')
        ) {
          lastProbeError = `File at ${candidateUrl} did not match expected Stockfish engine signature`;
          continue;
        }

        // Script content validated! Create Blob worker for optimal cross-origin / path resilience
        try {
          const blob = new Blob([scriptText], { type: 'application/javascript' });
          const blobUrl = URL.createObjectURL(blob);
          const worker = new Worker(blobUrl);
          return { worker, workerUrl: candidateUrl, blobUrl };
        } catch (blobErr) {
          console.warn('Blob worker creation failed, falling back to direct URL worker:', blobErr);
          const worker = new Worker(candidateUrl);
          return { worker, workerUrl: candidateUrl };
        }
      } catch (fetchErr: any) {
        lastProbeError = `Fetch failed for ${candidateUrl}: ${fetchErr?.message || fetchErr}`;
      }
    }

    // Direct fallback if all fetch requests failed (e.g. strict CORS or offline with cached assets)
    const fallbackUrl = uniqueCandidates[0] || new URL('engines/stockfish.js', window.location.href).href;
    try {
      const worker = new Worker(fallbackUrl);
      return { worker, workerUrl: fallbackUrl };
    } catch (directErr: any) {
      throw new Error(
        `Failed to initialize Stockfish worker. Probed: ${uniqueCandidates.join(', ')}. Details: ${lastProbeError || directErr?.message || directErr}`
      );
    }
  }

  /**
   * Initializes the Stockfish Web Worker and executes the UCI handshake.
   */
  public async init(): Promise<void> {
    if (this.status === 'ready') return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      this.status = 'initializing';
      this.lastError = null;

      let workerRef: Worker | null = null;
      let targetUrl = '';

      try {
        const { worker, workerUrl, blobUrl } = await this.createWorker();
        workerRef = worker;
        this.worker = worker;
        this.resolvedWorkerUrl = workerUrl;
        targetUrl = workerUrl;
        if (blobUrl) {
          this.workerBlobUrl = blobUrl;
        }
      } catch (err: any) {
        const msg = err.message || `Failed to create Stockfish Worker: ${err}`;
        this.status = 'error';
        this.lastError = msg;
        this.initPromise = null;
        throw new Error(msg);
      }

      await new Promise<void>((resolve, reject) => {
        let uciOkReceived = false;

        const timeout = setTimeout(() => {
          if (!uciOkReceived) {
            const err = new Error(
              `Stockfish engine initialization timed out. Failed to receive uciok from ${targetUrl}`
            );
            this.status = 'error';
            this.lastError = err.message;
            this.initPromise = null;
            this.destroy();
            reject(err);
          }
        }, 10000);

        workerRef!.onmessage = (e: MessageEvent) => {
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

        workerRef!.onerror = (err: ErrorEvent) => {
          clearTimeout(timeout);
          console.error('[ENGINE ONERROR]', err);
          const detail = err.message ? `: ${err.message}` : '';
          const msg = `Stockfish Worker encountered an error${detail} (loaded from ${targetUrl})`;
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
          this.destroy();
          reject(new Error(msg));
        };

        // Send initial UCI handshake
        workerRef!.postMessage('uci');
      });
    })();

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
  public async waitUntilReady(timeoutMs: number = 3000): Promise<void> {
    if (!this.worker || this.status === 'error') return;
    return new Promise<void>((resolve) => {
      let resolved = false;
      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          this.readyResolve = null;
          resolve();
        }
      }, timeoutMs);

      this.readyResolve = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve();
        }
      };
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

      // Clear timer on complete or reject
      const origResolve = this.currentResolve;
      this.currentResolve = (result) => {
        clearTimeout(timer);
        origResolve?.(result);
      };

      const origReject = this.currentReject;
      this.currentReject = (err) => {
        clearTimeout(timer);
        origReject?.(err);
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
   * Destroys worker instance and releases allocated blob resources.
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
    }
    if (this.workerBlobUrl) {
      try {
        URL.revokeObjectURL(this.workerBlobUrl);
      } catch {}
      this.workerBlobUrl = null;
    }
    this.status = 'uninitialized';
    this.initPromise = null;
    this.isEvaluating = false;
    this.currentResolve = null;
    this.currentReject = null;
    this.currentTelemetryCallback = null;
  }
}

// Export singleton instance for reuse across pages
export const engineClient = new EngineClient();

if (typeof window !== 'undefined') {
  (window as any).engineClient = engineClient;
}
