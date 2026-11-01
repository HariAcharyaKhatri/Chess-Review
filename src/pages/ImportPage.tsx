import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GameMetadata } from '../types/chess';
import { storageService } from '../storage/indexedDb';
import { ChessComImporter } from '../services/chessComImporter';
import { LichessImporter } from '../services/lichessImporter';
import { PgnParser } from '../chess/pgnParser';
import {
  Upload,
  CheckCircle2,
  AlertTriangle,
  Swords,
  Trash2,
  ArrowRight,
  Database,
} from 'lucide-react';

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const [platform, setPlatform] = useState<'chesscom' | 'lichess' | 'pgn'>('chesscom');
  const [username, setUsername] = useState('');
  const [pgnInput, setPgnInput] = useState('');
  const [gameLimit, setGameLimit] = useState(30);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importedGames, setImportedGames] = useState<GameMetadata[]>([]);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    const games = await storageService.getAllGames();
    setImportedGames(games.reverse());
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsFetching(true);

    try {
      let fetched: GameMetadata[] = [];
      if (platform === 'chesscom') {
        if (!username.trim()) throw new Error('Please enter a Chess.com username');
        fetched = await ChessComImporter.fetchGames(username, 3, gameLimit);
        if (fetched.length === 0) throw new Error(`No games found for Chess.com user "${username}".`);
      } else if (platform === 'lichess') {
        if (!username.trim()) throw new Error('Please enter a Lichess username');
        fetched = await LichessImporter.fetchGames(username, gameLimit);
        if (fetched.length === 0) throw new Error(`No games found for Lichess user "${username}".`);
      } else {
        if (!pgnInput.trim()) throw new Error('Please paste or upload valid PGN text');
        const parsed = PgnParser.parseMultiPgn(pgnInput);
        if (parsed.length === 0) throw new Error('Could not parse any valid chess games from the provided PGN.');
        fetched = parsed.map((p) => p.metadata);
      }

      await storageService.saveGames(fetched);
      setSuccessMessage(`Successfully imported ${fetched.length} games!`);
      await loadGames();

      if (fetched.length === 1) {
        navigate(`/review?gameId=${encodeURIComponent(fetched[0].id)}`);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during import');
    } finally {
      setIsFetching(false);
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
        setSuccessMessage(`Successfully imported ${games.length} games from PGN file!`);
        await loadGames();
      } catch (err: any) {
        setError(err.message || 'Error parsing uploaded PGN');
      }
    };
    reader.readAsText(file);
  };

  const handleClearGames = async () => {
    if (window.confirm('Are you sure you want to delete all saved games?')) {
      await storageService.clearAllGames();
      await loadGames();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Database className="h-7 w-7 text-emerald-400" />
            <span>Import Public Games &amp; PGN</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Fetch games directly from public APIs (Chess.com, Lichess) or upload custom PGN files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {importedGames.length > 0 && (
            <button
              onClick={handleClearGames}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear Library</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Import Form */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setPlatform('chesscom'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                platform === 'chesscom' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Chess.com</span>
            </button>
            <button
              type="button"
              onClick={() => { setPlatform('lichess'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                platform === 'lichess' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Lichess</span>
            </button>
            <button
              type="button"
              onClick={() => { setPlatform('pgn'); setError(null); }}
              className={`flex-1 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                platform === 'pgn' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>PGN Upload</span>
            </button>
          </div>

          <form onSubmit={handleFetch} className="space-y-4">
            {platform !== 'pgn' ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">
                    {platform === 'chesscom' ? 'Chess.com Username' : 'Lichess Username'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Hikaru, MagnusCarlsen"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Game Limit</label>
                  <select
                    value={gameLimit}
                    onChange={(e) => setGameLimit(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500"
                  >
                    <option value={10}>Last 10 Games</option>
                    <option value={25}>Last 25 Games</option>
                    <option value={50}>Last 50 Games</option>
                    <option value={100}>Last 100 Games</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-400 block mb-1">Paste PGN</label>
                  <textarea
                    rows={4}
                    placeholder="1. e4 e5 2. Nf3 Nc6..."
                    value={pgnInput}
                    onChange={(e) => setPgnInput(e.target.value)}
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Or upload a .pgn file:</span>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition-colors">
                    <Upload className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Choose File</span>
                    <input type="file" accept=".pgn" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isFetching}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isFetching ? 'Connecting to Server...' : 'Retrieve Games'}
            </button>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}
          </form>
        </div>

        {/* Right: Imported Games Library */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-bold text-white">Imported Games Library</h2>
              <p className="text-xs text-slate-400">
                {importedGames.length} saved games in local browser storage.
              </p>
            </div>
            <Link
              to="/analysis"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
            >
              <span>Batch Analyse</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {importedGames.length > 0 ? (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {importedGames.map((g) => (
                <div
                  key={g.id}
                  className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-slate-800/40 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">
                        {g.white} <span className="text-slate-500 font-normal">vs</span> {g.black}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                        {g.result}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {g.openingName || g.eco || 'Chess Game'} • {g.date}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/review?gameId=${encodeURIComponent(g.id)}`}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-colors flex items-center gap-1"
                    >
                      <Swords className="h-3 w-3" />
                      <span>Review</span>
                    </Link>

                    <Link
                      to={`/report?gameId=${encodeURIComponent(g.id)}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
                    >
                      <span>Report</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center text-slate-500 space-y-2">
              <Database className="h-8 w-8 mx-auto text-slate-600" />
              <p className="text-xs">No games imported yet. Enter a username or upload PGN on the left to begin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
