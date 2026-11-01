import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Swords,
  BarChart3,
  Search,
  Settings,
  Scale,
  Sun,
  Moon,
  Menu,
  X,
  Target,
  BookOpen,
  Award,
  Upload,
  Cpu,
} from 'lucide-react';
import { analysisQueue } from '../analysis/analysisQueue';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [queueStatus, setQueueStatus] = useState(analysisQueue.getStatus());
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const unsubscribe = analysisQueue.subscribe(() => {
      setQueueStatus(analysisQueue.getStatus());
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Theme setup
    const isSavedDark = localStorage.getItem('theme') !== 'light';
    setIsDark(isSavedDark);
    if (isSavedDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navLinks = [
    { to: '/', label: 'Home', icon: Search },
    { to: '/import', label: 'Import', icon: Upload },
    { to: '/analysis', label: 'Analyse', icon: Cpu },
    { to: '/review', label: 'Review', icon: Swords },
    { to: '/report', label: 'Report', icon: Award },
    { to: '/drills', label: 'Drills', icon: Target },
    { to: '/openings', label: 'Openings', icon: BookOpen },
    { to: '/player', label: 'Stats', icon: BarChart3 },
    { to: '/compare', label: 'Compare', icon: Scale },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/90 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Swords className="h-4.5 w-4.5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white">Chess<span className="text-emerald-400">Review</span></span>
          </div>
        </Link>

        {/* Desktop Navigation (compact, clean) */}
        <nav className="hidden xl:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 dark:bg-slate-800 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Tablet / Laptop Medium Nav (Top 6 primary items) */}
        <nav className="hidden md:flex xl:hidden items-center gap-1">
          {navLinks.slice(0, 7).map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Active Queue indicator */}
          {queueStatus.isRunning && (
            <Link
              to="/analysis"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono animate-pulse"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="hidden sm:inline">
                {queueStatus.isPaused ? 'Paused' : `Stockfish (${queueStatus.completedCount}/${queueStatus.totalCount})`}
              </span>
            </Link>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            {isDark ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-slate-400" />}
          </button>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-b border-slate-800 bg-slate-900/95 px-4 pt-2 pb-4 grid grid-cols-2 sm:grid-cols-3 gap-1 shadow-2xl">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                  isActive
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 text-emerald-400" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
