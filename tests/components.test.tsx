import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChessBoard } from '../src/components/ChessBoard/ChessBoard';
import { EvaluationBar } from '../src/components/EvaluationBar/EvaluationBar';
import { AccuracyCard } from '../src/components/AccuracyCard/AccuracyCard';
import { GameAnalysisResult } from '../src/types/chess';

describe('UI Components', () => {
  it('renders ChessBoard with starting position', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    render(<ChessBoard fen={fen} orientation="white" />);
    // Board should render 8 ranks and files
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('h')).toBeInTheDocument();
  });

  it('renders EvaluationBar with numeric score', () => {
    render(<EvaluationBar score={{ type: 'cp', value: 150 }} />);
    expect(screen.getByText('+1.5')).toBeInTheDocument();
  });

  it('renders EvaluationBar for mate scores', () => {
    render(<EvaluationBar score={{ type: 'mate', value: 2 }} />);
    expect(screen.getByText('M2')).toBeInTheDocument();
  });

  it('renders AccuracyCard with player accuracies', () => {
    const mockResult: GameAnalysisResult = {
      gameId: 'test_123',
      analyzedAt: '2023-10-20',
      engineVersion: 'Stockfish WASM',
      targetDepth: 12,
      whiteAccuracy: 88.4,
      blackAccuracy: 76.1,
      whiteAcpl: 24,
      blackAcpl: 48,
      moves: [],
      whiteClassifications: { brilliant: 0, great: 0, best: 4, excellent: 2, good: 1, inaccuracy: 1, mistake: 0, blunder: 0, missed_win: 0, forced: 0, book: 2 },
      blackClassifications: { brilliant: 0, great: 0, best: 2, excellent: 1, good: 2, inaccuracy: 2, mistake: 1, blunder: 1, missed_win: 0, forced: 0, book: 2 },
      totalPlies: 20,
    };

    render(
      <AccuracyCard
        result={mockResult}
        whitePlayer="Grandmaster White"
        blackPlayer="Grandmaster Black"
      />
    );

    expect(screen.getByText('88.4%')).toBeInTheDocument();
    expect(screen.getByText('76.1%')).toBeInTheDocument();
    expect(screen.getByText(/Grandmaster White/)).toBeInTheDocument();
    expect(screen.getByText(/Grandmaster Black/)).toBeInTheDocument();
  });
});
