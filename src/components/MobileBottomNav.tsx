import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Swords,
  Cpu,
  Target,
  BarChart3,
  BookOpen,
} from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();

  const items = [
    { to: '/', label: 'Home', icon: Search },
    { to: '/review', label: 'Review', icon: Swords },
    { to: '/analysis', label: 'Analyse', icon: Cpu },
    { to: '/drills', label: 'Drills', icon: Target },
    { to: '/openings', label: 'Openings', icon: BookOpen },
    { to: '/player', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-slate-950/95 backdrop-blur-lg border-t border-slate-800/90 py-1.5 px-2 shadow-2xl safe-area-pb">
      <div className="grid grid-cols-6 gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to));

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 rounded-xl text-center transition-all ${
                isActive
                  ? 'text-emerald-400 font-bold bg-emerald-500/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 ${isActive ? 'scale-110 text-emerald-400' : ''} transition-transform`} />
              <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-full px-0.5">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
