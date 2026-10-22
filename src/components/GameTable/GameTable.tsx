import React, { useState } from 'react';
import { GameMetadata, GameAnalysisResult } from '../../types/chess';
import { Link } from 'react-router-dom';
import { CheckSquare, Square, Eye, Clock } from 'lucide-react';

interface GameTableProps {
  games: GameMetadata[];
  resultsMap: Map<string, GameAnalysisResult>;
  selectedGameIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onSelectPreset: (mode: string) => void;
  onAnalyseGame?: (game: GameMetadata) => void;
  className?: string;
}

export const GameTable: React.FC<GameTableProps> = ({
  games,
  resultsMap,
  selectedGameIds,
  onToggleSelect,
  onSelectPreset,
  onAnalyseGame,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTimeClass, setFilterTimeClass] = useState<string>('all');

  const filteredGames = games.filter((g) => {
    const matchesSearch =
      g.white.toLowerCase().includes(searchTerm.toLowerCase()) ||
      g.black.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (g.openingName && g.openingName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (g.eco && g.eco.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTc = filterTimeClass === 'all' || g.timeClass === filterTimeClass;

    return matchesSearch && matchesTc;
  });

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg ${className}`}>
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/40">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <input
            type="text"
            placeholder="Search players, openings, ECO..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 flex-1 max-w-xs"
          />

          <select
            value={filterTimeClass}
            onChange={(e) => setFilterTimeClass(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Time Controls</option>
            <option value="bullet">Bullet</option>
            <option value="blitz">Blitz</option>
            <option value="rapid">Rapid</option>
            <option value="classical">Classical</option>
          </select>
        </div>

        {/* Selection Presets Dropdown */}
        <div className="flex items-center gap-2">
          <select
            onChange={(e) => {
              if (e.target.value) {
                onSelectPreset(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="px-3 py-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/40 text-sm font-medium text-emerald-400 focus:outline-none hover:bg-emerald-600/20 cursor-pointer"
          >
            <option value="" disabled>Select Preset...</option>
            <option value="recent_10">Recent 10 Games</option>
            <option value="recent_20">Recent 20 Games</option>
            <option value="recent_25">Recent 25 Games</option>
            <option value="recent_30">Recent 30 Games</option>
            <option value="recent_50">Recent 50 Games</option>
            <option value="recent_100">Recent 100 Games</option>
            <option value="oldest_25">Oldest 25 Games</option>
            <option value="oldest_50">Oldest 50 Games</option>
            <option value="oldest_100">Oldest 100 Games</option>
            <option value="compare_25">Oldest 25 vs Recent 25</option>
            <option value="compare_50">Oldest 50 vs Recent 50</option>
            <option value="all">Select All Available</option>
            <option value="clear">Clear Selection</option>
          </select>

          <span className="text-xs font-medium text-slate-400">
            Selected: <strong className="text-emerald-400 font-mono">{selectedGameIds.size}</strong> / {games.length}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/70 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
            <tr>
              <th className="p-3 w-10 text-center">
                <button
                  onClick={() => onSelectPreset(selectedGameIds.size === filteredGames.length ? 'clear' : 'all')}
                  className="p-1 hover:text-white"
                >
                  {selectedGameIds.size > 0 && selectedGameIds.size === filteredGames.length ? (
                    <CheckSquare className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500" />
                  )}
                </button>
              </th>
              <th className="p-3">Players</th>
              <th className="p-3">Result</th>
              <th className="p-3">Opening</th>
              <th className="p-3">Time</th>
              <th className="p-3">Date</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredGames.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No games match the current criteria.
                </td>
              </tr>
            ) : (
              filteredGames.map((game) => {
                const isSelected = selectedGameIds.has(game.id);
                const analysis = resultsMap.get(game.id);

                return (
                  <tr
                    key={game.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      isSelected ? 'bg-emerald-950/20' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onToggleSelect(game.id)}
                        className="p-1 hover:text-white"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                    </td>

                    {/* Players */}
                    <td className="p-3">
                      <div className="flex flex-col">
                        <span className="flex items-center gap-1.5 font-semibold text-slate-100">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-100 inline-block border border-slate-400" />
                          {game.white}{' '}
                          {game.whiteElo && (
                            <span className="text-xs text-slate-400 font-mono">
                              ({game.whiteElo})
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-1.5 text-slate-300">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-800 inline-block border border-slate-600" />
                          {game.black}{' '}
                          {game.blackElo && (
                            <span className="text-xs text-slate-400 font-mono">
                              ({game.blackElo})
                            </span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Result */}
                    <td className="p-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-bold ${
                          game.result === '1-0'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : game.result === '0-1'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-slate-700/40 text-slate-300'
                        }`}
                      >
                        {game.result}
                      </span>
                    </td>

                    {/* Opening */}
                    <td className="p-3 text-xs max-w-[180px] truncate" title={game.openingName || game.eco}>
                      <span className="font-mono text-emerald-400 font-semibold mr-1">
                        {game.eco || '---'}
                      </span>
                      <span>{game.openingName || 'Standard'}</span>
                    </td>

                    {/* Time Class */}
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400 capitalize">
                        <Clock className="h-3.5 w-3.5" />
                        {game.timeClass}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="p-3 text-xs text-slate-400 font-mono whitespace-nowrap">
                      {game.date}
                    </td>

                    {/* Status */}
                    <td className="p-3">
                      {analysis ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          <span>{analysis.whiteAccuracy}% / {analysis.blackAccuracy}%</span>
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Unanalyzed</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="p-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {!analysis && onAnalyseGame && (
                          <button
                            type="button"
                            onClick={() => onAnalyseGame(game)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors"
                            title="Start single-game analysis"
                          >
                            <span>Analyse</span>
                          </button>
                        )}
                        <Link
                          to={`/review?gameId=${encodeURIComponent(game.id)}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Review</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
