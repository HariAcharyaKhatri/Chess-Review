import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Upload,
  Cpu,
  BarChart2,
  Scale,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ChessComImporter } from '../services/chessComImporter';
import { LichessImporter } from '../services/lichessImporter';
import { PgnParser } from '../chess/pgnParser';
import { storageService } from '../storage/indexedDb';
import { sessionManager } from '../analysis/sessionManager';
import { GameMetadata } from '../types/chess';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<'chesscom' | 'lichess' | 'pgn'>('chesscom');
  const [username, setUsername] = useState('');
  const [pgnInput, setPgnInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentGames, setRecentGames] = useState<GameMetadata[]>([]);

  useEffect(() => {
    storageService.getAllGames().then((games) => {
      setRecentGames(games.slice(-5).reverse());
    });
  }, []);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (platform === 'chesscom') {
        if (!username.trim()) throw new Error('Please enter a Chess.com username');
        const games = await ChessComImporter.fetchGames(username, 3, 30);
        if (games.length === 0) {
          throw new Error(`No recent games found for Chess.com user "${username}".`);
        }
        await storageService.saveGames(games);
        navigate(`/analysis?username=${encodeURIComponent(username)}&platform=chesscom`);
      } else if (platform === 'lichess') {
        if (!username.trim()) throw new Error('Please enter a Lichess username');
        const games = await LichessImporter.fetchGames(username, 30);
        if (games.length === 0) {
          throw new Error(`No games found for Lichess user "${username}".`);
        }
        await storageService.saveGames(games);
        navigate(`/analysis?username=${encodeURIComponent(username)}&platform=lichess`);
      } else {
        if (!pgnInput.trim()) throw new Error('Please paste valid PGN text');
        const parsedGames = PgnParser.parseMultiPgn(pgnInput);
        if (parsedGames.length === 0) {
          throw new Error('Could not parse any valid chess games from the provided PGN.');
        }
        const games = parsedGames.map((p) => p.metadata);
        await storageService.saveGames(games);

        if (games.length === 1) {
          const settings = await storageService.getSettings();
          const session = await sessionManager.createSession(
            games,
            settings,
            `Review: ${games[0].white} vs ${games[0].black}`
          );
          sessionManager.startSession(session.id);
          navigate(`/analysis/session/${encodeURIComponent(session.id)}`);
        } else {
          navigate('/analysis?platform=pgn_upload');
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during import');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = PgnParser.parseMultiPgn(text);
        if (parsed.length === 0) {
          setError('No valid games found in uploaded PGN file.');
          return;
        }
        const games = parsed.map((p) => p.metadata);
        await storageService.saveGames(games);

        if (games.length === 1) {
          const settings = await storageService.getSettings();
          const session = await sessionManager.createSession(
            games,
            settings,
            `Review: ${games[0].white} vs ${games[0].black}`
          );
          sessionManager.startSession(session.id);
          navigate(`/analysis/session/${encodeURIComponent(session.id)}`);
        } else {
          navigate('/analysis?platform=pgn_upload');
        }
      } catch (err: any) {
        setError('Failed to read PGN file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 sm:pt-20 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Real Local Stockfish WASM • 100% Free &amp; Private</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Review Your Chess Games with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              True Engine Power
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Import games from Chess.com or Lichess. Run high-depth Stockfish analysis directly in your browser. Get move classifications, tactical explanations, and track your career progression.
          </p>

          {/* Import Card */}
          <div className="mt-10 mx-auto max-w-2xl bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-sm">
            {/* Platform Selector Tabs */}
            <div className="flex rounded-xl bg-slate-950 p-1 mb-6 border border-slate-800">
              <button
                type="button"
                onClick={() => { setPlatform('chesscom'); setError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  platform === 'chesscom'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Chess.com
              </button>
              <button
                type="button"
                onClick={() => { setPlatform('lichess'); setError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  platform === 'lichess'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Lichess
              </button>
              <button
                type="button"
                onClick={() => { setPlatform('pgn'); setError(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${
                  platform === 'pgn'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Upload / Paste PGN
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFetch} className="space-y-4">
              {platform !== 'pgn' ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-500" />
                    <input
                      type="text"
                      placeholder={platform === 'chesscom' ? 'e.g. MagnusCarlsen or Hikaru' : 'e.g. DrNykterstein'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isLoading ? 'Importing...' : 'Fetch Games'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    placeholder="Paste one or more PGN games here..."
                    value={pgnInput}
                    onChange={(e) => setPgnInput(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors">
                      <Upload className="h-4 w-4 text-emerald-400" />
                      <span>Choose .pgn file</span>
                      <input
                        type="file"
                        accept=".pgn"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
                    >
                      {isLoading ? 'Processing...' : 'Load PGN'}
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-left">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Designed for Serious Chess Improvement
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Real evaluations computed on your hardware without server queues or paywalls.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Browser Stockfish WASM</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Stockfish runs inside a dedicated Web Worker directly in your browser. No server installations, no subscriptions, and complete offline capability.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
              <BarChart2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Documented Accuracy Math</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates move accuracy using a transparent win-probability transformation based on real centipawn swings rather than opaque estimates.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
              <Scale className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Oldest vs. Recent Comparison</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Directly benchmark your first games against your latest games to measure blunder reduction, accuracy growth, and rating progression over time.
            </p>
          </div>
        </div>
      </section>

      {/* Recently Imported Games Preview */}
      {recentGames.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white">Saved Local Games</h3>
            <button
              onClick={() => navigate('/analysis')}
              className="text-xs font-medium text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>View all in analysis</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-800 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {recentGames.map((game) => (
              <div
                key={game.id}
                onClick={() => navigate(`/review?gameId=${encodeURIComponent(game.id)}`)}
                className="p-3 sm:p-4 flex items-center justify-between hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-semibold text-sm text-slate-100">
                    {game.white} vs {game.black}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {game.openingName || game.eco || 'Standard'} • {game.date} • {game.timeClass}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {game.result}
                  </span>
                  <ArrowRight className="h-4 w-4 text-slate-500" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
