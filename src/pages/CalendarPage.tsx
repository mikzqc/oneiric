import React, { useState, useEffect } from 'react';
import { dreamService } from '../services/dreamService';
import { DreamEntry } from '../types/dream';
import { MonthCalendar } from '../components/calendar/MonthCalendar';
import { DreamCard } from '../components/journal/DreamCard';
import { DreamDetailModal } from '../components/journal/DreamDetailModal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { getTodayDateString, formatDate } from '../utils/dateUtils';
import { Button } from '../components/common/Button';
import { CalendarDays, Plus, Sparkles } from 'lucide-react';

interface CalendarPageProps {
  onOpenNewDream: (prefillDate?: string) => void;
  onEditDream: (dream: DreamEntry) => void;
}

export const CalendarPage: React.FC<CalendarPageProps> = ({
  onOpenNewDream,
  onEditDream,
}) => {
  const [dreams, setDreams] = useState<DreamEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedDreamForView, setSelectedDreamForView] = useState<DreamEntry | null>(null);
  const [dreamToDelete, setDreamToDelete] = useState<DreamEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const allDreams = await dreamService.getAllDreams();
      setDreams(allDreams);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!dreamToDelete) return;
    try {
      setIsDeleting(true);
      await dreamService.deleteDream(dreamToDelete.id);
      setDreamToDelete(null);
      await loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  // Dreams for selected date
  const selectedDateDreams = dreams.filter((d) => d.date === selectedDate);
  const hasLucidOnDate = selectedDateDreams.some((d) => d.lucidity === 'lucid');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-indigo-400" />
            <span>Lunar & Solar Calendar</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            View nocturnal patterns and lucid frequencies mapped across the celestial cycle
          </p>
        </div>

        <Button
          variant="celestial"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => onOpenNewDream(selectedDate)}
        >
          Add Dream for Selected Date
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Monthly Calendar (7 cols on desktop) */}
          <div className="lg:col-span-7">
            <MonthCalendar
              dreams={dreams}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              onAddDreamForDate={(d) => onOpenNewDream(d)}
            />
          </div>

          {/* Selected Date Entries Panel (5 cols on desktop) */}
          <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-100">
                    {formatDate(selectedDate)}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedDateDreams.length}{' '}
                    {selectedDateDreams.length === 1 ? 'dream entry' : 'dream entries'} on this date
                  </p>
                </div>

                {hasLucidOnDate && (
                  <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 lucid-glow">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Lucid Night</span>
                  </span>
                )}
              </div>

              {selectedDateDreams.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-3">
                  <p>No dreams recorded for this date.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() => onOpenNewDream(selectedDate)}
                  >
                    Record for {formatDate(selectedDate)}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {selectedDateDreams.map((dream) => (
                    <DreamCard
                      key={dream.id}
                      dream={dream}
                      onView={setSelectedDreamForView}
                      onEdit={onEditDream}
                      onDelete={setDreamToDelete}
                    />
                  ))}
                </div>
              )}
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
