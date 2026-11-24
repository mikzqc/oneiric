import React, { useState, useEffect, useCallback } from 'react';
import { goalService, DEFAULT_GOAL_CATEGORIES } from '../services/goalService';
import { GoalItem, GoalStatus, GoalCategory } from '../types/goal';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { formatDate } from '../utils/dateUtils';
import {
  Target,
  Plus,
  RotateCcw,
  Archive,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  CheckCircle2,
  Circle,
  ArchiveRestore,
} from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const [goals, setGoals] = useState<GoalItem[]>([]);
  const [activeTab, setActiveTab] = useState<GoalStatus>('active');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<GoalItem | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<GoalItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Form state
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<string>('');
  const [formTargetDate, setFormTargetDate] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      const all = await goalService.getAllGoals();
      setGoals(all);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('');
    setFormTargetDate('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (goal: GoalItem) => {
    setEditingGoal(goal);
    setFormTitle(goal.title);
    setFormDescription(goal.description || '');
    setFormCategory(goal.category || '');
    setFormTargetDate(goal.targetDate || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = formTitle.trim();
    if (!cleanTitle) {
      setFormError('Please enter an intention title.');
      return;
    }

    try {
      if (editingGoal) {
        await goalService.updateGoal(editingGoal.id, {
          title: cleanTitle,
          description: formDescription,
          category: formCategory as GoalCategory,
          targetDate: formTargetDate,
        });
      } else {
        await goalService.createGoal({
          title: cleanTitle,
          description: formDescription,
          category: formCategory as GoalCategory,
          targetDate: formTargetDate,
        });
      }
      setIsModalOpen(false);
      await loadGoals();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save intention.');
    }
  };

  const handleToggleComplete = async (goal: GoalItem) => {
    const nextStatus: GoalStatus = goal.status === 'completed' ? 'active' : 'completed';
    await goalService.setGoalStatus(goal.id, nextStatus);
    await loadGoals();
  };

  const handleArchive = async (goal: GoalItem) => {
    await goalService.setGoalStatus(goal.id, 'archived');
    await loadGoals();
  };

  const handleReactivate = async (goal: GoalItem) => {
    await goalService.setGoalStatus(goal.id, 'active');
    await loadGoals();
  };

  const handleDelete = async () => {
    if (!goalToDelete) return;
    try {
      setIsDeleting(true);
      await goalService.deleteGoal(goalToDelete.id);
      setGoalToDelete(null);
      await loadGoals();
    } finally {
      setIsDeleting(false);
    }
  };

  // Derive counts and filtered list
  const activeCount = goals.filter((g) => g.status === 'active').length;
  const completedCount = goals.filter((g) => g.status === 'completed').length;
  const archivedCount = goals.filter((g) => g.status === 'archived').length;

  const filteredGoals = goals.filter((g) => {
    if (g.status !== activeTab) return false;
    if (selectedCategory !== 'all') {
      return g.category === selectedCategory;
    }
    return true;
  });

  const availableCategories = Array.from(
    new Set(goals.map((g) => g.category).filter(Boolean) as string[])
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-7 h-7 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* ── Page Header & Description ── */}
      <div className="p-5 md:p-6 rounded-xl bg-slate-900/60 border border-slate-800/80 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-blue-600/15 border border-blue-500/20 text-blue-400 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-100">
                Your intentions
              </h1>
            </div>
            <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-2xl">
              Define, hold, and reflect upon your personal intentions—from lucid dreaming milestones
              to sleep mindfulness and nocturnal exploration. A quiet, personal ledger free of pressure,
              streaks, or gamification.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/60 shadow-sm transition-all duration-150 cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 self-start sm:self-center shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Set Intention</span>
          </button>
        </div>
      </div>

      {/* ── Tabs & Category Filter ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('archived')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all duration-150 cursor-pointer ${
              activeTab === 'archived'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Archived ({archivedCount})
          </button>
        </div>

        {/* Category Filter */}
        {availableCategories.length > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
            <span className="text-slate-400 text-[11px]">Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all">All categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Goals List ── */}
      {filteredGoals.length === 0 ? (
        <div className="p-10 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700/60 text-slate-400 mx-auto flex items-center justify-center">
            <Target className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-slate-200">
              {activeTab === 'active' && 'No active intentions'}
              {activeTab === 'completed' && 'No completed intentions yet'}
              {activeTab === 'archived' && 'No archived intentions'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {activeTab === 'active' &&
                'Take a quiet moment to establish what you wish to experience, recognize, or explore in your nocturnal practice.'}
              {activeTab === 'completed' &&
                'Every step in consciousness unfolds in its own time. Completed intentions will be collected here.'}
              {activeTab === 'archived' &&
                'Intentions you choose to rest or shelve will remain preserved here.'}
            </p>
          </div>
          {activeTab === 'active' && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Set your first intention</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGoals.map((goal) => {
            const isCompleted = goal.status === 'completed';
            const isArchived = goal.status === 'archived';

            return (
              <div
                key={goal.id}
                className={`p-4 md:p-5 rounded-xl border transition-all duration-150 ${
                  isCompleted
                    ? 'bg-slate-900/35 border-slate-800/60 text-slate-400'
                    : isArchived
                    ? 'bg-slate-900/25 border-slate-800/40 text-slate-400'
                    : 'bg-slate-900/60 border-slate-800/90 text-slate-100 shadow-sm hover:border-slate-700/80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Status Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleComplete(goal)}
                    className={`mt-0.5 p-1 rounded-md transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0 ${
                      isCompleted
                        ? 'text-emerald-400 hover:text-emerald-300'
                        : 'text-slate-400 hover:text-blue-400'
                    }`}
                    title={isCompleted ? 'Mark as active' : 'Mark as completed'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-400 hover:text-blue-400 transition-colors" />
                    )}
                  </button>

                  {/* Goal Body */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <h3
                        className={`text-sm md:text-base font-semibold leading-snug break-words ${
                          isCompleted
                            ? 'line-through text-slate-400'
                            : 'text-slate-100'
                        }`}
                      >
                        {goal.title}
                      </h3>

                      {/* Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {goal.category && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-950/60 text-blue-300 border border-blue-800/50">
                            <Tag className="w-2.5 h-2.5" />
                            <span>{goal.category}</span>
                          </span>
                        )}
                        {goal.targetDate && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono text-slate-400 bg-slate-900/60 border border-slate-800">
                            <Calendar className="w-2.5 h-2.5 text-slate-400" />
                            <span>Target: {formatDate(goal.targetDate)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {goal.description && (
                      <p className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap break-words">
                        {goal.description}
                      </p>
                    )}

                    {/* Metadata & Actions Footer */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono border-t border-slate-800/40">
                      <div>
                        {isCompleted && goal.completedAt ? (
                          <span className="text-emerald-400/90">
                            Completed {formatDate(new Date(goal.completedAt).toISOString().split('T')[0])}
                          </span>
                        ) : (
                          <span>Set {formatDate(new Date(goal.createdAt).toISOString().split('T')[0])}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {/* Reactivate or Complete */}
                        {isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleReactivate(goal)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer transition-colors"
                            title="Reactivate intention"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reactivate</span>
                          </button>
                        )}

                        {isArchived ? (
                          <button
                            type="button"
                            onClick={() => handleReactivate(goal)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer transition-colors"
                            title="Restore intention"
                          >
                            <ArchiveRestore className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleArchive(goal)}
                            className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer transition-colors"
                            title="Archive intention"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openEditModal(goal)}
                          className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 cursor-pointer transition-colors"
                          title="Edit intention"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setGoalToDelete(goal)}
                          className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer transition-colors"
                          title="Delete intention"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Goal Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGoal ? 'Edit Intention' : 'Set an Intention'}
        subtitle="Write down what you wish to experience or cultivate in your dream practice"
        maxWidth="lg"
      >
        <form onSubmit={handleSaveGoal} className="space-y-4">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="goal-title">
              Intention Title <span className="text-blue-400">*</span>
            </label>
            <input
              id="goal-title"
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Become lucid during a false awakening"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="goal-category">
                Category <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="goal-category"
                type="text"
                list="goal-categories-list"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                placeholder="e.g. Lucid Dreaming"
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
              <datalist id="goal-categories-list">
                {DEFAULT_GOAL_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="goal-target-date">
                Target Date <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="goal-target-date"
                type="date"
                value={formTargetDate}
                onChange={(e) => setFormTargetDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="goal-description">
              Notes & Exploration Strategy <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="goal-description"
              rows={4}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Reflect on why this intention matters to you or any technique cues you wish to remember..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder:text-slate-500 text-xs leading-relaxed focus:outline-none focus:border-blue-500 resize-none font-sans"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white border border-blue-500/60 shadow-sm transition-all duration-150 cursor-pointer active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {editingGoal ? 'Update Intention' : 'Establish Intention'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        isOpen={Boolean(goalToDelete)}
        onClose={() => setGoalToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Intention"
        message={`Are you sure you want to delete "${goalToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Intention"
        isDestructive={true}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default GoalsPage;
