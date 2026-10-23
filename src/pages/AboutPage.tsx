import React, { useState } from 'react';
import {
  Info,
  Shield,
  BookOpen,
  Cpu,
  Target,
  HelpCircle,
  Upload,
  Play,
  RotateCcw,
  Smartphone,
  AlertTriangle,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: any;
  content: React.ReactNode;
}

export const AboutPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'guide' | 'technical'>('guide');
  const [expandedSection, setExpandedSection] = useState<string | null>('intro');

  const toggleSection = (id: string) => {
    setExpandedSection((prev) => (prev === id ? null : id));
  };

  const guideSections: GuideSection[] = [
    {
      id: 'intro',
      title: '1. Introduction to Chess Review',
      icon: HelpCircle,
      content: (
        <div className="space-y-2">
          <p>
            <strong>Chess Review</strong> is a production-grade, 100% client-side chess game analytics and review platform powered by real Stockfish WebAssembly.
          </p>
          <p>
            Unlike commercial platforms requiring paid subscriptions or remote servers, Chess Review performs deep position evaluations, move classifications, opening detection, and personalized training entirely within your browser at zero cost and with complete privacy.
          </p>
        </div>
      ),
    },
    {
      id: 'import',
      title: '2. Importing a PGN File',
      icon: Upload,
      content: (
        <div className="space-y-2">
          <p>
            Navigate to the <strong>Analyse</strong> page. You can drag and drop any standard <code>.pgn</code> file from your computer or click <em>Select PGN File</em>.
          </p>
          <p>
            Chess Review parses single-game or multi-game PGN archives, extracts player names, ratings, results, dates, and event tags, and prepares them for analysis.
          </p>
        </div>
      ),
    },
    {
      id: 'paste',
      title: '3. Pasting a Game',
      icon: Layers,
      content: (
        <div className="space-y-2">
          <p>
            On the <strong>Analyse</strong> page, switch to the <em>Paste PGN Text</em> tab. Paste any PGN text from Chess.com, Lichess, or your favorite chess database and click <em>Import Game</em>.
          </p>
          <p>
            The game will be validated using <code>chess.js</code>, verifying all moves and positions for legality.
          </p>
        </div>
      ),
    },
    {
      id: 'navigate',
      title: '4. Navigating the Chessboard and Move List',
      icon: Play,
      content: (
        <div className="space-y-2">
          <p>
            In the <strong>Review</strong> workspace, you can navigate moves in multiple ways:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li><strong>Controls:</strong> Use the First, Previous, Play/Pause, Next, and Last buttons below the board.</li>
            <li><strong>Keyboard:</strong> Use <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">←</kbd> and <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">→</kbd> for previous/next move, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">Home</kbd> / <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">End</kbd> for start/end, <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">Space</kbd> for autoplay, and <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono">F</kbd> to flip the board.</li>
            <li><strong>Move List:</strong> Click directly on any move in the move table to jump to that position.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'live_analysis',
      title: '5. Starting Live Analysis & 6. Understanding Engine Progress',
      icon: Cpu,
      content: (
        <div className="space-y-2">
          <p>
            Select your target games on the <strong>Analyse</strong> page and click <strong>Analyse Selected Games</strong>. The system will create an isolated session and redirect to a focused live analysis dashboard.
          </p>
          <p>
            The engine executes actual UCI searches per position. You will see:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li>Current move being evaluated and player to move.</li>
            <li>Completed moves versus total moves in the active game.</li>
            <li>Completed games versus total batch games.</li>
            <li>Real UCI telemetry: Depth, Nodes searched, Speed (NPS), and Principal Variation.</li>
            <li>The progress counter advances strictly as positions are evaluated by Stockfish.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'evaluations',
      title: '7. Understanding Evaluations (Pawns & Mate Notation)',
      icon: Target,
      content: (
        <div className="space-y-2">
          <p>
            Stockfish outputs evaluations in centipawns (100 centipawns = 1 pawn advantage):
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li><strong className="text-emerald-400">+1.50</strong>: White has an advantage equal to 1.5 pawns.</li>
            <li><strong className="text-rose-400">-2.00</strong>: Black has an advantage equal to 2 pawns.</li>
            <li><strong className="text-amber-400">0.00</strong>: Equal position with balanced drawing chances.</li>
            <li><strong className="text-purple-400">M4 / -M2</strong>: Forced checkmate in 4 moves (White) or 2 moves (Black).</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'classifications',
      title: '8. Move Classifications (Brilliant, Great, Best, Inaccuracy, Mistake, Blunder)',
      icon: Award,
      content: (
        <div className="space-y-2">
          <p>
            Every move is classified based on centipawn loss and tactical context:
          </p>
          <ul className="space-y-1.5 text-slate-300 pl-2">
            <li><span className="text-cyan-400 font-bold">!! Brilliant:</span> Exceptional tactical move sacrificing material to gain decisive positional or tactical superiority.</li>
            <li><span className="text-teal-400 font-bold">! Great:</span> Only critical move maintaining the advantage in a difficult position.</li>
            <li><span className="text-emerald-400 font-bold">★ Best:</span> The engine&apos;s number one choice in the position.</li>
            <li><span className="text-green-400 font-bold">✓ Excellent:</span> Strong move that keeps the position intact.</li>
            <li><span className="text-lime-400 font-bold">✓ Good:</span> Acceptable move maintaining play without major loss.</li>
            <li><span className="text-yellow-400 font-bold">?! Inaccuracy:</span> Minor sub-optimal move losing 30-80 centipawns.</li>
            <li><span className="text-amber-400 font-bold">? Mistake:</span> Significant positional or tactical concession losing 80-250 centipawns.</li>
            <li><span className="text-rose-400 font-bold">?? Blunder:</span> Severe tactical oversight losing material or swinging evaluation by over 250 centipawns.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'accuracy',
      title: '9. Understanding Player Accuracy Calculation',
      icon: BookOpen,
      content: (
        <div className="space-y-2">
          <p>
            Accuracy is calculated using a sigmoid win-probability model:
          </p>
          <div className="bg-slate-950 p-3 rounded-lg font-mono text-[11px] text-emerald-400">
            WinProb(cp) = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
            <br />
            MoveAccuracy = clamp(0, 100, 103.1668 * exp(-0.04354 * ΔWinProb) - 3.1668)
          </div>
          <p>
            The game accuracy is the average of move accuracies across all plies. Forced single-legal moves and known book moves are omitted so they do not artificially distort player quality.
          </p>
        </div>
      ),
    },
    {
      id: 'graph',
      title: '10. Reading the Advantage Graph',
      icon: Layers,
      content: (
        <div className="space-y-2">
          <p>
            The Advantage Graph visualizes the flow of the game:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li>Peaks above the centerline indicate White advantages.</li>
            <li>Troughs below the centerline indicate Black advantages.</li>
            <li>Hovering or clicking anywhere on the graph instantly updates the chessboard to that exact move.</li>
            <li>Critical evaluation swings highlight sudden blunders or turning points.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'openings',
      title: '11. Identifying Openings and Variations & 12. Following Recommended Lines',
      icon: BookOpen,
      content: (
        <div className="space-y-2">
          <p>
            Chess Review incorporates a comprehensive database of <strong>3,865 ECO openings</strong> (from ECO codes A00 to E99).
          </p>
          <p>
            Click the <strong>Opening Coach</strong> button in the Review header to inspect:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li>Exact opening name and ECO code (e.g. <em>B90 Sicilian Defense: Najdorf Variation</em>).</li>
            <li>Whether your game stayed within master book theory.</li>
            <li>The exact move where the game deviated from standard theory.</li>
            <li>Recommended alternative continuation lines and practice drills.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'improvement',
      title: '13. Personalized Improvement Plan & 14. Practising Mistakes',
      icon: Target,
      content: (
        <div className="space-y-2">
          <p>
            After game analysis finishes, click <strong>Improvement Plan</strong> or <strong>Drill Mistakes</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li><strong>Improvement Plan:</strong> Breaks down your top 3 strengths, 3 highest-priority weaknesses, and specific phase recommendations (Opening, Middlegame, Endgame).</li>
            <li><strong>Mistake Trainer:</strong> Interactive replay of positions where you committed blunders or mistakes. Make moves on the board to find the engine&apos;s best move with real-time feedback.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'session_controls',
      title: '15. Pausing, Retrying, and Resuming Analysis',
      icon: RotateCcw,
      content: (
        <div className="space-y-2">
          <p>
            In the dedicated Session page, you have full control over the analysis engine:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li><strong>Pause / Resume:</strong> Safely halt evaluation and resume whenever convenient.</li>
            <li><strong>Stop After Game:</strong> Finishes the current game analysis and gracefully concludes without losing progress.</li>
            <li><strong>Retry Analysis:</strong> If interrupted or if the worker encountered a memory limit, clicking Retry reinitializes the engine cleanly and resumes pending work.</li>
            <li><strong>IndexedDB Persistence:</strong> Refreshing or closing the tab preserves all completed results.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'export',
      title: '16. Exporting Games and Analysis Reports',
      icon: Upload,
      content: (
        <div className="space-y-2">
          <p>
            In the Review page, click <strong>PGN</strong> to download the original annotated game or <strong>JSON</strong> to download complete numerical evaluation telemetry, centipawn losses, classifications, and improvement plan data.
          </p>
        </div>
      ),
    },
    {
      id: 'mobile',
      title: '17. Using the Application on Mobile Devices',
      icon: Smartphone,
      content: (
        <div className="space-y-2">
          <p>
            Chess Review is fully responsive across mobile screens (360px - 768px):
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li>The review screen includes a quick mobile switcher between <strong>Board</strong>, <strong>Moves &amp; Filters</strong>, and <strong>Report &amp; Drills</strong>.</li>
            <li>A horizontal evaluation bar displays evaluations beneath the board on narrow viewports.</li>
            <li>Touch targets are sized for mobile interaction with zero horizontal overflow.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'troubleshooting',
      title: '18. Troubleshooting Stockfish Worker Errors & 19. Limitations',
      icon: AlertTriangle,
      content: (
        <div className="space-y-2">
          <p>
            Stockfish runs entirely inside your browser&apos;s WebAssembly engine.
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
            <li><strong>Asset Loading:</strong> Chess Review uses multi-candidate URL resolution and in-memory Blob Worker instantiation to ensure reliable engine loading across GitHub Pages subpaths and custom domains.</li>
            <li><strong>Depth &amp; Speed:</strong> Default depth is set to 12 plies with 1500ms time limits for balanced performance on mobile and desktop. You can adjust depth in Settings up to 18 plies for deeper calculations.</li>
            <li><strong>Limitations:</strong> Extremely deep endgame tablebases (7-piece tablebases) and commercial neural network weights (NNUE 100MB+ files) are not bundled to ensure fast load times and zero bandwidth consumption.</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Info className="h-7 w-7 text-emerald-400" />
            <span>Chess Review User Guide &amp; Technical Architecture</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Complete operational manual, engine documentation, mathematical formulas, and open-source licensing.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'guide' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            User Guide (19 Topics)
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'technical' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Technical &amp; License
          </button>
        </div>
      </div>

      {activeTab === 'guide' ? (
        /* User Guide Accordion Sections */
        <div className="space-y-3">
          {guideSections.map((sec) => {
            const Icon = sec.icon;
            const isExpanded = expandedSection === sec.id;

            return (
              <div
                key={sec.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md transition-all"
              >
                <button
                  onClick={() => toggleSection(sec.id)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-950 text-emerald-400 border border-slate-800">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-white">{sec.title}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-slate-800/60 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3">
                    {sec.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Technical Architecture & GPLv3 Licensing */
        <div className="space-y-6">
          {/* Engine Architecture */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-md space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-emerald-400" />
              <span>Local Stockfish WASM Engine Architecture</span>
            </h2>
            <p className="text-xs sm:text-sm leading-relaxed text-slate-300">
              This platform executes real Stockfish WebAssembly in a background Web Worker directly within your client browser. No move data is transmitted to an external server or proprietary API. Analysis works 100% offline and at zero cost.
            </p>
            <ul className="list-disc list-inside text-xs space-y-1.5 text-slate-400 pl-2">
              <li><strong>Build:</strong> Stockfish.js WebAssembly (Single-Threaded Emscripten WASM binary).</li>
              <li><strong>UCI Interface:</strong> Strict asynchronous message pipeline handling <code className="text-emerald-400">uci</code>, <code className="text-emerald-400">isready</code>, <code className="text-emerald-400">position fen</code>, and <code className="text-emerald-400">go depth</code>.</li>
              <li><strong>Off-Thread:</strong> Runs exclusively in dedicated Web Workers without freezing the UI thread.</li>
              <li><strong>Candidate Discovery &amp; Blob Worker:</strong> Auto-detects GitHub Pages subpaths and spins up resilient in-memory Blob workers.</li>
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
              <p>• <strong>Centipawn Loss (CPL):</strong> Computed strictly from the active player&apos;s perspective.</p>
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
              <li>Opening database derived from <a href="https://github.com/lichess-org/chess-openings" target="_blank" rel="noreferrer" className="text-emerald-400 underline">lichess-org/chess-openings</a> (CC0 Public Domain).</li>
            </ul>

            <div className="pt-2 border-t border-slate-800 text-xs text-slate-400">
              Third-party components: <code className="text-slate-200">chess.js</code> (BSD-2-Clause), <code className="text-slate-200">recharts</code> (MIT), <code className="text-slate-200">lucide-react</code> (ISC), <code className="text-slate-200">idb</code> (ISC), <code className="text-slate-200">React</code> (MIT).
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
