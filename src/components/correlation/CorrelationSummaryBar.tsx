import React from 'react';
import { CorrelationReport } from '../../types/correlation';
import { TrendingUp, Eye, Network } from 'lucide-react';

interface CorrelationSummaryBarProps {
  report: CorrelationReport;
}

export const CorrelationSummaryBar: React.FC<CorrelationSummaryBarProps> = ({ report }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Total Analyzed Dreams */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Analyzed Dreams</span>
          <span className="font-mono text-[10px] text-blue-400">Sample N</span>
        </div>
        <div className="text-2xl font-bold text-slate-100">
          {report.totalDreamsAnalyzed}
        </div>
        <p className="text-[11px] text-slate-400">
          Filtered records in period
        </p>
      </div>

      {/* Baseline Lucidity */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Baseline Lucidity</span>
          <Eye className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-2xl font-bold text-slate-100">
          {report.baselineLucidityRate}%
        </div>
        <p className="text-[11px] text-slate-400">
          {report.totalLucidDreams} of {report.totalDreamsAnalyzed} lucid
        </p>
      </div>

      {/* Active Recurring Signs */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Tracked Signs</span>
          <Network className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-2xl font-bold text-slate-100">
          {report.activeSignsCount}
        </div>
        <p className="text-[11px] text-slate-400">
          Active categories evaluated
        </p>
      </div>

      {/* High-Impact Findings */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Notable Patterns</span>
          <TrendingUp className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-2xl font-bold text-amber-300">
          {report.notableFindingsCount}
        </div>
        <p className="text-[11px] text-slate-400">
          Effect size ≥ 15% with n ≥ 3
        </p>
      </div>
    </div>
  );
};
