import React, { useState, useEffect, useMemo } from 'react';
import { dreamService } from '../services/dreamService';
import { DreamEntry, LucidityLevel, PREDEFINED_EMOTIONS } from '../types/dream';
import { DreamCard } from '../components/journal/DreamCard';
import { DreamDetailModal } from '../components/journal/DreamDetailModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { EmptyState } from '../components/common/EmptyState';
import { Button } from '../components/common/Button';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  BookOpen,
  X,
} from 'lucide-react';

interface JournalProps {
  onOpenNewDream: () => void;
  onEditDream: (dream: DreamEntry) => void;
}

export const Journal: React.FC<JournalProps> = ({
  onOpenNewDream,
  onEditDream,
}) => {
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [lucidityFilter, setLucidityFilter] = useState<'all' | LucidityLevel>('all');
  const [selectedEmotion, setSelectedEmotion] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Modals state
  const [selectedDreamForView, setSelectedDreamForView] = useState<DreamEntry | null>(null);
  const [dreamToDelete, setDreamToDelete] = useState<DreamEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadJournalData = async () => {
    try {
      setIsLoading(true);
      const [allDreams, distinctTags] = await Promise.all([
        dreamService.getAllDreams(),
        dreamService.getDistinctTags(),
      ]);
      setDreams(allDreams);
      setAllTags(distinctTags);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadJournalData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!dreamToDelete) return;
    try {
      setIsDeleting(true);
      await dreamService.deleteDream(dreamToDelete.id);
      setDreamToDelete(null);
      await loadJournalData();
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and sort dreams
  const filteredDreams = useMemo(() => {
    return dreams
      .filter((dream) => {
        // Search filter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTitle = dream.title.toLowerCase().includes(q);
          const matchesNarrative = dream.narrative.toLowerCase().includes(q);
          const matchesDreamSigns = dream.dreamSignsNotes?.toLowerCase().includes(q) || false;
          const matchesTags = dream.tags?.some((t) => t.toLowerCase().includes(q)) || false;
          const matchesEmotions = dream.emotions?.some((e) => e.toLowerCase().includes(q)) || false;
          if (!matchesTitle && !matchesNarrative && !matchesDreamSigns && !matchesTags && !matchesEmotions) {
            return false;
          }
        }

        // Lucidity filter
        if (lucidityFilter !== 'all' && dream.lucidity !== lucidityFilter) {
          return false;
        }

        // Emotion filter
        if (selectedEmotion !== 'all' && !dream.emotions?.includes(selectedEmotion)) {
          return false;
        }

        // Tag filter
        if (selectedTag !== 'all' && !dream.tags?.includes(selectedTag)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        const compare = a.date.localeCompare(b.date) || a.createdAt - b.createdAt;
        return sortOrder === 'newest' ? -compare : compare;
      });
  }, [dreams, searchQuery, lucidityFilter, selectedEmotion, selectedTag, sortOrder]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    lucidityFilter !== 'all' ||
    selectedEmotion !== 'all' ||
    selectedTag !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setLucidityFilter('all');
    setSelectedEmotion('all');
    setSelectedTag('all');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Dream Journal</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {dreams.length} {dreams.length === 1 ? 'record' : 'records'} logged in your nocturnal archive
          </p>
        </div>

        <Button
          variant="celestial"
          icon={<Plus className="w-4 h-4" />}
          onClick={onOpenNewDream}
        >
          Record a Dream
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-lg space-y-3">
        {/* Search bar + Sort */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative grow">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dream titles, narratives, dream signs, tags..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />}
              onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
            >
              <span>{sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}</span>
            </Button>
          </div>
        </div>

        {/* Filters Row: Lucidity, Emotions, Tags */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          {/* Lucidity Dropdown */}
          <select
            value={lucidityFilter}
            onChange={(e) => setLucidityFilter(e.target.value as 'all' | LucidityLevel)}
            aria-label="Filter by lucidity"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Lucidity</option>
            <option value="lucid">Lucid Only</option>
            <option value="non-lucid">Non-Lucid</option>
            <option value="uncertain">Uncertain / Pre-Lucid</option>
          </select>

          {/* Emotion Dropdown */}
          <select
            value={selectedEmotion}
            onChange={(e) => setSelectedEmotion(e.target.value)}
            aria-label="Filter by emotion"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Emotions</option>
            {PREDEFINED_EMOTIONS.map((emotion) => (
              <option key={emotion} value={emotion}>
                {emotion}
              </option>
            ))}
          </select>

          {/* Tags Dropdown */}
          {allTags.length > 0 && (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              aria-label="Filter by tag"
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700/80 text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Tags</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  #{tag}
                </option>
              ))}
            </select>
          )}

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="ml-auto text-xs text-indigo-400 hover:text-indigo-200 underline cursor-pointer p-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Dreams List / Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : filteredDreams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDreams.map((dream) => (
            <DreamCard
              key={dream.id}
              dream={dream}
              onView={setSelectedDreamForView}
              onEdit={onEditDream}
              onDelete={setDreamToDelete}
            />
          ))}
        </div>
      ) : hasActiveFilters ? (
        <EmptyState
          icon={<Search className="w-7 h-7" />}
          title="No Matching Dreams Found"
          description="None of your recorded dreams match the selected search query and filter criteria."
          actionText="Reset Filters"
          onAction={resetFilters}
        />
      ) : (
        <EmptyState
          icon={<BookOpen className="w-7 h-7" />}
          title="Your Journal is Empty"
          description="Capture your first dream to begin tracking recurring dream signs, vividness patterns, and nocturnal recall."
          actionText="Record a Dream"
          onAction={onOpenNewDream}
        />
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
