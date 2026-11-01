import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Upload,
  ArrowRight,
  Sparkles,
  Swords,
  Target,
  BookOpen,
  Award,
} from 'lucide-react';
import { ChessComImporter } from '../services/chessComImporter';
import { LichessImporter } from '../services/lichessImporter';
import { PgnParser } from '../chess/pgnParser';
import { storageService } from '../storage/indexedDb';
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
        navigate(`/import`);
      } else if (platform === 'lichess') {
        if (!username.trim()) throw new Error('Please enter a Lichess username');
        const games = await LichessImporter.fetchGames(username, 30);
        if (games.length === 0) {
          throw new Error(`No games found for Lichess user "${username}".`);
        }
        await storageService.saveGames(games);
        navigate(`/import`);
      } else {
        if (!pgnInput.trim()) throw new Error('Please paste valid PGN text');
        const parsedGames = PgnParser.parseMultiPgn(pgnInput);
        if (parsedGames.length === 0) {
          throw new Error('Could not parse any valid chess games from the provided PGN.');
        }
        const games = parsedGames.map((p) => p.metadata);
        await storageService.saveGames(games);

        if (games.length === 1) {
          navigate(`/review?gameId=${encodeURIComponent(games[0].id)}`);
        } else {
          navigate('/import');
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
        navigate('/import');
      } catch (err: any) {
        setError('Failed to read PGN file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const quickNavCards = [
    {
      title: 'Game Review',
      desc: 'Interactive board review with real-time Stockfish evaluations & move classifications.',
      icon: Swords,
      color: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30',
      to: '/review',
    },
    {
      title: 'Mistake Drills',
      desc: 'Replay and solve critical blunders and missed wins from your actual games.',
      icon: Target,
      color: 'from-rose-500/20 to-orange-500/10 text-rose-400 border-rose-500/30',
      to: '/drills',
    },
    {
      title: 'Opening Theory',
      desc: 'Explore 3,865 ECO openings, theoretical continuations, and repertoire deviations.',
      icon: BookOpen,
      color: 'from-blue-500/20 to-cyan-500/10 text-blue-400 border-blue-500/30',
      to: '/openings',
    },
    {
      title: 'Game Reports',
      desc: 'Printable game scorecards with ACPL, accuracy curves, and performance stats.',
      icon: Award,
      color: 'from-amber-500/20 to-yellow-500/10 text-amber-400 border-amber-500/30',
      to: '/report',
    },
  ];

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 sm:pt-16 text-center">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-4 sm:mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Local Stockfish WASM • 100% Free &amp; Private • No Page Scrolling</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Review Your Chess Games with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              True Engine Power
            </span>
          </h1>

          <p className="mt-4 sm:mt-5 text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Import games from Chess.com or Lichess. Run high-depth Stockfish analysis directly in your browser. Get move classifications, tactical explanations, and track your career progression across PC, tablet, and mobile.
          </p>

          {/* Quick Import Box */}
          <div className="mt-8 max-w-xl mx-auto bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-2xl backdrop-blur-md">
            {/* Platform Selector */}
            <div className="flex rounded-xl bg-slate-950 p-1 mb-4 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPlatform('chesscom')}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  platform === 'chesscom' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Chess.com</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('lichess')}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  platform === 'lichess' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Lichess</span>
              </button>
              <button
                type="button"
                onClick={() => setPlatform('pgn')}
                className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  platform === 'pgn' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>PGN Upload</span>
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleFetch} className="space-y-3">
              {platform !== 'pgn' ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={platform === 'chesscom' ? 'Enter Chess.com Username' : 'Enter Lichess Username'}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 font-medium"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>{isLoading ? 'Fetching...' : 'Get Games'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    placeholder="Paste PGN here (e.g. 1. e4 e5 2. Nf3...)"
                    value={pgnInput}
                    onChange={(e) => setPgnInput(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 text-xs font-semibold transition-colors">
                      <Upload className="h-4 w-4 text-emerald-400" />
                      <span>Choose .pgn file</span>
                      <input type="file" accept=".pgn" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full sm:w-auto px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                    >
                      Parse PGN Games
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-left">
                  {error}
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* Dedicated Functional Pages Quick-Access Grid */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Explore Dedicated Specialized Hubs
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Dedicated pages designed for fast navigation without endless scrolling.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickNavCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.title}
                to={card.to}
                className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800/60 transition-all flex flex-col justify-between shadow-md"
              >
                <div>
                  <div className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${card.color} border flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {card.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span>Open Hub</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Saved Local Games Preview */}
      {recentGames.length > 0 && (
        <section className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-white">Saved Local Games</h3>
            <Link
              to="/import"
              className="text-xs font-semibold text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>Manage all in Import Hub</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-800 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            {recentGames.map((game) => (
              <div
                key={game.id}
                onClick={() => navigate(`/review?gameId=${encodeURIComponent(game.id)}`)}
                className="p-3 sm:p-4 flex items-center justify-between hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div>
                  <div className="font-bold text-sm text-slate-100">
                    {game.white} vs {game.black}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {game.openingName || game.eco || 'Standard'} • {game.date}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
