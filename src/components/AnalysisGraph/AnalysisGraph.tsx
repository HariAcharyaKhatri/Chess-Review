import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { MoveAnalysis } from '../../types/chess';
import { AccuracyService } from '../../chess/accuracy';

interface AnalysisGraphProps {
  moves: MoveAnalysis[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  className?: string;
}

export const AnalysisGraph: React.FC<AnalysisGraphProps> = ({
  moves,
  currentPly,
  onSelectPly,
  className = '',
}) => {
  // Build chart points from moves
  const data = [
    { ply: 0, evalVal: 0, label: 'Start', turn: 'w', move: 'Start' },
    ...moves.map((m) => {
      const cp = AccuracyService.scoreToCentipawns(m.evalAfter.score);
      // Clamp evaluation to [-1000, 1000] centipawns for clean visualization
      const clampedCp = Math.max(-1000, Math.min(1000, cp));
      const evalInPawns = clampedCp / 100;

      return {
        ply: m.ply,
        evalVal: evalInPawns,
        label: `${Math.floor((m.ply - 1) / 2) + 1}${m.turn === 'w' ? '.' : '...'}${m.san}`,
        turn: m.turn,
        move: m.san,
        classification: m.classification,
      };
    }),
  ];

  return (
    <div className={`w-full h-28 sm:h-36 bg-slate-900 border border-slate-800 rounded-xl p-2 flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-2 text-xs text-slate-400 font-medium">
        <span>Evaluation Advantage</span>
        <span className="font-mono text-emerald-400">
          {currentPly > 0 && moves[currentPly - 1]
            ? moves[currentPly - 1].evalAfter.score.type === 'mate'
              ? `M${moves[currentPly - 1].evalAfter.score.value}`
              : `${(AccuracyService.scoreToCentipawns(moves[currentPly - 1].evalAfter.score) / 100).toFixed(1)}`
            : '0.0'}
        </span>
      </div>

      <div className="flex-1 w-full mt-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            onClick={(state) => {
              if (state && state.activePayload && state.activePayload.length > 0) {
                const ply = state.activePayload[0].payload.ply;
                onSelectPly(ply);
              }
            }}
          >
            <defs>
              <linearGradient id="evalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.6} />
                <stop offset="50%" stopColor="#64748b" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <XAxis dataKey="ply" hide />
            <YAxis domain={[-8, 8]} hide />
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
            {currentPly > 0 && (
              <ReferenceLine x={currentPly} stroke="#38bdf8" strokeWidth={2} />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload;
                  return (
                    <div className="bg-slate-950 border border-slate-800 px-2.5 py-1.5 rounded-md shadow-xl text-xs">
                      <div className="font-bold text-slate-200">{p.label}</div>
                      <div className="text-emerald-400 font-mono">
                        Eval: {p.evalVal > 0 ? `+${p.evalVal.toFixed(1)}` : p.evalVal.toFixed(1)}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="evalVal"
              stroke="#10b981"
              strokeWidth={1.5}
              fill="url(#evalGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
