import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock,
  Sparkles,
  Eye,
  AlertTriangle,
  Compass,
  Settings,
  ShieldCheck,
  Moon,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const navSections = [
    {
      title: 'Core Journal',
      items: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/journal', label: 'Dream Journal', icon: BookOpen },
        { to: '/timeline', label: 'Timeline', icon: Clock },
        { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      ],
    },
    {
      title: 'Intelligence & Lucidity',
      items: [
        { to: '/signs', label: 'Dream Signs', icon: Sparkles, highlight: true },
        { to: '/lucid', label: 'Lucid Dreams', icon: Eye },
        { to: '/false-awakenings', label: 'False Awakenings', icon: AlertTriangle },
        { to: '/techniques', label: 'Techniques Guide', icon: Compass },
      ],
    },
    {
      title: 'Preferences',
      items: [
        { to: '/settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 h-full flex flex-col bg-[#0b0f19] border-r border-slate-800/80 text-slate-300 shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800/80 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30 celestial-glow">
          <Moon className="w-5 h-5 fill-indigo-200 text-indigo-100" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base tracking-wider text-slate-100 uppercase">Oneiric</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50 font-mono font-medium">v2.0</span>
          </div>
          <p className="text-xs text-slate-400 font-medium tracking-tight">Lucid Dream Studio</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="grow px-3 py-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onCloseMobile}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 celestial-glow font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-indigo-400'
                            : item.highlight
                            ? 'text-cyan-400'
                            : 'text-slate-400 group-hover:text-slate-300'
                        }`}
                      />
                      <span>{item.label}</span>
                      {item.highlight && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom Privacy & Offline Info Card */}
      <div className="p-4 m-3 rounded-xl bg-slate-900/60 border border-slate-800/70 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-indigo-400 font-medium mb-1">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Local & Private</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Your dreams remain strictly on this device via IndexedDB. No external servers or tracking.
        </p>
      </div>
    </aside>
  );
};
