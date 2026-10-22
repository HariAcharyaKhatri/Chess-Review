export type ChessPlatform = 'chesscom' | 'lichess' | 'pgn_upload' | 'manual';

export type TimeClass = 'bullet' | 'blitz' | 'rapid' | 'classical' | 'daily' | 'unknown';

export type GameResult = '1-0' | '0-1' | '1/2-1/2' | '*';

export interface GameMetadata {
  id: string;
  platform: ChessPlatform;
  url?: string;
  white: string;
  black: string;
  whiteElo?: number;
  blackElo?: number;
  result: GameResult;
  date: string; // ISO date or YYYY.MM.DD
  event?: string;
  site?: string;
  timeControl?: string;
  timeClass: TimeClass;
  eco?: string;
  openingName?: string;
  pgn: string;
  plyCount: number;
}

export type MoveClassification =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
  | 'missed_win'
  | 'forced'
  | 'book';

export interface EngineScore {
  type: 'cp' | 'mate';
  value: number; // centipawns or moves to mate (positive = white advantage)
}

export interface PositionEvaluation {
  score: EngineScore;
  depth: number;
  seldepth?: number;
  bestMove: string; // UCI format e.g. "e2e4"
  bestMoveSan?: string;
  pv: string[]; // Principal variation UCI moves
  pvSan?: string[];
  nodes?: number;
  nps?: number;
  timeMs?: number;
  currmove?: string;
  currmovenumber?: number;
  hashfull?: number;
}

export interface EngineTelemetry {
  depth: number;
  seldepth?: number;
  score: EngineScore;
  nodes: number;
  nps: number;
  timeMs: number;
  pv: string[];
  pvSan?: string[];
  bestMove?: string;
  currmove?: string;
  currmovenumber?: number;
  hashfull?: number;
  rawScoreString: string;
}

export interface MoveAnalysis {
  ply: number;
  turn: 'w' | 'b';
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  evalBefore: PositionEvaluation;
  evalAfter: PositionEvaluation;
  bestMove: string;
  bestMoveSan: string;
  centipawnLoss: number;
  winProbabilityBefore: number; // 0 to 100
  winProbabilityAfter: number;  // 0 to 100
  accuracy: number; // 0 to 100
  classification: MoveClassification;
  commentary: string;
}

export interface GameAnalysisResult {
  gameId: string;
  analyzedAt: string;
  engineVersion: string;
  targetDepth: number;
  whiteAccuracy: number;
  blackAccuracy: number;
  whiteAcpl: number; // Average Centipawn Loss
  blackAcpl: number;
  moves: MoveAnalysis[];
  whiteClassifications: Record<MoveClassification, number>;
  blackClassifications: Record<MoveClassification, number>;
  totalPlies: number;
}

export interface AnalysisQueueItem {
  game: GameMetadata;
  status: 'queued' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  progress: number; // 0 to 100
  currentPly?: number;
  totalPlies?: number;
  error?: string;
  result?: GameAnalysisResult;
  startedAt?: number;
  finishedAt?: number;
}

export type EnginePreset = 'fast' | 'balanced' | 'deep' | 'custom';

export interface EngineSettings {
  preset: EnginePreset;
  depth: number;
  movetimeMs?: number;
  threads: number;
  hashMb: number;
  sessionTimeLimitMinutes: number; // 0 = unlimited
  boardTheme: 'green' | 'blue' | 'brown';
  soundEnabled: boolean;
}

export interface PlayerStats {
  username: string;
  platform: ChessPlatform;
  totalGames: number;
  analyzedGames: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  averageWhiteAccuracy: number;
  averageBlackAccuracy: number;
  averageAccuracy: number;
  averageAcpl: number;
  blundersPerGame: number;
  mistakesPerGame: number;
  inaccuraciesPerGame: number;
  openings: {
    eco: string;
    name: string;
    games: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    averageAccuracy: number;
  }[];
  timeControls: {
    timeClass: TimeClass;
    games: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
    averageAccuracy: number;
  }[];
  ratingHistory: {
    date: string;
    rating: number;
    gameId: string;
  }[];
}

export interface ComparisonSample {
  label: string;
  gameCount: number;
  dateRange: { from: string; to: string };
  avgAccuracy: number;
  avgAcpl: number;
  blundersPerGame: number;
  mistakesPerGame: number;
  inaccuraciesPerGame: number;
  winRate: number;
  wins: number;
  losses: number;
  draws: number;
  whiteAccuracy: number;
  blackAccuracy: number;
}

export type SessionStatus = 'pending' | 'running' | 'paused' | 'stopped' | 'completed' | 'cancelled' | 'error';

export interface AnalysisSession {
  id: string;
  title: string;
  player?: string;
  platform: ChessPlatform;
  createdAt: string;
  updatedAt: string;
  status: SessionStatus;
  settings: EngineSettings;
  gameIds: string[];
  games: GameMetadata[];
  completedGameIds: string[];
  currentGameIndex: number; // 0-based
  currentPly: number;
  totalPliesInCurrentGame: number;
  currentMoveSan?: string;
  currentTurn?: 'w' | 'b';
  currentPositionFen?: string;
  telemetry?: EngineTelemetry;
  runningAverageAccuracy?: number;
  completedResults: Record<string, GameAnalysisResult>;
  gameAccuracies: Record<string, number>;
  error?: string;
  stopAfterCurrent?: boolean;
}

export interface DeviceCapabilities {
  hardwareConcurrency: number;
  deviceMemoryGb?: number;
  isWasmSupported: boolean;
  storageUsageBytes?: number;
  storageQuotaBytes?: number;
  measuredNps?: number;
  recommendedPreset: EnginePreset;
  recommendedDepth: number;
}

export interface BenchmarkResult {
  date: string;
  positionsAnalyzed: number;
  totalNodes: number;
  elapsedMs: number;
  measuredNps: number;
  depth: number;
  deviceCores: number;
  deviceMemoryGb?: number;
}

