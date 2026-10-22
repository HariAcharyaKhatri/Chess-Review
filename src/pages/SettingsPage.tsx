import React, { useState, useEffect } from 'react';
import { EngineSettings } from '../types/chess';
import { storageService, DEFAULT_SETTINGS } from '../storage/indexedDb';
import {
  Settings as SettingsIcon,
  HardDrive,
  Download,
  Upload,
  Trash2,
  Save,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);
  const [gamesCount, setGamesCount] = useState(0);
  const [resultsCount, setResultsCount] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  useEffect(() => {
    loadSettingsAndStats();
  }, []);

  const loadSettingsAndStats = async () => {
    const s = await storageService.getSettings();
    setSettings(s);
    const games = await storageService.getAllGames();
    setGamesCount(games.length);
    const results = await storageService.getAllAnalysisResults();
    setResultsCount(results.length);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await storageService.saveSettings(settings);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleExportBackup = async () => {
    const jsonStr = await storageService.exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess_analytics_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const res = await storageService.importData(text);
        alert(`Successfully imported ${res.gamesImported} games and ${res.resultsImported} analyses.`);
        await loadSettingsAndStats();
      } catch (err: any) {
        alert('Failed to import backup: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = async () => {
    await storageService.clearAllData();
    setConfirmClearOpen(false);
    await loadSettingsAndStats();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <SettingsIcon className="h-7 w-7 text-emerald-400" />
          <span>Application &amp; Engine Settings</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Tune the local Stockfish engine budget, personalize board aesthetics, and manage IndexedDB storage.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Engine Settings Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
          <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3">
            Engine Analysis Configuration
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Search Depth */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">
                Default Target Depth (plies)
              </label>
              <input
                type="number"
                min={6}
                max={22}
                value={settings.depth}
                onChange={(e) =>
                  setSettings({ ...settings, depth: parseInt(e.target.value, 10) || 12 })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Recommended: 10 (Fast), 12 (Balanced), 15 (Deep).
              </span>
            </div>

            {/* Move Time Budget */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">
                Move Search Time Cap (ms)
              </label>
              <input
                type="number"
                min={200}
                max={10000}
                step={100}
                value={settings.movetimeMs || 1500}
                onChange={(e) =>
                  setSettings({ ...settings, movetimeMs: parseInt(e.target.value, 10) || 1500 })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 font-mono text-sm focus:outline-none focus:border-emerald-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Maximum milliseconds allowed per move search.
              </span>
            </div>

            {/* Session Time Limit */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">
                Session Time Limit
              </label>
              <select
                value={settings.sessionTimeLimitMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    sessionTimeLimitMinutes: parseInt(e.target.value, 10),
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value={3}>3 Minutes</option>
                <option value={5}>5 Minutes</option>
                <option value={10}>10 Minutes</option>
                <option value={15}>15 Minutes</option>
                <option value={0}>Unlimited</option>
              </select>
            </div>

            {/* Board Theme */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">
                Board Theme
              </label>
              <select
                value={settings.boardTheme}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    boardTheme: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-emerald-500"
              >
                <option value="green">Classic Forest Green</option>
                <option value="blue">Tournament Blue</option>
                <option value="brown">Walnut Wood</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>Save Settings</span>
            </button>
            {saveSuccess && (
              <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Settings saved!
              </span>
            )}
          </div>
        </div>
      </form>

      {/* Storage and Backups */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-5">
        <h2 className="text-base font-bold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-emerald-400" />
          <span>Local Storage &amp; Data Recovery</span>
        </h2>

        <p className="text-xs text-slate-400 leading-relaxed">
          All your imported games, Stockfish analysis results, and preferences are stored locally in your browser's IndexedDB. They are never sent to external servers. Export backups to prevent accidental browser cache clearing.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-xs font-medium">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Stored Games</span>
            <span className="text-xl font-bold font-mono text-white">{gamesCount}</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-slate-400 block mb-1">Analyzed Reviews</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{resultsCount}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Export Database JSON</span>
          </button>

          <label className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors">
            <Upload className="h-4 w-4 text-emerald-400" />
            <span>Restore Backup JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={() => setConfirmClearOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Clear Local Storage</span>
          </button>
        </div>

        {/* Clear Confirmation Modal */}
        {confirmClearOpen && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs space-y-3">
            <div className="flex items-center gap-2 text-rose-300 font-bold">
              <AlertTriangle className="h-4 w-4" />
              <span>Are you absolutely sure you want to clear all data?</span>
            </div>
            <p className="text-rose-200/80">
              This will permanently delete all {gamesCount} games and {resultsCount} analysis records stored in IndexedDB.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Yes, Clear Everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
