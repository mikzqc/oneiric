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
import { formatDate } from '../utils/dateUtils';
import {
  BookOpen,
  Sparkles,
  Flame,
  Calendar,
  Compass,
  ArrowRight,
  Plus,
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
  const [isLoading, setIsLoading] = useState(true);

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
      setRecentTechniques(techLogs.slice(0, 4));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#121829] via-[#0f172a] to-[#0b0f19] border border-slate-800/80 shadow-2xl relative overflow-hidden celestial-glow">
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

          {/* Recent Technique Practice (1 col) */}
          <div className="p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>Recent Induction Logs</span>
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/techniques')}
                  className="text-xs text-indigo-400 hover:text-indigo-200 cursor-pointer font-medium"
                >
                  View all
                </button>
              </div>

              {recentTechniques.length === 0 ? (
                <div className="p-6 text-center rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400">
                  <p>No induction attempts logged yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => navigate('/techniques')}
                  >
                    Log Practice
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTechniques.map((tech) => (
                    <div
                      key={tech.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-200">
                            {tech.technique === 'Other' && tech.customTechniqueName
                              ? tech.customTechniqueName
                              : tech.technique}
                          </span>
                          <span className="text-[10px] text-slate-400">{formatDate(tech.date)}</span>
                        </div>
                        {tech.notes && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                            {tech.notes}
                          </p>
                        )}
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          tech.outcome === 'lucid_dream'
                            ? 'bg-cyan-950 text-cyan-300 border border-cyan-700/50'
                            : tech.outcome === 'dream_recalled'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-700/50'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {tech.outcome === 'lucid_dream'
                          ? 'Lucid'
                          : tech.outcome === 'dream_recalled'
                          ? 'Recalled'
                          : 'No recall'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => navigate('/techniques')}
                className="w-full py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Lucid Induction Protocols</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
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
    </div>
  );
};
