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
  const variantStyles = {
    default: 'border-slate-800/80 bg-[#0f172a]/70 hover:border-slate-700/80',
    lucid: 'border-cyan-500/30 bg-[#0f172a]/90 hover:border-cyan-400/50 shadow-lg shadow-cyan-950/20 lucid-glow',
    streak: 'border-amber-500/30 bg-[#0f172a]/90 hover:border-amber-400/50 shadow-lg shadow-amber-950/20',
    weekly: 'border-blue-500/30 bg-[#0f172a]/90 hover:border-blue-400/50 shadow-lg shadow-blue-950/20 celestial-glow',
  };

  const iconColors = {
    default: 'bg-slate-800/80 text-slate-300 border-slate-700/60',
    lucid: 'bg-cyan-950/70 text-cyan-400 border-cyan-800/50',
    streak: 'bg-amber-950/70 text-amber-400 border-amber-800/50',
    weekly: 'bg-blue-950/70 text-blue-400 border-blue-800/50',
  };

  return (
    <div
      onClick={onClick}
      className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
        variantStyles[variant]
      } ${onClick ? 'cursor-pointer hover:translate-y-[-2px]' : ''}`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</span>
        <div className={`p-2.5 rounded-xl border ${iconColors[variant]} shrink-0`}>
          {icon}
        </div>
      </div>

      <div>
        <div className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight mb-1">
          {value}
        </div>
        <p className="text-xs text-slate-400 font-medium">{subtitle}</p>
      </div>
    </div>
  );
};
