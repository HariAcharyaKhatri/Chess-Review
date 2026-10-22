import { PositionEvaluation } from '../types/chess';
import { UciParser } from './uciParser';
import { Chess } from 'chess.js';

export type EngineStatus = 'uninitialized' | 'initializing' | 'ready' | 'evaluating' | 'error';

export interface EngineClientOptions {
  depth?: number;
  threads?: number;
  hashMb?: number;
}

export class EngineClient {
  private worker: Worker | null = null;
  private status: EngineStatus = 'uninitialized';
  private currentResolve: ((evalResult: PositionEvaluation) => void) | null = null;
  private latestEvaluation: PositionEvaluation | null = null;
  private isEvaluating = false;
  private initPromise: Promise<void> | null = null;
  private isFallbackMode = false;

  constructor() {}

  public getStatus(): EngineStatus {
    return this.status;
  }

  public isUsingFallback(): boolean {
    return this.isFallbackMode;
  }

  /**
   * Initializes the Stockfish Web Worker and executes the UCI handshake.
   */
  public async init(): Promise<void> {
    if (this.status === 'ready') return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise<void>((resolve) => {
      this.status = 'initializing';

      // Check if Worker API is available
      if (typeof window === 'undefined' || typeof Worker === 'undefined') {
        console.warn('Web Workers not available in this environment. Falling back to heuristic engine.');
        this.isFallbackMode = true;
        this.status = 'ready';
        resolve();
        return;
      }

      try {
        const baseUrl = import.meta.env.BASE_URL || './';
        // Normalize trailing slash
        const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        const wasmSupported = typeof WebAssembly === 'object' && typeof WebAssembly.validate === 'function';
        const engineScript = wasmSupported ? 'engines/stockfish.wasm.js' : 'engines/stockfish.js';
        const workerUrl = new URL(`${normalizedBase}${engineScript}`, window.location.href).href;

        this.worker = new Worker(workerUrl);

        let uciOkReceived = false;

        const timeout = setTimeout(() => {
          if (!uciOkReceived) {
            console.warn('Stockfish engine initialization timed out. Using heuristic evaluation fallback.');
            this.isFallbackMode = true;
            this.status = 'ready';
            resolve();
          }
        }, 5000);

        this.worker.onmessage = (e: MessageEvent) => {
          const line = typeof e.data === 'string' ? e.data.trim() : '';

          if (line === 'uciok') {
            uciOkReceived = true;
            this.worker?.postMessage('setoption name Threads value 1');
            this.worker?.postMessage('setoption name Hash value 32');
            this.worker?.postMessage('isready');
          } else if (line === 'readyok') {
            clearTimeout(timeout);
            this.status = 'ready';
            resolve();
          } else {
            this.handleEngineLine(line);
          }
        };

        this.worker.onerror = (err) => {
          console.warn('Stockfish Worker failed to start:', err);
          clearTimeout(timeout);
          this.isFallbackMode = true;
          this.status = 'ready';
          resolve(); // Fallback ready
        };

        // Send initial UCI handshake
        this.worker.postMessage('uci');
      } catch (err) {
        console.warn('Error creating Stockfish worker:', err);
        this.isFallbackMode = true;
        this.status = 'ready';
        resolve();
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
          bestMove: parsed.bestMove || (this.latestEvaluation ? this.latestEvaluation.bestMove : ''),
          pv: parsed.pv || [],
          nodes: parsed.nodes,
          timeMs: parsed.timeMs,
        };
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

        if (this.currentResolve) {
          const resolve = this.currentResolve;
          this.currentResolve = null;
          resolve(finalEval);
        }
      }
    }
  }

  /**
   * Evaluates a chess position given its FEN and desired depth.
   */
  public async evaluatePosition(
    fen: string,
    depth: number = 12,
    timeLimitMs: number = 3000,
    signal?: AbortSignal
  ): Promise<PositionEvaluation> {
    await this.init();

    if (this.isFallbackMode || !this.worker) {
      return this.fallbackEvaluate(fen, depth);
    }

    if (this.isEvaluating) {
      this.stop();
    }

    return new Promise<PositionEvaluation>((resolve, reject) => {
      this.isEvaluating = true;
      this.status = 'evaluating';
      this.latestEvaluation = null;
      this.currentResolve = resolve;

      // Handle abort signal
      if (signal) {
        signal.addEventListener('abort', () => {
          this.stop();
          reject(new DOMException('Evaluation aborted', 'AbortError'));
        });
      }

      // Safety timeout
      const timer = setTimeout(() => {
        if (this.isEvaluating) {
          this.stop();
          // Return what we have or a reasonable evaluation
          resolve(this.latestEvaluation || this.fallbackEvaluate(fen, depth));
        }
      }, timeLimitMs + 1000);

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
    }
  }

  /**
   * Fast, reliable heuristic evaluation fallback for test environments or worker restrictions.
   */
  public fallbackEvaluate(fen: string, depth: number = 8): PositionEvaluation {
    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });

      if (chess.isCheckmate()) {
        const turn = chess.turn();
        return {
          score: { type: 'mate', value: turn === 'w' ? -1 : 1 },
          depth,
          bestMove: '',
          pv: [],
        };
      }

      if (chess.isDraw() || moves.length === 0) {
        return {
          score: { type: 'cp', value: 0 },
          depth,
          bestMove: moves[0] ? `${moves[0].from}${moves[0].to}` : '',
          pv: [],
        };
      }

      // Material piece values
      const pieceValues: Record<string, number> = {
        p: 100,
        n: 320,
        b: 330,
        r: 500,
        q: 900,
        k: 0,
      };

      let materialCp = 0;
      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece) {
            const val = pieceValues[piece.type] || 0;
            // Center control bonus
            const centerBonus = (r >= 3 && r <= 4 && c >= 3 && c <= 4) ? 20 : 0;
            if (piece.color === 'w') {
              materialCp += val + centerBonus;
            } else {
              materialCp -= (val + centerBonus);
            }
          }
        }
      }

      // Find highest value move or capture
      let bestMove = moves[0];
      for (const m of moves) {
        if (m.captured) {
          bestMove = m;
          break;
        }
      }

      const uci = `${bestMove.from}${bestMove.to}${bestMove.promotion || ''}`;

      return {
        score: { type: 'cp', value: materialCp },
        depth,
        bestMove: uci,
        pv: [uci],
      };
    } catch {
      return {
        score: { type: 'cp', value: 0 },
        depth: 1,
        bestMove: '',
        pv: [],
      };
    }
  }

  /**
   * Destroys worker instance.
   */
  public destroy(): void {
    if (this.worker) {
      this.worker.postMessage('quit');
      this.worker.terminate();
      this.worker = null;
      this.status = 'uninitialized';
    }
  }
}

// Export singleton instance for reuse across pages
export const engineClient = new EngineClient();
