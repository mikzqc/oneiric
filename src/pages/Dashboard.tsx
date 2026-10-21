import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dreamService, RecallRange } from '../services/dreamService';
import { techniqueService } from '../services/techniqueService';
import { backupService } from '../services/backupService';
import { DreamEntry } from '../types/dream';
import { TechniqueLog } from '../types/technique';
import { StatCard } from '../components/dashboard/StatCard';
import { RecallChart } from '../components/dashboard/RecallChart';
import { DreamCard } from '../components/journal/DreamCard';
import { DreamDetailModal } from '../components/journal/DreamDetailModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { formatDate, getTodayDateString } from '../utils/dateUtils';
import {
  BookOpen,
  Sparkles,
  Flame,
  Calendar,
  Compass,
  ArrowRight,
  Plus,
  Trash2,
} from 'lucide-react';

interface DashboardStats {
  totalDreams: number;
  totalLucid: number;
  weeklyDreams: number;
  currentStreak: number;
  recentDreams: DreamEntry[];
  recallChartData: {
    date: string;
    label: string;
    fullLabel: string;
    count: number;
    lucidCount: number;
  }[];
  hasEntries: boolean;
  todayRecorded: boolean;
}

interface DashboardProps {
  onOpenNewDream: () => void;
  onEditDream: (dream: DreamEntry) => void;
}

const RECALL_RANGE_OPTIONS: { value: RecallRange; label: string; shortLabel: string }[] = [
  { value: '1w', label: '1 Week', shortLabel: '1W' },
  { value: '2w', label: '2 Weeks', shortLabel: '2W' },
  { value: '3w', label: '3 Weeks', shortLabel: '3W' },
  { value: '1m', label: '1 Month', shortLabel: '1M' },
  { value: 'all', label: 'All Time', shortLabel: 'All' },
];

