import { GameMetadata, GameAnalysisResult, MoveAnalysis, MoveClassification, EngineTelemetry } from '../types/chess';
import { PgnParser } from '../chess/pgnParser';
import { PositionService } from '../chess/positionService';
import { engineClient } from '../engine/engineClient';
import { AccuracyService } from '../chess/accuracy';
import { ClassificationService } from '../chess/classification';

export interface AnalysisPipelineOptions {
  depth: number;
  movetimeMs?: number;
  onProgress?: (ply: number, totalPlies: number) => void;
  onPositionStart?: (ply: number, totalPlies: number, san: string, turn: 'w' | 'b', fen: string) => void;
  onTelemetry?: (telemetry: EngineTelemetry) => void;
  signal?: AbortSignal;
}

export class ReviewPipeline {
  /**
   * Runs complete game review pipeline on a game.
   */
  static async analyzeGame(
    game: GameMetadata,
    options: AnalysisPipelineOptions
  ): Promise<GameAnalysisResult> {
    const { depth, movetimeMs = 1500, onProgress, onPositionStart, onTelemetry, signal } = options;

    const parsed = PgnParser.parseGame(game.pgn, game.id);
    const moves = parsed.moves;
    const analyzedMoves: MoveAnalysis[] = [];

    const whiteAccuracies: number[] = [];
    const blackAccuracies: number[] = [];
    const whiteCpls: number[] = [];
    const blackCpls: number[] = [];

    const whiteClassifications: Record<MoveClassification, number> = {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      missed_win: 0,
      forced: 0,
      book: 0,
    };

    const blackClassifications: Record<MoveClassification, number> = {
      brilliant: 0,
      great: 0,
      best: 0,
      excellent: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0,
      missed_win: 0,
      forced: 0,
      book: 0,
    };

    // Cache position evaluations to avoid redundant engine searches for repeated FENs
    const evalCache = new Map<string, any>();

    const getEval = async (fen: string) => {
      if (evalCache.has(fen)) return evalCache.get(fen);
      const res = await engineClient.evaluatePosition(fen, {
        depth,
        timeLimitMs: movetimeMs,
        onTelemetry,
        signal,
      });
      evalCache.set(fen, res);
      return res;
    };

    for (let i = 0; i < moves.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Analysis was aborted', 'AbortError');
      }

      const move = moves[i];
      onPositionStart?.(i + 1, moves.length, move.san, move.turn, move.fenBefore);

      const evalBefore = await getEval(move.fenBefore);
      const evalAfter = await getEval(move.fenAfter);

      // Best move SAN
      const bestMoveUci = evalBefore.bestMove || '';
      const bestMoveSan = bestMoveUci
        ? PositionService.uciToSan(move.fenBefore, bestMoveUci) || bestMoveUci
        : '';

      const winProbBefore = AccuracyService.getPlayerWinProbability(evalBefore.score, move.turn);
      const winProbAfter = AccuracyService.getPlayerWinProbability(evalAfter.score, move.turn);
      const cpl = AccuracyService.calculateCentipawnLoss(evalBefore.score, evalAfter.score, move.turn);
      const moveAccuracy = AccuracyService.calculateMoveAccuracy(winProbBefore, winProbAfter);

      const legalMoves = PositionService.getLegalMovesForSquare(
        move.fenBefore,
        move.uci.substring(0, 2) as any
      );

      const isCapture = move.san.includes('x');
      const pieceType = move.uci.length >= 2 ? move.san.match(/^[NBRQK]/)?.[0]?.toLowerCase() : 'p';

      const classificationResult = ClassificationService.classifyMove({
        san: move.san,
        uci: move.uci,
        bestMove: bestMoveUci,
        bestMoveSan,
        turn: move.turn,
        evalBefore: evalBefore.score,
        evalAfter: evalAfter.score,
        centipawnLoss: cpl,
        winProbBefore,
        winProbAfter,
        legalMoveCount: legalMoves.length,
        ply: move.ply,
        isCapture,
        pieceType,
      });

      const moveAnalysis: MoveAnalysis = {
        ply: move.ply,
        turn: move.turn,
        san: move.san,
        uci: move.uci,
        fenBefore: move.fenBefore,
        fenAfter: move.fenAfter,
        evalBefore,
        evalAfter,
        bestMove: bestMoveUci,
        bestMoveSan,
        centipawnLoss: cpl,
        winProbabilityBefore: Math.round(winProbBefore * 10) / 10,
        winProbabilityAfter: Math.round(winProbAfter * 10) / 10,
        accuracy: moveAccuracy,
        classification: classificationResult.classification,
        commentary: classificationResult.commentary,
      };

      analyzedMoves.push(moveAnalysis);

      if (move.turn === 'w') {
        whiteAccuracies.push(moveAccuracy);
        whiteCpls.push(cpl);
        whiteClassifications[classificationResult.classification]++;
      } else {
        blackAccuracies.push(moveAccuracy);
        blackCpls.push(cpl);
        blackClassifications[classificationResult.classification]++;
      }

      onProgress?.(i + 1, moves.length);
    }

    const whiteMetrics = AccuracyService.calculateAggregateMetrics(whiteAccuracies, whiteCpls);
    const blackMetrics = AccuracyService.calculateAggregateMetrics(blackAccuracies, blackCpls);

    return {
      gameId: game.id,
      analyzedAt: new Date().toISOString(),
      engineVersion: engineClient.getVersion(),
      targetDepth: depth,
      whiteAccuracy: whiteMetrics.accuracy,
      blackAccuracy: blackMetrics.accuracy,
      whiteAcpl: whiteMetrics.acpl,
      blackAcpl: blackMetrics.acpl,
      moves: analyzedMoves,
      whiteClassifications,
      blackClassifications,
      totalPlies: analyzedMoves.length,
    };
  }
}
