import React, { useState, useEffect } from 'react';
import { dreamService, TimelineNightGroup } from '../services/dreamService';
import { DreamEntry } from '../types/dream';
import { DreamDetailModal } from '../components/journal/DreamDetailModal';
import { LucidityBadge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { formatFullDate, formatTime } from '../utils/dateUtils';
import {
  Calendar,
  Clock,
  Sparkles,
  AlertTriangle,
  Compass,
  Star,
  Layers,
  ArrowRight,
  Moon,
} from 'lucide-react';

interface TimelinePageProps {
  onOpenNewDream: () => void;
  onEditDream?: (dream: DreamEntry) => void;
}

export const TimelinePage: React.FC<TimelinePageProps> = ({
  onOpenNewDream,
  onEditDream,
}) => {
  const [nights, setNights] = useState<TimelineNightGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDreamForView, setSelectedDreamForView] = useState<DreamEntry | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const list = await dreamService.getTimelineEvents();
      setNights(list);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
          <Clock className="w-6 h-6 text-blue-400" />
          <span>Chronological Nocturnal Timeline</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Trace nocturnal sequences, technique inductions, scene progressions, and false awakenings night by night
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : nights.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="Timeline is Empty"
          description="Record your dreams and induction techniques to view your nocturnal timeline."
          actionText="Record a Dream"
          onAction={onOpenNewDream}
        />
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l border-slate-800/80 space-y-10">
          {nights.map((night) => {
            return (
              <div key={night.date} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                    night.hasLucid
                      ? 'bg-cyan-950 border-cyan-400 text-cyan-300 shadow-md shadow-cyan-900/40 lucid-glow'
                      : night.hasFalseAwakening
                      ? 'bg-blue-950 border-blue-400 text-blue-300'
                      : night.dreams.length === 0
                      ? 'bg-slate-900 border-slate-700 text-slate-400'
                      : 'bg-[#0f172a] border-slate-700 text-blue-400'
                  }`}
                >
                  {night.hasLucid ? (
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  ) : night.hasFalseAwakening ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : night.dreams.length === 0 ? (
                    <Moon className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5" />
                  )}
                </div>

                {/* Night Header Card */}
                <div className="p-5 sm:p-6 rounded-2xl bg-[#0f172a]/80 border border-slate-800/80 shadow-xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
                    <div>
                      <h2 className="text-base font-bold text-slate-100">
                        {formatFullDate(night.date)}
                      </h2>
                      <p className="text-xs text-slate-400">
                        {night.dreams.length > 0
                          ? `${night.dreams.length} ${night.dreams.length === 1 ? 'dream' : 'dreams'} logged`
                          : 'No dream recalled'}
                        {night.techniques.length > 0 && ` • ${night.techniques.length} check-in log(s)`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {night.hasLucid && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/50 lucid-glow">
                          Lucid Night
                        </span>
                      )}
                      {night.hasFalseAwakening && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-700/50">
                          False Awakening
                        </span>
                      )}
                      {night.dreams.length === 0 && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Moon className="w-3 h-3 text-slate-400" />
                          <span>No Dream Remembered</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pre-sleep Techniques / Recall Check-ins on this date */}
                  {night.techniques.length > 0 && (
                    <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-blue-400" />
                        <span>Check-ins & Observations:</span>
                      </span>

                      <div className="space-y-2">
                        {night.techniques.map((tech) => (
                          <div
                            key={tech.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-200">
                                {tech.outcome === 'no_recall'
                                  ? (tech.notes || 'No dreams remembered')
                                  : tech.technique === 'Other' && tech.customTechniqueName
                                  ? tech.customTechniqueName
                                  : tech.technique}
                              </span>
                              {tech.bedTime && (
                                <span className="text-slate-500 font-mono text-[11px]">
                                  Bed: {tech.bedTime}
                                </span>
                              )}
                              {tech.confidenceRating && (
                                <span className="text-blue-300 font-mono text-[11px]">
                                  Confidence: {tech.confidenceRating}/5
                                </span>
                              )}
                            </div>

                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                tech.outcome === 'lucid_dream'
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                  : tech.outcome === 'dream_recalled'
                                  ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                  : 'bg-slate-800 text-slate-400 border border-slate-700'
                              }`}
                            >
                              {tech.outcome === 'lucid_dream'
                                ? 'Outcome: Lucid'
                                : tech.outcome === 'dream_recalled'
                                ? 'Outcome: Recalled'
                                : 'No recall'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Dreams recorded on this night */}
                  {night.dreams.length > 0 ? (
                    <div className="space-y-3">
                      {night.dreams.map((dream) => (
                        <div
                          key={dream.id}
                          onClick={() => setSelectedDreamForView(dream)}
                          className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-blue-500/60 transition-all cursor-pointer space-y-2.5 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <LucidityBadge lucidity={dream.lucidity} size="sm" />
                              {dream.falseAwakening && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-800">
                                  False Awakening
                                </span>
                              )}
                              {dream.wakeUpTime && (
                                <span className="text-xs text-slate-400 font-mono">
                                  Wake: {formatTime(dream.wakeUpTime)}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-400">
                              {dream.scenesCount && dream.scenesCount > 1 && (
                                <div className="flex items-center gap-1">
                                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{dream.scenesCount} scenes</span>
                                </div>
                              )}

                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((lvl) => (
                                  <Star
                                    key={lvl}
                                    className={`w-3 h-3 ${
                                      lvl <= dream.vividness
                                        ? 'text-amber-400 fill-amber-400'
                                        : 'text-slate-700'
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          <h3 className="text-sm sm:text-base font-bold text-slate-100 hover:text-blue-200 transition-colors">
                            {dream.title}
                          </h3>

                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {dream.narrative}
                          </p>

                          <div className="flex items-center justify-between pt-1 text-[11px] text-blue-400 font-medium">
                            <span>Open full narrative & inspection</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 text-xs text-slate-400 flex items-start gap-2.5">
                      <Moon className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-300">No dream recalled on this night</p>
                        {night.techniques.find((t) => t.notes)?.notes && (
                          <p className="text-slate-400 mt-1 italic">
                            Observation: "{night.techniques.find((t) => t.notes)?.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dream Detail Modal */}
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
