import React, { useState, useEffect } from 'react';
import { analyticsService, AnalyticsSummary, TimeRangeFilter } from '../services/analyticsService';
import { LucidityLevel } from '../types/dream';
import { formatDate } from '../utils/dateUtils';
import { EmptyState } from '../components/common/EmptyState';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Sparkles,
  TrendingUp,
  Info,
  Clock,
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('30d');
  const [lucidityFilter, setLucidityFilter] = useState<'all' | LucidityLevel>('all');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    analyticsService.getAnalytics(timeRange, lucidityFilter).then((res) => {
      if (isMounted) {
        setData(res);
        setIsLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [timeRange, lucidityFilter]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const maxTimelineCount = Math.max(...data.recallTimeline.map((d) => d.total), 3);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <span>Dream Intelligence & Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Data-driven patterns, circadian recall rhythms, and conscious agency metrics
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time range buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            {(['7d', '30d', '90d', '1y', 'all'] as TimeRangeFilter[]).map((tr) => (
              <button
                key={tr}
                type="button"
                onClick={() => setTimeRange(tr)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                  timeRange === tr
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tr.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Lucidity filter */}
          <select
            value={lucidityFilter}
            onChange={(e) => setLucidityFilter(e.target.value as 'all' | LucidityLevel)}
            aria-label="Filter by lucidity"
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="all">All Dreams</option>
            <option value="lucid">Lucid Only</option>
            <option value="non-lucid">Non-Lucid</option>
            <option value="uncertain">Uncertain Only</option>
          </select>
        </div>
      </div>

      {data.totalDreams === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-8 h-8" />}
          title="No Data for Selected Time Window"
          description="There are no recorded dream entries matching the selected date range and filter criteria."
          actionText="View All Time"
          onAction={() => {
            setTimeRange('all');
            setLucidityFilter('all');
          }}
        />
      ) : (
        <>
          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Dreams in Period */}
            <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Dreams in Window
              </span>
              <div className="text-3xl font-extrabold text-slate-100">{data.totalDreams}</div>
              <p className="text-xs text-slate-400 mt-1">
                {data.recordedDaysCount} of {data.calendarDaysCount} nights journaled
              </p>
            </div>

            {/* Recall Rate */}
            <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-blue-500/30 celestial-glow shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-300">
                  Recall Consistency
                </span>
                <span className="text-xs font-bold text-blue-400">{data.recallRate}%</span>
              </div>
              <div className="text-3xl font-extrabold text-slate-100">{data.recallRate}%</div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${data.recallRate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Nights with at least 1 remembered dream
              </p>
            </div>

            {/* Lucid Rate */}
            <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-cyan-500/30 lucid-glow shadow-md">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Lucidity Frequency
                </span>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-3xl font-extrabold text-cyan-300">
                {data.totalLucid}{' '}
                <span className="text-sm font-normal text-slate-400">({data.lucidityRate}%)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Consciously awake nocturnal experiences
              </p>
            </div>

            {/* Average Vividness & Control */}
            <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-md">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Quality & Agency
              </span>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-2xl font-extrabold text-amber-300">{data.averageVividness}</span>
                  <span className="text-xs text-slate-500 block">Vividness (/5)</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-2xl font-extrabold text-blue-300">
                    {data.averageDreamControl !== null ? data.averageDreamControl : '—'}
                  </span>
                  <span className="text-xs text-slate-500 block">Control (/5)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scientific Disclaimer Note */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Measurement methodology:</strong> Recall consistency reflects recorded nights in the journal. Unrecorded nights indicate no entry was submitted; they do not assume the absence of dreams, as dream forgetting is a natural neurochemical occurrence.
            </p>
          </div>

          {/* Main Visuals: Recall Timeline Chart */}
          <div className="p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span>Recall & Lucidity Volume Over Time</span>
                </h2>
                <p className="text-xs text-slate-400">Total remembered dreams vs lucid experiences</p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-blue-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Total Dreams</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <span>Lucid Awakenings</span>
                </div>
              </div>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.recallTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="anColorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="anColorLucid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[0, maxTimelineCount]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="p-3 bg-[#0b132b] border border-slate-700/80 rounded-xl shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-slate-200">{formatDate(item.date)}</p>
                            <p className="text-blue-300">Total Dreams: <strong className="text-white">{item.total}</strong></p>
                            <p className="text-cyan-300">Lucid Dreams: <strong className="text-white">{item.lucid}</strong></p>
                            {item.controlAvg !== null && (
                              <p className="text-slate-400">Control Avg: <strong className="text-blue-200">{item.controlAvg}/5</strong></p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fill="url(#anColorTotal)" />
                  <Area type="monotone" dataKey="lucid" stroke="#06b6d4" strokeWidth={2} fill="url(#anColorLucid)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparative Trends Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Comparison */}
            <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Weekly Recall Momentum
                </span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-slate-100">
                  {data.weeklyComparison.thisWeek} dreams
                </span>
                <span className="text-xs text-slate-400">this week</span>
              </div>
              <div className="mt-2 text-xs flex items-center gap-2">
                <span className="text-slate-400">vs last week: {data.weeklyComparison.lastWeek}</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full ${
                    data.weeklyComparison.difference >= 0
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {data.weeklyComparison.difference >= 0
                    ? `+${data.weeklyComparison.difference}`
                    : data.weeklyComparison.difference}
                </span>
              </div>
            </div>

            {/* Monthly Comparison */}
            <div className="p-5 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Monthly Recall Horizon
                </span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-bold text-slate-100">
                  {data.monthlyComparison.thisMonth} dreams
                </span>
                <span className="text-xs text-slate-400">past 30 days</span>
              </div>
              <div className="mt-2 text-xs flex items-center gap-2">
                <span className="text-slate-400">vs prior 30 days: {data.monthlyComparison.lastMonth}</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-full ${
                    data.monthlyComparison.difference >= 0
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {data.monthlyComparison.difference >= 0
                    ? `+${data.monthlyComparison.difference}`
                    : data.monthlyComparison.difference}
                </span>
              </div>
            </div>
          </div>

          {/* Heatmap Activity Grid */}
          <div className="p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-100">Dream Recall Activity Heatmap</h2>
              <p className="text-xs text-slate-400">Nocturnal distribution across the last 90 calendar days</p>
            </div>

            <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-slate-950/50 border border-slate-800/60">
              {data.heatmap.map((day) => {
                const hasDreams = day.count > 0;
                const hasLucid = day.lucidCount > 0;
                const hasFA = day.falseAwakeningCount > 0;

                return (
                  <div
                    key={day.date}
                    title={`${formatDate(day.date)}: ${day.count} dream(s)${
                      hasLucid ? ` (${day.lucidCount} lucid)` : ''
                    }${hasFA ? ' [False Awakening]' : ''}`}
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm transition-all cursor-pointer ${
                      hasLucid
                        ? 'bg-cyan-400 shadow-sm shadow-cyan-400/50 scale-105'
                        : hasFA
                        ? 'bg-sky-500 shadow-sm shadow-sky-500/50'
                        : hasDreams
                        ? 'bg-blue-600'
                        : 'bg-slate-900 border border-slate-800/60'
                    }`}
                  />
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-900 border border-slate-800/60" />
                <span>No entry</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-600" />
                <span>Dream logged</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-cyan-400" />
                <span>Lucid awakening</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-sky-500" />
                <span>False awakening</span>
              </div>
            </div>
          </div>

          {/* Emotions & Tags Frequencies Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Emotions */}
            <div className="p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-slate-100">Dominant Emotional Frequencies</h2>
              {data.emotions.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No emotion tags recorded in this window.</p>
              ) : (
                <div className="space-y-3">
                  {data.emotions.slice(0, 6).map((emo) => (
                    <div key={emo.emotion} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-200">{emo.emotion}</span>
                        <span className="text-slate-400">
                          {emo.count} {emo.count === 1 ? 'dream' : 'dreams'} ({emo.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full"
                          style={{ width: `${emo.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Tags */}
            <div className="p-6 rounded-2xl bg-[#0f172a]/70 border border-slate-800/80 shadow-xl space-y-4">
              <h2 className="text-base font-bold text-slate-100">Recurring Thematic Tags</h2>
              {data.topTags.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No tags logged in this window.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.topTags.map((t) => (
                    <div
                      key={t.tag}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs flex items-center gap-2 text-slate-200"
                    >
                      <span className="text-blue-400">#{t.tag}</span>
                      <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[10px] font-mono">
                        {t.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
