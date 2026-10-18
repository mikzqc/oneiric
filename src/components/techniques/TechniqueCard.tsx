import React, { useState } from 'react';
import { TechniqueInfo } from '../../types/technique';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Brain,
  Sparkles,
  Link2,
} from 'lucide-react';

interface TechniqueCardProps {
  info: TechniqueInfo;
}

export const TechniqueCard: React.FC<TechniqueCardProps> = ({ info }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getDifficultyColor = (diff: TechniqueInfo['difficulty']) => {
    switch (diff) {
      case 'Beginner':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'Intermediate':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-700/60';
      case 'Advanced':
        return 'bg-blue-950/80 text-blue-300 border-blue-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between shadow-sm">
      <div className="space-y-3">
        {/* Top Badges & Timing */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-950/90 text-blue-300 border border-blue-700/60 font-mono">
              {info.acronym}
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${getDifficultyColor(
                info.difficulty
              )}`}
            >
              {info.difficulty}
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {info.category}
            </span>
          </div>

          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-blue-400" />
            <span>{info.recommendedTiming}</span>
          </span>
        </div>

        {/* Name & Short Description */}
        <div>
          <h3 className="text-sm sm:text-base font-bold text-slate-100">{info.name}</h3>
          <p className="text-xs text-slate-300 leading-relaxed mt-1">
            {info.shortDesc}
          </p>
        </div>

        {/* Prerequisites note */}
        {info.prerequisites && (
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/40 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
            <Sparkles className="w-3 h-3 text-blue-400 shrink-0" />
            <span><strong>Prerequisite:</strong> {info.prerequisites}</span>
          </div>
        )}

        {/* Expanded Protocol Details */}
        {isExpanded && (
          <div className="space-y-3.5 pt-3 border-t border-slate-800 text-xs text-slate-300">
            <p className="leading-relaxed text-slate-400">{info.description}</p>

            {/* Scientific Mechanism */}
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-blue-300 text-[11px]">
                <Brain className="w-3.5 h-3.5 text-blue-400" />
                <span>Neurocognitive Mechanism</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">
                {info.scientificMechanism}
              </p>
            </div>

            {/* Step-by-Step Protocol */}
            <div>
              <h4 className="font-semibold text-slate-200 mb-1.5 text-xs">
                Step-by-Step Execution Protocol:
              </h4>
              <ol className="space-y-1.5 list-decimal list-inside text-slate-300 leading-relaxed">
                {info.steps.map((step, idx) => (
                  <li key={idx} className="pl-1">
                    <span className="text-slate-200">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Keys to Success */}
            <div>
              <h4 className="font-semibold text-slate-200 mb-1.5 text-xs">
                Keys to Success & Best Practices:
              </h4>
              <ul className="space-y-1.5 text-slate-300">
                {info.bestPractices.map((bp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{bp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Common Pitfalls */}
            {info.commonPitfalls && info.commonPitfalls.length > 0 && (
              <div>
                <h4 className="font-semibold text-amber-300 mb-1.5 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Common Pitfalls to Avoid:</span>
                </h4>
                <ul className="space-y-1 text-slate-400 text-[11px]">
                  {info.commonPitfalls.map((pitfall, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{pitfall}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Synergies */}
            {info.synergies && info.synergies.length > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                  <Link2 className="w-3 h-3 text-blue-400" />
                  <span>Best Paired With:</span>
                </span>
                {info.synergies.map((syn) => (
                  <span
                    key={syn}
                    className="px-2 py-0.5 rounded text-[10px] bg-slate-900 text-blue-300 border border-slate-700 font-mono"
                  >
                    +{syn}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expand / Collapse Action */}
      <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs text-blue-400 hover:text-blue-200 flex items-center gap-1.5 cursor-pointer font-medium p-1 transition-colors"
        >
          <span>{isExpanded ? 'Collapse guide' : 'View full protocol & science'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <span className="text-[10px] text-slate-400 font-mono">
          {info.steps.length} steps
        </span>
      </div>
    </div>
  );
};
