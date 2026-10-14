import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dreamService } from '../services/dreamService';
import { DreamEntry } from '../types/dream';
import { DreamCard } from '../components/journal/DreamCard';
import { DreamDetailModal } from '../components/journal/DreamDetailModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import { Sparkles, Star, Brain, Plus, Compass } from 'lucide-react';

interface LucidDreamsPageProps {
  onOpenNewDream: () => void;
  onEditDream: (dream: DreamEntry) => void;
}

export const LucidDreamsPage: React.FC<LucidDreamsPageProps> = ({
  onOpenNewDream,
  onEditDream,
}) => {
  const navigate = useNavigate();

  const [lucidDreams, setLucidDreams] = useState<DreamEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedDreamForView, setSelectedDreamForView] = useState<DreamEntry | null>(null);
  const [dreamToDelete, setDreamToDelete] = useState<DreamEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadLucidDreams = async () => {
    try {
      setIsLoading(true);
      const list = await dreamService.getLucidDreams();
      setLucidDreams(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLucidDreams();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!dreamToDelete) return;
    try {
      setIsDeleting(true);
      await dreamService.deleteDream(dreamToDelete.id);
      setDreamToDelete(null);
      await loadLucidDreams();
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate lucid metrics
  const totalLucid = lucidDreams.length;
  const avgVividness =
    totalLucid > 0
      ? (
          lucidDreams.reduce((acc, d) => acc + (d.vividness || 0), 0) / totalLucid
        ).toFixed(1)
      : '0';

  // Common emotions in lucid dreams
  const emotionCounts: Record<string, number> = {};
  lucidDreams.forEach((d) => {
    d.emotions?.forEach((e) => {
      emotionCounts[e] = (emotionCounts[e] || 0) + 1;
    });
  });
  const topEmotions = Object.entries(emotionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([e]) => e);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              <span>Lucid Dreams Archive</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/50 text-xs font-semibold">
              {totalLucid}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Dedicated sanctuary for experiences where conscious self-awareness awakened inside the dream
          </p>
        </div>

        <Button
          variant="celestial"
          icon={<Plus className="w-4 h-4" />}
          onClick={onOpenNewDream}
        >
          Record Lucid Dream
        </Button>
      </div>

      {/* Lucid Stats Summary Bar */}
      {totalLucid > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Total Lucid Awakenings</span>
              <span className="text-xl font-bold text-slate-100">{totalLucid}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-amber-400">
              <Star className="w-5 h-5 fill-amber-400/40" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Average Vividness</span>
              <span className="text-xl font-bold text-slate-100">{avgVividness} / 5</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-700/50 text-blue-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400 block font-medium">Dominant Emotional States</span>
              <span className="text-xs font-semibold text-slate-200">
                {topEmotions.length > 0 ? topEmotions.join(', ') : 'Wonder, Awe'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Lucid Dreams List or Educational Empty State */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      ) : totalLucid > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lucidDreams.map((dream) => (
            <DreamCard
              key={dream.id}
              dream={dream}
              onView={setSelectedDreamForView}
              onEdit={onEditDream}
              onDelete={setDreamToDelete}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          <EmptyState
            icon={<Sparkles className="w-8 h-8 text-cyan-400" />}
            title="No Lucid Dreams Recorded Yet"
            description="A lucid dream occurs when you become consciously aware that you are dreaming while remaining asleep. Every dream entry in Oneiric can be designated as 'Lucid' without duplicating entries."
            actionText="Record a Lucid Dream"
            onAction={onOpenNewDream}
            secondaryActionText="Practice Induction Techniques"
            onSecondaryAction={() => navigate('/techniques')}
          />

          {/* Educational Guidance on Inducing & Marking Lucid Dreams */}
          <div className="p-6 rounded-2xl bg-[#0f172a]/60 border border-slate-800/80 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              <span>How to Recognize and Mark Lucid Dreams</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-cyan-300 block mb-1.5">1. Recognize Dream Signs</span>
                <p className="leading-relaxed text-slate-400">
                  Notice anomalies such as floating objects, breathing underwater, or reading digital text that warps upon looking back.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-cyan-300 block mb-1.5">2. Stabilize the Awareness</span>
                <p className="leading-relaxed text-slate-400">
                  Once aware, avoid sudden excitement. Rub your hands together, touch nearby dream surfaces, and affirm your stability.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="font-semibold text-cyan-300 block mb-1.5">3. Mark in the Editor</span>
                <p className="leading-relaxed text-slate-400">
                  In the Dream Editor, select the glowing <strong>"Lucid Dream"</strong> status badge. It will automatically catalog here with special cyan styling.
                </p>
              </div>
            </div>
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
