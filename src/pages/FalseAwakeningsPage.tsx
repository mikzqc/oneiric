import React, { useState, useEffect } from 'react';
import { dreamService } from '../services/dreamService';
import { DreamEntry } from '../types/dream';
import { DreamDetailModal } from '../components/journal/DreamDetailModal';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate } from '../utils/dateUtils';
import {
  AlertTriangle,
  Home,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface FalseAwakeningsPageProps {
  onOpenNewDream: () => void;
  onEditDream?: (dream: DreamEntry) => void;
}

export const FalseAwakeningsPage: React.FC<FalseAwakeningsPageProps> = ({
  onOpenNewDream,
  onEditDream,
}) => {
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDreamForView, setSelectedDreamForView] = useState<DreamEntry | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const list = await dreamService.getFalseAwakeningDreams();
      setDreams(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleUpdate = () => {
      loadData();
    };
    window.addEventListener('oneiric:dream-saved', handleUpdate);
    window.addEventListener('oneiric:sample-data-changed', handleUpdate);
    return () => {
      window.removeEventListener('oneiric:dream-saved', handleUpdate);
      window.removeEventListener('oneiric:sample-data-changed', handleUpdate);
    };
  }, []);

  const totalFA = dreams.length;
  const lucidFA = dreams.filter((d) => d.lucidity === 'lucid').length;
  const believedAwakeCount = dreams.filter((d) => d.falseAwakeningDetails?.believedAwake ?? true).length;

  const lucidConversionRate = totalFA > 0 ? Math.round((lucidFA / totalFA) * 100) : 0;
  const believedAwakeRate = totalFA > 0 ? Math.round((believedAwakeCount / totalFA) * 100) : 0;

  // Extract recurring environments
  const envMap: Record<string, number> = {};
  dreams.forEach((d) => {
    const env = d.falseAwakeningDetails?.environmentDescription?.trim();
    if (env) {
      envMap[env] = (envMap[env] || 0) + 1;
    }
  });
  const topEnvironments = Object.entries(envMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-400" />
              <span>False Awakening Tracker</span>
            </h1>
            <span className="px-2 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-800 text-xs font-semibold">
              {totalFA} logged
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Analyze hyper-realistic illusions of waking up and transform them into conscious lucidity launchpads.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      {totalFA > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block mb-1">
              Recorded Occurrences
            </span>
            <div className="text-2xl font-bold text-slate-100">{totalFA}</div>
            <p className="text-xs text-slate-400 mt-1">Simulated awakenings captured</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-400">
                Lucidity Breakthrough Rate
              </span>
              <AlertTriangle className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-300">{lucidConversionRate}%</div>
            <p className="text-xs text-slate-400 mt-1">
              {lucidFA} of {totalFA} resulted in conscious lucidity
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <span className="text-xs font-semibold text-slate-400 block mb-1">
              Believed Awake
            </span>
            <div className="text-2xl font-bold text-slate-100">{believedAwakeRate}%</div>
            <p className="text-xs text-slate-400 mt-1">Initial cognitive deception rate</p>
          </div>

          {topEnvironments.length > 0 && (
            <div className="col-span-1 md:col-span-3 p-3.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs">
              <span className="text-slate-400 font-medium block mb-2">Recurring Simulated Environments:</span>
              <div className="flex flex-wrap gap-2">
                {topEnvironments.map(([env, count]) => (
                  <span
                    key={env}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700"
                  >
                    <Home className="w-3 h-3 text-slate-400" />
                    <span>{env}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-900 text-slate-300 text-[10px] font-mono">
                      {count}x
                    </span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Occurrences List or Educational Empty State */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : totalFA === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={<AlertTriangle className="w-8 h-8 text-blue-400" />}
            title="No False Awakenings Recorded Yet"
            description="A false awakening happens when you dream about waking up, getting out of bed, or performing morning routines while still asleep. You can mark any dream entry as a False Awakening in the Dream Editor."
            actionText="Record a Dream"
            onAction={onOpenNewDream}
          />

          {/* Educational Explainer */}
          <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Home className="w-4 h-4 text-blue-400" />
              <span>Why False Awakenings Are An Asset for Lucidity</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-blue-300 block mb-1">Peak REM Proximity</span>
                <p className="leading-relaxed text-slate-400">
                  False awakenings almost always occur during peak late-morning REM cycles when lucidity duration and vividness are highest.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-blue-300 block mb-1">Habitual Nose-Pinch</span>
                <p className="leading-relaxed text-slate-400">
                  Tying a reality check to the exact physical sensation of opening your eyes turns every simulated awakening into instantaneous lucidity.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-blue-300 block mb-1">Clocks & Mirrors</span>
                <p className="leading-relaxed text-slate-400">
                  Bedroom clocks, light switches, and bathroom mirrors are the most common anomaly triggers in false awakenings.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-100">Chronological False Awakening Ledger</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dreams.map((dream) => {
              const details = dream.falseAwakeningDetails;
              const isLucid = dream.lucidity === 'lucid';

              return (
                <div
                  key={dream.id}
                  onClick={() => setSelectedDreamForView(dream)}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-colors cursor-pointer space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{formatDate(dream.date)}</span>
                    </span>

                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md ${
                        isLucid
                          ? 'bg-blue-950 text-cyan-300 border border-cyan-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {isLucid ? 'Turned Lucid' : 'Non-Lucid'}
                    </span>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-100">{dream.title}</h3>

                  {details?.environmentDescription && (
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-slate-400 block font-medium">Apparent Environment:</span>
                      <p className="text-slate-200 mt-0.5">{details.environmentDescription}</p>
                    </div>
                  )}

                  {details?.triggerOrAnomaly && (
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                      <span className="text-blue-300 block font-medium">Illusion Breaker:</span>
                      <p className="mt-0.5">{details.triggerOrAnomaly}</p>
                    </div>
                  )}

                  <div className="pt-1 flex items-center justify-between text-xs text-blue-400 font-medium">
                    <span>Inspect Dream Entry</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <DreamDetailModal
        dream={selectedDreamForView}
        isOpen={!!selectedDreamForView}
        onClose={() => setSelectedDreamForView(null)}
        onEdit={(d) => {
          setSelectedDreamForView(null);
          if (onEditDream) onEditDream(d);
        }}
        onDelete={async () => {
          setSelectedDreamForView(null);
          await loadData();
        }}
      />
    </div>
  );
};
