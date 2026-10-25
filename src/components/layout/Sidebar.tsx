import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BarChart3,
  BookOpen,
  CalendarDays,
  Clock,
  Compass,
  Brain,
  Eye,
  AlertTriangle,
  Network,
  Settings,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const navSections = [
    {
      title: 'Journal',
      items: [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/journal', label: 'Dream Journal', icon: BookOpen },
        { to: '/timeline', label: 'Timeline', icon: Clock },
        { to: '/calendar', label: 'Calendar', icon: CalendarDays },
      ],
    },
    {
      title: 'Analysis & Lucidity',
      items: [
        { to: '/analytics', label: 'Analytics', icon: BarChart3 },
        { to: '/correlations', label: 'Correlations', icon: Network },
        { to: '/signs', label: 'Dream Signs', icon: Compass },
        { to: '/lucid', label: 'Lucid Dreams', icon: Eye },
        { to: '/false-awakenings', label: 'False Awakenings', icon: AlertTriangle },
        { to: '/techniques', label: 'Techniques Guide', icon: Brain },
      ],
    },
    {
      title: 'System',
      items: [
        { to: '/settings', label: 'Settings & Sync', icon: Settings },
        { to: '/faq', label: 'FAQ & Help', icon: HelpCircle },
      ],
    },
  ];

  return (
    <aside className="w-60 h-full flex flex-col bg-[#0b132b] border-r border-slate-800 text-slate-300 shrink-0 select-none">
      {/* Brand Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-md bg-[#132042] border border-blue-500/30 flex items-center justify-center shrink-0 overflow-hidden p-1">
          <img src="/logo.png" alt="Oneiric" className="w-full h-full object-contain" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-wide text-slate-100">Oneiric</span>
          </div>
          <p className="text-[11px] text-slate-400 font-normal">Dream Journal & Analysis</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="grow px-2.5 py-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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
                    `flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-300 font-semibold border-l-2 border-blue-500 pl-2'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isActive ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Privacy Notice */}
      <div className="p-3 m-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 text-blue-400 font-medium mb-0.5">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Local & Private</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-normal">
          Entries stay locally on this device in IndexedDB.
        </p>
      </div>
    </aside>
  );
};
