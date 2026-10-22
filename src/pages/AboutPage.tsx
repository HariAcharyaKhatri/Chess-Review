import React from 'react';
import { Info, Shield, BookOpen, Cpu } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 text-slate-300">
      {/* Title */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
          <Info className="h-7 w-7 text-emerald-400" />
          <span>About Chess Player Analytics &amp; Review</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Open-source architecture, engine integration, mathematical model documentation, and licensing compliance.
        </p>
      </div>

      {/* Engine Architecture */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Cpu className="h-5 w-5 text-emerald-400" />
          <span>Local Stockfish WASM Engine</span>
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
          This platform executes real Stockfish WebAssembly in a background Web Worker directly within your client browser. No move data is transmitted to an external server or proprietary API. Analysis works 100% offline and at zero cost.
        </p>
        <ul className="list-disc list-inside text-xs space-y-1.5 text-slate-400 pl-2">
          <li><strong>Build:</strong> Stockfish.js WebAssembly (Single-Threaded Emscripten WASM binary).</li>
          <li><strong>UCI Interface:</strong> Strict asynchronous message pipeline handling <code className="text-emerald-400">uci</code>, <code className="text-emerald-400">isready</code>, <code className="text-emerald-400">position fen</code>, and <code className="text-emerald-400">go depth</code>.</li>
          <li><strong>Off-Thread:</strong> Runs exclusively in dedicated Web Workers without freezing the UI thread.</li>
        </ul>
      </section>

      {/* Accuracy Model Documentation */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-emerald-400" />
          <span>Accuracy Formula Documentation</span>
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
          Accuracy is calculated using a transparent mathematical win-probability transformation calibrated from centipawn evaluations:
        </p>

        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs space-y-2 text-slate-200">
          <div>
            <span className="text-slate-500">// 1. Win probability sigmoid model</span>
            <br />
            <span className="text-emerald-400">WinProbability(cp)</span> = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
          </div>
          <div>
            <span className="text-slate-500">// 2. Win probability delta from player perspective</span>
            <br />
            <span className="text-emerald-400">DeltaWinProb</span> = max(0, WinProbBefore - WinProbAfter)
          </div>
          <div>
            <span className="text-slate-500">// 3. Move accuracy percentage</span>
            <br />
            <span className="text-emerald-400">MoveAccuracy</span> = clamp(0, 100, 103.1668 * exp(-0.04354 * DeltaWinProb) - 3.1668)
          </div>
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <p>• <strong>Centipawn Loss (CPL):</strong> Computed strictly from the active player's perspective.</p>
          <p>• <strong>Forced &amp; Book Moves:</strong> Forced single-legal moves and theoretical opening moves are tagged without penalizing the player.</p>
          <p>• <strong>Disclaimer:</strong> This is a documented independent statistical estimate and is not affiliated with or endorsed by Chess.com or Lichess.</p>
        </div>
      </section>

      {/* Licensing & Compliance */}
      <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-400" />
          <span>GPLv3 &amp; Third-Party Licensing</span>
        </h2>
        <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
          Stockfish and Stockfish.js are licensed under the <strong>GNU General Public License v3.0 (GPLv3)</strong>. In compliance with the GPLv3 distribution conditions:
        </p>
        <ul className="list-disc list-inside text-xs space-y-1 text-slate-400 pl-2">
          <li>The complete GPLv3 license text is included in <code className="text-emerald-400">public/engines/STOCKFISH_LICENSE.txt</code> and the root <code className="text-emerald-400">LICENSE</code> file.</li>
          <li>Upstream Stockfish source code is publicly accessible at <a href="https://github.com/official-stockfish/Stockfish" target="_blank" rel="noreferrer" className="text-emerald-400 underline">official-stockfish/Stockfish</a>.</li>
          <li>Stockfish.js compilation scripts and sources are available at <a href="https://github.com/niklasf/stockfish.js" target="_blank" rel="noreferrer" className="text-emerald-400 underline">niklasf/stockfish.js</a>.</li>
        </ul>

        <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
          Third-party components: <code className="text-slate-200">chess.js</code> (BSD-2-Clause), <code className="text-slate-200">recharts</code> (MIT), <code className="text-slate-200">lucide-react</code> (ISC), <code className="text-slate-200">idb</code> (ISC), <code className="text-slate-200">React</code> (MIT).
        </div>
      </section>
    </div>
  );
};
