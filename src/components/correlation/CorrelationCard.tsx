import React from 'react';
import { ConfidenceRating } from '../../types/correlation';
import { DreamSignCategory } from '../../types/dreamSign';
import { ExternalLink, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface CorrelationCardProps {
  title: string;
  category?: DreamSignCategory | string;
  statusBadge?: React.ReactNode;
  sampleSize: number;
  rateWithElement: number;
  baselineRate: number;
  rateDifference: number;
  relativeRisk?: number | null;
  confidence: ConfidenceRating;
  unit?: string;
  metricLabel?: string;
  isInverseDesirable?: boolean;
  onInspect: () => void;
}

export const CorrelationCard: React.FC<CorrelationCardProps> = ({
  title,
  category,
  statusBadge,
  sampleSize,
  rateWithElement,
  baselineRate,
  rateDifference,
  relativeRisk,
  confidence,
  unit = '%',
  metricLabel = 'Lucidity Rate',
  onInspect,
}) => {
  const isPositive = rateDifference > 0;
  const isZero = rateDifference === 0;

  const getConfidenceBadge = (conf: ConfidenceRating) => {
    if (conf === 'high') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-950 text-emerald-300 border border-emerald-800/60">
          High Evidence (n ≥ 5)
        </span>
      );
    }
    if (conf === 'moderate') {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-950 text-blue-300 border border-blue-800/60">
          Moderate (n = {sampleSize})
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-900 text-slate-400 border border-slate-800">
        Low Sample (n &lt; 3)
      </span>
    );
  };

  return (
    <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-3">
      {/* Card Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            {category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 capitalize font-medium">
                {category}
              </span>
            )}
            {statusBadge}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
            Sample size: <strong className="text-slate-300">{sampleSize} distinct {sampleSize === 1 ? 'dream' : 'dreams'}</strong>
          </p>
        </div>

        {getConfidenceBadge(confidence)}
      </div>

      {/* Comparison Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-lg bg-slate-950/70 border border-slate-800/60 text-xs">
        {/* Rate With Element */}
        <div>
          <span className="text-[10px] text-slate-400 block">{metricLabel}</span>
          <span className="text-base font-bold text-slate-100">
            {rateWithElement}
            {unit}
          </span>
        </div>

        {/* Baseline Rate */}
        <div>
          <span className="text-[10px] text-slate-400 block">Baseline Rate</span>
          <span className="text-base font-semibold text-slate-400">
            {baselineRate}
            {unit}
          </span>
        </div>

        {/* Rate Difference */}
        <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 pt-1.5 sm:pt-0 border-slate-800/60">
          <span className="text-[10px] text-slate-400 block">Shift vs. Baseline</span>
          <div className="flex items-center gap-1">
            {isZero ? (
              <Minus className="w-3.5 h-3.5 text-slate-400" />
            ) : isPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span
              className={`text-base font-bold ${
                isZero
                  ? 'text-slate-400'
                  : isPositive
                  ? 'text-emerald-300'
                  : 'text-amber-300'
              }`}
            >
              {isPositive ? `+${rateDifference}` : rateDifference}
              {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Insight & Drilldown CTA */}
      <div className="flex items-center justify-between text-xs pt-1">
        <div>
          {typeof relativeRisk === 'number' && relativeRisk > 0 && (
            <span className="text-[11px] text-slate-400">
              Risk Ratio: <strong className="text-blue-300 font-mono">{relativeRisk}x</strong> vs non-sign nights
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onInspect}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
        >
          <span>Inspect {sampleSize} Dreams</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