const RECALL_RANGE_TITLES: Record<RecallRange, string> = {
  '1w': '7-Day Recall Activity',
  '2w': '14-Day Recall Activity',
  '3w': '21-Day Recall Activity',
  '1m': '30-Day Recall Activity',
  'all': 'All-Time Recall Activity',
};

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenNewDream,
  onEditDream,
}) => {
  const navigate = useNavigate();

  const [recallRange, setRecallRange] = useState<RecallRange>(() => {
    try {
      const saved = localStorage.getItem('oneiric_recall_range');
      if (saved === '1w' || saved === '2w' || saved === '3w' || saved === '1m' || saved === 'all') {
        return saved;
      }
    } catch {
      // ignore
    }
    return '1w';
  });

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTechniques, setRecentTechniques] = useState<TechniqueLog[]>([]);
  const [allTechniques, setAllTechniques] = useState<TechniqueLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // No-recall log state & modal
  const [isNoRecallModalOpen, setIsNoRecallModalOpen] = useState(false);
  const [isAllRecallModalOpen, setIsAllRecallModalOpen] = useState(false);
  const [noRecallDate, setNoRecallDate] = useState(getTodayDateString());
  const [noRecallNotes, setNoRecallNotes] = useState('No dreams remembered');
  const [isSavingNoRecall, setIsSavingNoRecall] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);

  // Modals for dream card interactions
  const [selectedDreamForView, setSelectedDreamForView] = useState<DreamEntry | null>(null);
  const [dreamToDelete, setDreamToDelete] = useState<DreamEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadDashboardData = async (targetRange: RecallRange = recallRange) => {
    try {
      setIsLoading(true);
      const [dashStats, techLogs] = await Promise.all([
        dreamService.getDashboardStats(new Date(), targetRange),
        techniqueService.getAllLogs(),
      ]);
      setStats(dashStats);
      setAllTechniques(techLogs);
      setRecentTechniques(techLogs.slice(0, 5));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRangeChange = async (newRange: RecallRange) => {
    setRecallRange(newRange);
    try {
      localStorage.setItem('oneiric_recall_range', newRange);
    } catch {
      // ignore
    }
    try {
      const chartData = await dreamService.getRecallChartData(newRange);
      setStats((prev) => (prev ? { ...prev, recallChartData: chartData } : null));
    } catch (err) {
      console.error('Failed to update recall chart range:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const handleUpdate = () => {
      loadDashboardData();
    };
    window.addEventListener('oneiric:dream-saved', handleUpdate);
    window.addEventListener('oneiric:sample-data-changed', handleUpdate);
    return () => {
      window.removeEventListener('oneiric:dream-saved', handleUpdate);
      window.removeEventListener('oneiric:sample-data-changed', handleUpdate);
    };
  }, []);

  const handleSaveNoRecall = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noRecallDate) return;
    try {
      setIsSavingNoRecall(true);
      await techniqueService.createLog({
        date: noRecallDate,
        technique: 'Recall Check-in',
        outcome: 'no_recall',
        notes: noRecallNotes.trim() || 'No dreams remembered',
      });
      setIsNoRecallModalOpen(false);
      setNoRecallNotes('No dreams remembered');
      await loadDashboardData();
    } finally {
      setIsSavingNoRecall(false);
    }
  };

  const handleDeleteRecallLog = async (id: string) => {
    try {
      setDeletingLogId(id);
      await techniqueService.deleteLog(id);
      await loadDashboardData();
    } finally {
      setDeletingLogId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!dreamToDelete) return;
    try {
      setIsDeleting(true);
      await dreamService.deleteDream(dreamToDelete.id);
      setDreamToDelete(null);
      await loadDashboardData();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLoadSampleData = async () => {
    await backupService.loadSampleData();
    await loadDashboardData();
  };

  if (isLoading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Consulting the dream ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="p-5 sm:p-6 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track nocturnal recall, inspect dream signs, and monitor practice consistency.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={onOpenNewDream}
          >
            Record Dream
          </Button>
          <Button
            variant="secondary"
            size="md"
            icon={<Compass className="w-4 h-4 text-slate-400" />}
            onClick={() => navigate('/techniques')}
          >
            Techniques
          </Button>
        </div>
      </div>

      {/* Primary Metrics Grid (4 Stats derived from actual stored data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Recorded"
          value={stats.totalDreams}
          subtitle={stats.totalDreams === 1 ? '1 dream preserved' : `${stats.totalDreams} dreams preserved`}
          icon={<BookOpen className="w-5 h-5" />}
          variant="default"
          onClick={() => navigate('/journal')}
        />

        <StatCard
          title="Recalled This Week"
          value={stats.weeklyDreams}
          subtitle="Past 7 days recall count"
          icon={<Calendar className="w-5 h-5" />}
          variant="weekly"
        />

        <StatCard
          title="Lucid Dreams"
          value={stats.totalLucid}
          subtitle={
            stats.totalDreams > 0
              ? `${Math.round((stats.totalLucid / stats.totalDreams) * 100)}% lucidity rate`
              : '0% lucidity rate'
          }
          icon={<Sparkles className="w-5 h-5" />}
          variant="lucid"
          onClick={() => navigate('/lucid')}
        />

        <StatCard
          title="Journaling Streak"
          value={`${stats.currentStreak} ${stats.currentStreak === 1 ? 'day' : 'days'}`}
          subtitle={
            stats.todayRecorded
              ? 'Active streak: Logged today!'
              : stats.currentStreak > 0
              ? 'Recorded yesterday; record today to continue!'
              : 'Record today to start a streak'
          }
          icon={<Flame className="w-5 h-5" />}
          variant="streak"
        />
      </div>

      {/* Main Content Area: Recall Chart & Quick Activity */}
      {stats.hasEntries ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recall Frequency Chart (2 cols) */}
          <div className="lg:col-span-2 p-5 sm:p-6 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-100">
                  {RECALL_RANGE_TITLES[recallRange]}
                </h2>
                <p className="text-xs text-slate-400">Total entries and lucid dreams per night</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Range Selector */}
                <div
                  role="group"
                  aria-label="Recall date range"
                  className="inline-flex items-center p-0.5 rounded-lg bg-[#0b132b] border border-slate-800 text-xs"
                >
                  {RECALL_RANGE_OPTIONS.map((opt) => {
                    const isSelected = recallRange === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleRangeChange(opt.value)}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <span className="hidden sm:inline">{opt.label}</span>
                        <span className="sm:hidden">{opt.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-3 text-xs pl-1">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                    <span>Total</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-cyan-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" />
                    <span>Lucid</span>
                  </div>
                </div>
              </div>
            </div>

            <RecallChart data={stats.recallChartData} />
          </div>

          {/* No-Dream Days & Recall (1 col) */}
          <div className="p-5 sm:p-6 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-slate-100">
                  Unremembered Days
                </h2>
                <div className="flex items-center gap-2">
                  {allTechniques.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsAllRecallModalOpen(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer font-medium"
                    >
                      View all ({allTechniques.length})
                    </button>
                  )}
                  <Button
                    size="xs"
                    variant="outline"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={() => {
                      setNoRecallDate(getTodayDateString());
                      setNoRecallNotes('No dreams remembered');
                      setIsNoRecallModalOpen(true);
                    }}
                  >
                    Log Day
                  </Button>
                </div>
              </div>

              {recentTechniques.length === 0 ? (
                <div className="p-5 text-center rounded-lg bg-slate-900/40 border border-slate-800 text-xs text-slate-400">
                  <p>No unremembered nights logged yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Log days without recall to maintain accurate statistics.
                  </p>
                  <Button
                    size="xs"
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setNoRecallDate(getTodayDateString());
                      setNoRecallNotes('No dreams remembered');
                      setIsNoRecallModalOpen(true);
                    }}
                  >
                    Log Unremembered Day
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTechniques.map((tech) => (
                    <div
                      key={tech.id}
                      className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-3 group hover:border-slate-700 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">
                            {formatDate(tech.date)}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                            {tech.outcome === 'no_recall' ? 'No Recall' : tech.technique}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          {tech.notes || (tech.outcome === 'no_recall' ? 'No dreams remembered' : tech.technique)}
                        </p>
                      </div>

                      <button
                        type="button"
                        title="Delete check-in"
                        disabled={deletingLogId === tech.id}
                        onClick={() => handleDeleteRecallLog(tech.id)}
                        className="opacity-40 group-hover:opacity-100 hover:text-rose-400 text-slate-400 p-1 rounded hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 mt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/timeline')}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <span>View Timeline</span>
                <ArrowRight className="w-3 h-3" />
              </button>
              {allTechniques.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAllRecallModalOpen(true)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-medium cursor-pointer"
                >
                  View all {allTechniques.length} days &rarr;
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty State for New Users */
        <EmptyState
          title="No dreams recorded yet"
          description="Recording dreams promptly upon waking strengthens recall frequency and detail. Log your first dream to begin tracking patterns and signs."
          actionText="Record First Dream"
          onAction={onOpenNewDream}
          secondaryActionText="Load Sample Data"
          onSecondaryAction={handleLoadSampleData}
        />
      )}

      {/* Recent Dream Entries Section */}
      {stats.hasEntries && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-100">Recent Dream Entries</h2>
              <p className="text-xs text-slate-400">Latest recordings from your nocturnal ledger</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
              onClick={() => navigate('/journal')}
            >
              View Journal
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.recentDreams.map((dream) => (
              <DreamCard
                key={dream.id}
                dream={dream}
                onView={setSelectedDreamForView}
                onEdit={onEditDream}
                onDelete={setDreamToDelete}
              />
            ))}
          </div>
        </div>
      )}

      {/* Dream Detail Modal */}
      <DreamDetailModal
        dream={selectedDreamForView}
        isOpen={!!selectedDreamForView}
        onClose={() => setSelectedDreamForView(null)}
        onEdit={(d) => {
          setSelectedDreamForView(null);
          onEditDream(d);
        }}
        onDelete={(d) => {
          setSelectedDreamForView(null);
          setDreamToDelete(d);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!dreamToDelete}
        onClose={() => setDreamToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Permanently Delete Dream"
        message={`Are you sure you want to permanently delete "${dreamToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Dream"
        isDestructive={true}
        isLoading={isDeleting}
      />

      {/* Log Day Without Dream Modal */}
      <Modal
        isOpen={isNoRecallModalOpen}
        onClose={() => setIsNoRecallModalOpen(false)}
        title="Log Day Without Dream Recall"
        subtitle="Keep your recall frequency honest by noting unremembered nights"
        maxWidth="md"
      >
        <form onSubmit={handleSaveNoRecall} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Date
            </label>
            <input
              type="date"
              value={noRecallDate}
              onChange={(e) => setNoRecallDate(e.target.value)}
              required
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Reason or Observation
            </label>
            <input
              type="text"
              value={noRecallNotes}
              onChange={(e) => setNoRecallNotes(e.target.value)}
              placeholder="e.g. No dreams remembered, Slept over alarm, etc."
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-blue-500 transition-colors"
            />

            <div className="mt-3">
              <span className="text-[11px] text-slate-400 block mb-1.5">Quick selections:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'No dreams remembered',
                  'Slept over alarm',
                  'Woke up early in a rush',
                  'Fragmented / poor sleep',
                  'Failed tech',
                  'Had to wake up early for event',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setNoRecallNotes(reason)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      noRecallNotes === reason
                        ? 'bg-blue-600/30 text-blue-200 border-blue-500/50'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700/60 hover:border-slate-600 hover:text-slate-200'
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsNoRecallModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSavingNoRecall || !noRecallDate}
            >
              {isSavingNoRecall ? 'Saving...' : 'Save Check-in'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View All No-Dream Days Modal */}
      <Modal
        isOpen={isAllRecallModalOpen}
        onClose={() => setIsAllRecallModalOpen(false)}
        title={`All Logged No-Dream Days (${allTechniques.length})`}
        subtitle="Chronological archive of nights without dream recall"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <p className="text-xs text-slate-400">
              Listing all recorded unremembered nights and recall check-ins
            </p>
            <Button
              size="sm"
              variant="primary"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setNoRecallDate(getTodayDateString());
                setNoRecallNotes('No dreams remembered');
                setIsNoRecallModalOpen(true);
              }}
            >
              Log Day
            </Button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {allTechniques.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-lg border border-slate-800">
                No unremembered nights logged yet.
              </div>
            ) : (
              allTechniques.map((tech) => (
                <div
                  key={tech.id}
                  className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 group hover:border-slate-700 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">
                        {formatDate(tech.date)}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                        {tech.outcome === 'no_recall' ? 'No Recall' : tech.technique}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {tech.notes || (tech.outcome === 'no_recall' ? 'No dreams remembered' : tech.technique)}
                    </p>
                  </div>

                  <button
                    type="button"
                    title="Delete check-in"
                    disabled={deletingLogId === tech.id}
                    onClick={() => handleDeleteRecallLog(tech.id)}
                    className="opacity-40 group-hover:opacity-100 hover:text-rose-400 text-slate-400 p-1.5 rounded hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAllRecallModalOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
