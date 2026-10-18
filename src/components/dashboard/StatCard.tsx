import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  variant?: 'default' | 'lucid' | 'streak' | 'weekly';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  onClick,
}) => {
  const iconColors = {
    default: 'text-slate-400 bg-slate-800/80 border-slate-700/60',
    lucid: 'text-sky-300 bg-sky-950/60 border-sky-800/50',
    streak: 'text-amber-300 bg-amber-950/60 border-amber-800/50',
    weekly: 'text-blue-300 bg-blue-950/60 border-blue-800/50',
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border border-slate-800 bg-[#0f172a]/70 transition-colors flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-slate-700 hover:bg-[#121c35]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2.5">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        <div className={`w-8 h-8 rounded-lg border ${iconColors[variant]} flex items-center justify-center shrink-0`}>
          {icon}
        </div>
      </div>

      <div>
        <div className="text-2xl font-bold text-slate-100 tracking-tight mb-0.5">
          {value}
        </div>
        <p className="text-xs text-slate-400 font-normal">{subtitle}</p>
      </div>
    </div>
  );
};
