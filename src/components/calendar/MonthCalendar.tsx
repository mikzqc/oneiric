import React, { useState } from 'react';
import { DreamEntry } from '../../types/dream';
import { getTodayDateString, formatDate, parseLocalDate } from '../../utils/dateUtils';
import { ChevronLeft, ChevronRight, Sparkles, Plus } from 'lucide-react';
import { Button } from '../common/Button';

interface MonthCalendarProps {
  dreams: DreamEntry[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  onAddDreamForDate: (dateStr: string) => void;
}

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
  dreams,
  selectedDate,
  onSelectDate,
  onAddDreamForDate,
}) => {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => {
    return selectedDate ? parseLocalDate(selectedDate) : new Date();
  });

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  // Days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map dreams by date
  const dreamsByDate = new Map<string, DreamEntry[]>();
  dreams.forEach((dream) => {
    const list = dreamsByDate.get(dream.date) || [];
    list.push(dream);
    dreamsByDate.set(dream.date, list);
  });

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleGoToday = () => {
    const today = new Date();
    setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(getTodayDateString(today));
  };

  const monthName = currentMonthDate.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const todayStr = getTodayDateString();

  // Build grid calendar days
  const calendarCells = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push(dayStr);
  }

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-xl">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/80">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{monthName}</h2>
          <p className="text-xs text-slate-400">
            Selected: <span className="text-indigo-300 font-medium">{formatDate(selectedDate)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleGoToday}>
            Today
          </Button>
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/60 p-0.5">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center mb-2">
        {weekdays.map((wd) => (
          <div key={wd} className="text-xs font-semibold text-slate-400 py-1 uppercase tracking-wider">
            {wd}
          </div>
        ))}
      </div>

      {/* Day Cells Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {calendarCells.map((dateStr, idx) => {
          if (!dateStr) {
            return (
              <div
                key={`empty-${idx}`}
                className="h-16 sm:h-20 rounded-xl bg-slate-950/20 border border-transparent"
              />
            );
          }

          const dayNumber = Number(dateStr.split('-')[2]);
          const dayDreams = dreamsByDate.get(dateStr) || [];
          const hasDreams = dayDreams.length > 0;
          const hasLucid = dayDreams.some((d) => d.lucidity === 'lucid');
          const isSelected = selectedDate === dateStr;
          const isToday = todayStr === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => onSelectDate(dateStr)}
              className={`h-16 sm:h-20 p-1.5 sm:p-2 rounded-xl text-left border flex flex-col justify-between transition-all cursor-pointer relative group ${
                isSelected
                  ? 'bg-indigo-950/60 border-indigo-500 shadow-md celestial-glow ring-2 ring-indigo-500/40'
                  : hasLucid
                  ? 'bg-cyan-950/30 border-cyan-700/50 hover:border-cyan-500/60'
                  : hasDreams
                  ? 'bg-slate-900/80 border-slate-700/70 hover:border-slate-600'
                  : 'bg-slate-950/40 border-slate-900/60 hover:bg-slate-900/40 hover:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span
                  className={`text-xs font-semibold ${
                    isToday
                      ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                      : isSelected
                      ? 'text-indigo-200'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {dayNumber}
                </span>

                {hasLucid && (
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 animate-pulse" />
                )}
              </div>

              {/* Badges / dots in cell */}
              <div className="w-full flex items-center gap-1 overflow-hidden mt-1">
                {hasDreams && (
                  <div className="flex items-center gap-1 w-full">
                    {hasLucid ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-600/40 truncate">
                        {dayDreams.length} {dayDreams.length === 1 ? 'dream' : 'dreams'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 truncate">
                        {dayDreams.length} {dayDreams.length === 1 ? 'dream' : 'dreams'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legend & Quick Add for Selected Day */}
      <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600" />
            <span>Dream Logged</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
            <span>Lucid Dream</span>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => onAddDreamForDate(selectedDate)}
        >
          Add dream for {formatDate(selectedDate)}
        </Button>
      </div>
    </div>
  );
};
