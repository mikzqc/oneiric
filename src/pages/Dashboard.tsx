import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dreamService } from '../services/dreamService';
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
  Moon,
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

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenNewDream,
  onEditDream,
}) => {
  const navigate = useNavigate();

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

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [dashStats, techLogs] = await Promise.all([
        dreamService.getDashboardStats(),
        techniqueService.getAllLogs(),
      ]);
      setStats(dashStats);
      setAllTechniques(techLogs);
      setRecentTechniques(techLogs.slice(0, 5));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
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
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-xs text-slate-400">Consulting the dream ledger...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner / Hero Welcome */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[#0e1730] border border-slate-800/80 shadow-2xl relative overflow-hidden celestial-glow">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/70 border border-indigo-700/50 text-xs text-indigo-300 font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Conscious Dream Archive</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
              Welcome to the Celestial Threshold
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              Track your nocturnal journeys, cultivate dream recall consistency, and unlock regular lucidity through grounded practice.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button
              variant="celestial"
              size="lg"
              icon={<Plus className="w-5 h-5" />}
              onClick={onOpenNewDream}
            >
              Record a Dream
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={<Compass className="w-4 h-4 text-indigo-400" />}
              onClick={() => navigate('/techniques')}
            >
              Explore Techniques
            </Button>
          </div>
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

      {/* Main Content Area: 7-Day Chart & Quick Activity */}
      {stats.hasEntries ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-Day Recall Frequency Chart (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-xl flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-100">7-Day Dream Recall Activity</h2>
                <p className="text-xs text-slate-400">Total dreams and lucid awakenings per night</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Total</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span>Lucid</span>
                </div>
              </div>
            </div>

            <RecallChart data={stats.recallChartData} />
          </div>

          {/* No-Dream Days & Recall (1 col) */}
          <div className="p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span>No-Dream Days & Recall</span>
                </h2>
                <div className="flex items-center gap-2">
                  {allTechniques.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsAllRecallModalOpen(true)}
                      className="text-xs text-indigo-400 hover:text-indigo-200 cursor-pointer font-medium"
                    >
                      View all ({allTechniques.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setNoRecallDate(getTodayDateString());
                      setNoRecallNotes('No dreams remembered');
                      setIsNoRecallModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-200 cursor-pointer font-medium bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Day</span>
                  </button>
                </div>
              </div>

              {recentTechniques.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400">
                  <p>No unremembered nights logged yet.</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Did you wake up without recalling a dream? Log it to keep your stats honest.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => {
                      setNoRecallDate(getTodayDateString());
                      setNoRecallNotes('No dreams remembered');
                      setIsNoRecallModalOpen(true);
                    }}
                  >
                    + Log Day Without Dream
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {recentTechniques.map((tech) => (
                    <div
                      key={tech.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3 group hover:border-slate-700 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">
                            {formatDate(tech.date)}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
                            {tech.outcome === 'no_recall' ? 'No Recall' : tech.technique}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 truncate">
                          {tech.notes || (tech.outcome === 'no_recall' ? 'No dreams remembered' : tech.technique)}
                        </p>
                      </div>

                      <button
                        type="button"
                        title="Delete check-in"
                        disabled={deletingLogId === tech.id}
                        onClick={() => handleDeleteRecallLog(tech.id)}
                        className="opacity-40 group-hover:opacity-100 hover:text-rose-400 text-slate-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate('/timeline')}
                className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1 cursor-pointer"
              >
                <span>View Timeline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              {allTechniques.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsAllRecallModalOpen(true)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
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
          title="Your Dream Archive is a Blank Sky"
          description="Recording dreams immediately upon waking dramatically boosts recall vividness and prefrontal cortex awareness during REM sleep. Log your first dream to begin mapping your personal dream signs."
          actionText="Record Your First Dream"
          onAction={onOpenNewDream}
          secondaryActionText="Preview Sample Data (Temporary)"
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
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
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
              className="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-700/80 rounded-xl text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
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
                        ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/50'
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
              variant="celestial"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => {
                setNoRecallDate(getTodayDateString());
                setNoRecallNotes('No dreams remembered');
                setIsNoRecallModalOpen(true);
              }}
            >
              + Log Day
            </Button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
            {allTechniques.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
                No unremembered nights logged yet.
              </div>
            ) : (
              allTechniques.map((tech) => (
                <div
                  key={tech.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-3 group hover:border-slate-700 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-200">
                        {formatDate(tech.date)}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-800 text-slate-400 border border-slate-700/60">
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
                    className="opacity-40 group-hover:opacity-100 hover:text-rose-400 text-slate-400 p-2 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
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
