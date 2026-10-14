import React, { useState } from 'react';
import { TechniqueInfo } from '../../types/technique';
import { Button } from '../common/Button';
import { Clock, CheckCircle2, ChevronDown, ChevronUp, Plus } from 'lucide-react';

interface TechniqueCardProps {
  info: TechniqueInfo;
  onLogThisTechnique: (technique: TechniqueInfo['id']) => void;
}

export const TechniqueCard: React.FC<TechniqueCardProps> = ({
  info,
  onLogThisTechnique,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 hover:border-slate-700/80 transition-all flex flex-col justify-between shadow-md">
      <div>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
          <h3 className="text-base font-bold text-slate-100">{info.name}</h3>
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-indigo-400" />
            <span>{info.recommendedTiming}</span>
          </span>
        </div>

        {/* Short description */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
          {info.shortDesc}
        </p>

        {/* Expanded Steps & Best Practices */}
        {isExpanded && (
          <div className="space-y-4 pt-3 border-t border-slate-800/80 text-xs text-slate-300 animate-fadeIn">
            <p className="leading-relaxed text-slate-400">{info.description}</p>

            <div>
              <h4 className="font-semibold text-slate-200 mb-2 uppercase tracking-wider text-[11px]">
                Execution Protocol:
              </h4>
              <ol className="space-y-2 list-decimal list-inside text-slate-300 leading-relaxed">
                {info.steps.map((step, idx) => (
                  <li key={idx} className="pl-1">
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div>
              <h4 className="font-semibold text-slate-200 mb-2 uppercase tracking-wider text-[11px]">
                Keys to Success:
              </h4>
              <ul className="space-y-1.5 text-slate-300">
                {info.bestPractices.map((bp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                    <span>{bp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="pt-4 mt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-indigo-400 hover:text-indigo-200 flex items-center gap-1 cursor-pointer font-medium p-1"
        >
          <span>{isExpanded ? 'Less detail' : 'View full guide'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <Button
          size="sm"
          variant="secondary"
          icon={<Plus className="w-3.5 h-3.5 text-indigo-400" />}
          onClick={() => onLogThisTechnique(info.id)}
        >
          Log Practice
        </Button>
      </div>
    </div>
  );
};
