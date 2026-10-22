# Chess Player Analytics & Review Platform

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![Stockfish](https://img.shields.io/badge/Stockfish-WASM-emerald.svg)](https://stockfishchess.org/)
[![License: GPLv3](https://img.shields.io/badge/License-GPLv3-yellow.svg)](https://www.gnu.org/licenses/gpl-3.0)

A professional, full-featured **Chess Player Analytics & Review System** built with **React**, **TypeScript**, **Vite**, and **Stockfish WebAssembly**.

Review games with real engine depth, get tactical move-by-move explanations, calculate documented player accuracy scores, and compare your oldest games against your most recent games to measure true chess improvement.

---

## 🌟 Key Features

### 1. Game Import
- **Chess.com Public Integration:** Fetches games and monthly archives through the published Chess.com API.
- **Lichess Public Integration:** Direct user export with opening metadata and time controls.
- **PGN Upload & Paste:** Parse single and multi-game PGNs with support for promotions, en passant, castling, and clock annotations.

### 2. Client-Side Stockfish Engine
- **WebAssembly Engine:** Runs real Stockfish WASM off-thread in a dedicated Web Worker.
- **Zero Paid APIs / Zero Tracking:** 100% private, works offline, and requires no backend servers.
- **Configurable Budgets:** Presets for Fast (depth 10), Balanced (depth 12), and Deep (depth 15) search, along with per-move time limits and session time caps.

### 3. Interactive Review Workspace
- **Dynamic Chessboard:** Crisp SVG vector pieces, legal move destination highlights, king check highlight, and best-move arrow overlays.
- **Smooth Evaluation Bar:** Live evaluation display supporting centipawns (+1.5, -0.8) and mate announcements (M2, -M4).
- **Move List & Badges:** Categorized move-by-move analysis with auto-scrolling to the active ply.
- **Advantage Chart:** Interactive evaluation advantage graph across all plies using Recharts. Click anywhere on the curve to jump to that move.
- **Tactical Explanations:** Real-time text explanations comparing the played move with the engine's suggested alternative.

### 4. Documented Accuracy & Classifications
- **Win Probability Transformation:** Uses a calibrated sigmoid model:
  $$\text{WinProb}(cp) = 50 + 50 \times \left( \frac{2}{1 + e^{-0.00368208 \times cp}} - 1 \right)$$
- **Move Accuracy Equation:**
  $$\text{Accuracy} = \max\left(0, \min\left(100, 103.1668 \times e^{-0.04354 \times \Delta\text{WinProb}} - 3.1668\right)\right)$$
- **Move Classifications:** Brilliant, Great, Best, Excellent, Good, Inaccuracy, Mistake, Missed Win, Blunder, Forced, and Book moves.

### 5. Oldest vs. Recent Comparison
- Compare your earliest games against your recent games (e.g., Oldest 25 vs. Recent 25).
- Direct progress metrics: Accuracy Delta ($\Delta$), Average Centipawn Loss reduction, and Blunder reduction rate.
- Explicit overlap reporting when the total game count is smaller than the requested cohort size.

### 6. Career Analytics & Persistence
- Win/Loss/Draw records, White vs. Black performance, and Opening repertoire win rates.
- Persistent local storage using IndexedDB (`idb`).
- Full JSON database export and backup restore.
- Printable career summary report (`@media print` styled).

---

## 🛠️ Technology Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide React
- **Engine:** Stockfish.js WebAssembly (`stockfish.wasm`, `stockfish.wasm.js`) running in Web Workers
- **Chess Logic:** `chess.js` (validation, FEN generation, legal move verification)
- **Charts:** `recharts`
- **Storage:** IndexedDB via `idb`
- **Routing:** React Router (`HashRouter` for universal GitHub Pages and static host support)
- **Testing:** Vitest, React Testing Library, jsdom
- **Bundler:** Vite

---

## 🚀 Getting Started Locally

### Prerequisites
- Node.js (version 18 or newer)
- npm (version 9 or newer)

### Installation
1. Clone or open the repository folder:
   ```bash
   cd "d:/HARI KHATRI/Chess Review"
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

4. Run automated tests:
   ```bash
   npm test
   ```

5. Build for production:
   ```bash
   npm run build
   ```

6. Preview the production build locally:
   ```bash
   npm run preview
   ```

---

## 📦 Connecting to GitHub & Deploying to GitHub Pages

1. **Create a new repository on GitHub:**
   - Go to [github.com/new](https://github.com/new) and create a repository (e.g., `chess-review`).

2. **Connect your local workspace and push:**
   ```bash
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git branch -M main
   git push -u origin main
   ```

3. **Enable GitHub Pages:**
   - In your GitHub repository, navigate to **Settings** → **Pages**.
   - Under **Build and deployment** → **Source**, select **GitHub Actions**.
   - The included workflow in `.github/workflows/deploy.yml` will automatically build, run tests, and publish your website.

---

## ⚖️ Licensing & Attribution

- **Application Source Code:** MIT License (see `LICENSE`).
- **Stockfish Engine:** GNU General Public License v3.0 (GPLv3).
- **Third-Party Notices:** Complete third-party acknowledgments and source links are provided in `THIRD_PARTY_NOTICES.md` and `public/engines/STOCKFISH_LICENSE.txt`.
