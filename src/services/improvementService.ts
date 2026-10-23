import { GameAnalysisResult, GameMetadata } from '../types/chess';
import { analyzeOpening } from '../chess/openings';

export interface PracticePosition {
  id: string;
  ply: number;
  moveNumber: number;
  turn: 'w' | 'b';
  playerColor: 'white' | 'black';
  fenBefore: string;
  playedSan: string;
  bestMoveSan: string;
  bestMoveUci: string;
  classification: string;
  centipawnLoss: number;
  explanation: string;
  tacticalTheme?: string;
}

export interface PersonalizedImprovementPlan {
  playerFocus: string;
  playerColor: 'white' | 'black';
  overallAccuracy: number;
  strengths: string[];
  weaknesses: string[];
  priorityActions: string[];
  openingAdvice?: {
    openingName: string;
    eco: string;
    deviationNote: string;
    recommendedMove: string;
  };
  practicePositions: PracticePosition[];
}

export class ImprovementService {
  /**
   * Generates a personalized improvement plan and interactive practice positions
   * from a completed game analysis.
   */
  static generatePlan(
    game: GameMetadata,
    analysis: GameAnalysisResult,
    targetPlayer?: string
  ): PersonalizedImprovementPlan {
    const isWhite =
      !targetPlayer ||
      game.white.toLowerCase().includes(targetPlayer.toLowerCase()) ||
      targetPlayer.toLowerCase().includes(game.white.toLowerCase());

    const focusColor: 'w' | 'b' = isWhite ? 'w' : 'b';
    const playerColorStr: 'white' | 'black' = isWhite ? 'white' : 'black';
    const playerName = isWhite ? game.white : game.black;
    const accuracy = isWhite ? analysis.whiteAccuracy : analysis.blackAccuracy;

    // Filter moves for focus player
    const playerMoves = analysis.moves.filter((m) => m.turn === focusColor);
    const mistakes = playerMoves.filter(
      (m) =>
        m.classification === 'blunder' ||
        m.classification === 'mistake' ||
        m.classification === 'missed_win'
    );
    const inaccuracies = playerMoves.filter((m) => m.classification === 'inaccuracy');
    const goodMoves = playerMoves.filter(
      (m) =>
        m.classification === 'brilliant' ||
        m.classification === 'great' ||
        m.classification === 'best'
    );

    // Identify mistakes by phase
    const openingMistakes = mistakes.filter((m) => m.ply <= 20);
    const middlegameMistakes = mistakes.filter((m) => m.ply > 20 && m.ply <= 50);
    const endgameMistakes = mistakes.filter((m) => m.ply > 50);

    const weaknesses: string[] = [];
    const strengths: string[] = [];
    const priorityActions: string[] = [];

    // Strengths analysis
    if (goodMoves.length >= playerMoves.length * 0.6) {
      strengths.push(
        `High consistency: ${Math.round((goodMoves.length / (playerMoves.length || 1)) * 100)}% of your moves were classified as Best, Great, or Brilliant.`
      );
    }
    if (openingMistakes.length === 0 && playerMoves.length >= 10) {
      strengths.push('Clean opening execution: navigated the opening phase without any critical tactical blunders.');
    }
    if (accuracy >= 80) {
      strengths.push(`Strong overall precision: achieved an impressive ${accuracy}% accuracy rating.`);
    } else if (mistakes.length <= 1) {
      strengths.push('Solid defensive resilience: conceded very few major tactical inaccuracies.');
    }

    if (strengths.length === 0) {
      strengths.push('Good fighting spirit: remained active and contested critical squares.');
      strengths.push('Solid basic opening setup and king safety awareness.');
    }

    // Weaknesses analysis
    if (openingMistakes.length > 0) {
      weaknesses.push(
        `Early phase vulnerability: committed ${openingMistakes.length} significant mistake(s) before move 10, granting early positional initiative.`
      );
      priorityActions.push('Review opening theoretical continuations to prevent early tactical concessions.');
    }

    if (middlegameMistakes.length > 0) {
      weaknesses.push(
        `Middlegame tactical sharpness: suffered ${middlegameMistakes.length} blunder(s) or tactical oversight(s) during complex middlegame piece tension.`
      );
      priorityActions.push('Practice intermediate calculation and look for opponent checks, captures, and threats before finalizing moves.');
    }

    if (endgameMistakes.length > 0) {
      weaknesses.push(
        `Endgame precision: conceded ${endgameMistakes.length} mistake(s) in the endgame where king activity and pawn promotion technique were paramount.`
      );
      priorityActions.push('Study key rook and pawn endgame principles, focusing on king centralization and opposition.');
    }

    if (inaccuracies.length >= 4) {
      weaknesses.push(
        `Positional drifting: accumulated ${inaccuracies.length} inaccuracies that gradually diminished your position.`
      );
      priorityActions.push('Formulate proactive piece improvement plans instead of passive defensive waiting moves.');
    }

    if (weaknesses.length === 0) {
      weaknesses.push('Minor calculation imprecision: small tactical optimizations could further elevate winning chances.');
      priorityActions.push('Keep practicing high-depth tactical motifs and conversion of winning advantages.');
    }

    // Opening analysis
    const movesSan = analysis.moves.map((m) => m.san);
    const openingInfo = analyzeOpening(movesSan);
    let openingAdvice: PersonalizedImprovementPlan['openingAdvice'];

    if (openingInfo) {
      let deviationNote = 'Followed standard theoretical opening lines.';
      let recMove = '';

      if (openingInfo.deviation) {
        deviationNote = `Deviated on move ${Math.ceil(openingInfo.deviation.ply / 2)} with ${openingInfo.deviation.playedMove}. Theoretical standard: ${openingInfo.deviation.theoreticalMove}.`;
        recMove = openingInfo.deviation.theoreticalMove;
      } else if (openingInfo.candidateContinuations.length > 0) {
        recMove = openingInfo.candidateContinuations[0].move;
        deviationNote = `Standard theory recommends ${recMove} (${openingInfo.candidateContinuations[0].openingName}).`;
      }

      openingAdvice = {
        openingName: openingInfo.opening.name,
        eco: openingInfo.opening.eco,
        deviationNote,
        recommendedMove: recMove,
      };
    }

    // Practice positions from actual mistakes
    const practicePositions: PracticePosition[] = mistakes.map((m, idx) => {
      const moveNum = Math.floor((m.ply - 1) / 2) + 1;
      let theme = 'Tactical Oversight';
      if (m.centipawnLoss >= 300) theme = 'Severe Piece Blunder';
      else if (m.classification === 'missed_win') theme = 'Missed Winning Opportunity';
      else if (m.ply <= 20) theme = 'Opening Inaccuracy';

      return {
        id: `practice_${m.ply}_${idx}`,
        ply: m.ply,
        moveNumber: moveNum,
        turn: m.turn,
        playerColor: playerColorStr,
        fenBefore: m.fenBefore,
        playedSan: m.san,
        bestMoveSan: m.bestMoveSan || m.bestMove,
        bestMoveUci: m.bestMove,
        classification: m.classification,
        centipawnLoss: m.centipawnLoss,
        explanation: m.commentary,
        tacticalTheme: theme,
      };
    });

    return {
      playerFocus: playerName,
      playerColor: playerColorStr,
      overallAccuracy: accuracy,
      strengths: strengths.slice(0, 3),
      weaknesses: weaknesses.slice(0, 3),
      priorityActions: priorityActions.slice(0, 3),
      openingAdvice,
      practicePositions,
    };
  }
}
