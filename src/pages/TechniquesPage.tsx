import React, { useState, useEffect } from 'react';
import { techniqueService, TechniqueComparisonStat } from '../services/techniqueService';
import {
  TECHNIQUE_CATALOG,
  TechniqueLog,
  TechniqueType,
} from '../types/technique';
import { TechniqueModal } from '../components/techniques/TechniqueModal';
import { TechniqueCard } from '../components/techniques/TechniqueCard';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Button } from '../components/common/Button';
import { formatDate } from '../utils/dateUtils';
import {
  Compass,
  Sparkles,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  TrendingUp,
  BarChart2,
  Clock,
  Star,
  Info,
} from 'lucide-react';

export const TechniquesPage: React.FC = () => {
  const [logs, setLogs] = useState<TechniqueLog[]>([]);
  const [stats, setStats] = useState<{
    totalAttempts: number;
    lucidCount: number;
    recalledCount: number;
    noRecallCount: number;
    lucidRate: number;
    overallRecallRate: number;
    comparisons: TechniqueComparisonStat[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modal for logging an attempt
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedInitialTech, setSelectedInitialTech] = useState<TechniqueType>('MILD');

  // Deletion state
  const [logToDelete, setLogToDelete] = useState<TechniqueLog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allLogs, techStats] = await Promise.all([
        techniqueService.getAllLogs(),
        techniqueService.getTechniqueStats(),
      ]);
      setLogs(allLogs);
      setStats(techStats);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenLogModal = (technique: TechniqueType = 'MILD') => {
    setSelectedInitialTech(technique);
    setIsLogModalOpen(true);
  };

  const handleLogSaved = async () => {
    await loadData();
  };

  const handleDeleteConfirm = async () => {
    if (!logToDelete) return;
    try {
      setIsDeleting(true);
      await techniqueService.deleteLog(logToDelete.id);
      setLogToDelete(null);
      await loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <Compass className="w-6 h-6 text-indigo-400" />
            <span>Technique Laboratory</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Systematic induction methods, evidence-based protocols, and observed experimental outcomes
          </p>
        </div>

        <Button
          variant="celestial"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => handleOpenLogModal('MILD')}
        >
          Log Induction Attempt
        </Button>
      </div>

      {/* Observed Metrics Notice & Stats */}
      {stats && stats.totalAttempts > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 block font-medium">Logged Attempts</span>
              <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
                {stats.totalAttempts}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40">
              <span className="text-xs text-cyan-300 block font-medium">Lucid Outcomes</span>
              <span className="text-2xl font-extrabold text-cyan-300 mt-1 block">
                {stats.lucidCount}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-800/40">
              <span className="text-xs text-indigo-300 block font-medium">Recalled Dreams</span>
              <span className="text-2xl font-extrabold text-indigo-300 mt-1 block">
                {stats.recalledCount}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-xs text-slate-400 block font-medium">Observed Lucid Rate</span>
              <span className="text-2xl font-extrabold text-slate-100 mt-1 block">
                {stats.lucidRate}%
              </span>
            </div>
          </div>

          {/* Technique Comparison Breakdown with Sample Size (n) */}
          {stats.comparisons && stats.comparisons.length > 0 && (
            <div className="rounded-2xl border border-slate-800/80 bg-[#0c1222]/80 p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-indigo-400" />
                    <span>Technique Comparison & Correlation Ledger</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Empirical personal correlations. Each comparison requires and explicitly shows sample size <strong className="text-slate-300 font-mono">(n)</strong>.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-400 uppercase tracking-wider text-[11px] bg-slate-900/40">
                      <th className="py-2.5 px-3">Induction Technique</th>
                      <th className="py-2.5 px-3">Sample Size (n)</th>
                      <th className="py-2.5 px-3">Lucid Rate</th>
                      <th className="py-2.5 px-3">Recall Rate</th>
                      <th className="py-2.5 px-3">Avg Confidence</th>
                      <th className="py-2.5 px-3">Statistical Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    {stats.comparisons.map((c) => (
                      <tr key={c.technique} className="hover:bg-slate-800/20 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-200 whitespace-nowrap">
                          {c.technique}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                            n = {c.sampleSize}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-cyan-300">{c.lucidRate}%</span>
                            <span className="text-[11px] text-slate-500 font-mono">({c.lucidCount}/{c.sampleSize})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-indigo-300">{c.recallRate}%</span>
                            <span className="text-[11px] text-slate-500 font-mono">({c.lucidCount + c.recalledCount}/{c.sampleSize})</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {c.averageConfidence ? (
                            <span className="flex items-center gap-1 text-amber-300 font-mono text-xs">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              <span>{c.averageConfidence} / 5</span>
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">Not rated</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-400">
                          {c.sampleSize < 5 ? (
                            <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
                              <Info className="w-3 h-3 shrink-0" />
                              <span>Small sample (n &lt; 5). Gather more nights before drawing inferences.</span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-emerald-400/90 font-medium">
                              Sufficient sample (n ≥ 5)
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Scientific Rigor & Sleep Health Disclaimer */}
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>
                    <strong className="text-slate-300">Methodological note:</strong> Personal tracking indicates association, not scientific proof of causation. Prior REM debt, diet, bedtime consistency, and natural biorhythms heavily modulate lucidity.
                  </p>
                  <p className="text-slate-500">
                    Never curtail healthy sleep duration or set disruptive hourly alarms solely to collect technique data points. Lucid dreaming should enhance, not degrade, sleep architecture.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Logged Attempts Ledger */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Attempt History</h2>
            <p className="text-xs text-slate-400">Chronological log of your induction practices and outcomes</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            icon={<Plus className="w-3.5 h-3.5 text-indigo-400" />}
            onClick={() => handleOpenLogModal('MILD')}
          >
            New Log
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center min-h-[20vh]">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-400 space-y-3">
            <p>No induction attempts recorded yet.</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleOpenLogModal('MILD')}
            >
              Log Your First Practice
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-[#0f172a]/60 shadow-lg">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Date & Timing</th>
                  <th className="py-3 px-4">Technique Protocols</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Observed Outcome</th>
                  <th className="py-3 px-4">Notes & Observations</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 font-medium text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDate(log.date)}</span>
                        </div>
                        {(log.bedTime || log.wakeTime) && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                            <Clock className="w-3 h-3 text-slate-600" />
                            <span>{log.bedTime || '—'} → {log.wakeTime || '—'}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-200">
                          {log.technique === 'Other' && log.customTechniqueName
                            ? log.customTechniqueName
                            : log.technique}
                        </span>
                        {log.secondaryTechniques && log.secondaryTechniques.map((sec) => (
                          <span
                            key={sec}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-mono"
                          >
                            +{sec}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {log.confidenceRating ? (
                        <div className="flex items-center gap-1 text-amber-300 text-xs">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span>{log.confidenceRating}/5</span>
                        </div>
                      ) : (
                        <span className="text-slate-600 italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium text-[11px] ${
                          log.outcome === 'lucid_dream'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/60 shadow-sm shadow-cyan-900/30'
                            : log.outcome === 'dream_recalled'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/60'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {log.outcome === 'lucid_dream' && (
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                        )}
                        <span>
                          {log.outcome === 'lucid_dream'
                            ? 'Lucid Dream'
                            : log.outcome === 'dream_recalled'
                            ? 'Dream Recalled'
                            : 'No Recall'}
                        </span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                      {log.notes || <span className="text-slate-600 italic">No notes</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setLogToDelete(log)}
                        className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete log"
                        aria-label="Delete technique log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Technique Guide Catalog */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            <span>Induction Protocols Knowledge Base</span>
          </h2>
          <p className="text-xs text-slate-400">
            Scientifically validated methods and mental frameworks for initiating lucid consciousness
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TECHNIQUE_CATALOG.map((tech) => (
            <TechniqueCard
              key={tech.id}
              info={tech}
              onLogThisTechnique={(techId) => handleOpenLogModal(techId)}
            />
          ))}
        </div>
      </div>

      {/* Log Modal */}
      <TechniqueModal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        onLogSaved={handleLogSaved}
        initialTechnique={selectedInitialTech}
      />

      {/* Delete Log Confirmation */}
      <ConfirmDialog
        isOpen={!!logToDelete}
        onClose={() => setLogToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Technique Attempt"
        message={`Delete the ${logToDelete?.technique} attempt recorded on ${
          logToDelete ? formatDate(logToDelete.date) : ''
        }?`}
        confirmText="Delete Attempt"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};
