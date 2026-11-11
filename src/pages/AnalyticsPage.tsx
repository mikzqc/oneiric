import React, { useState, useEffect } from 'react';
import { analyticsService, AnalyticsSummary, TimeRangeFilter } from '../services/analyticsService';
import { dreamService, RecallRange, RecallChartDataPoint } from '../services/dreamService';
import { LucidityLevel } from '../types/dream';
import { formatDate } from '../utils/dateUtils';
import { EmptyState } from '../components/common/EmptyState';
import { AnimatedNumber } from '../components/common/AnimatedNumber';
import { preferencesService, PREFERENCES_CHANGED_EVENT } from '../services/preferencesService';
import { RecallChart } from '../components/dashboard/RecallChart';
import { generateRecallGraphDescription } from '../utils/chartExportUtils';
import {
  BarChart3,
  Calendar,
  Sparkles,
  Info,
  Clock,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';

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

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('30d');
  const [lucidityFilter, setLucidityFilter] = useState<'all' | LucidityLevel>('all');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

  const [recallChartData, setRecallChartData] = useState<RecallChartDataPoint[]>([]);
  const [isCopied, setIsCopied] = useState(false);

  const [chartTotalColor, setChartTotalColor] = useState<string>(
    () => preferencesService.getPreferences().chartTotalColor || '#3b82f6'
  );
  const [chartLucidColor, setChartLucidColor] = useState<string>(
    () => preferencesService.getPreferences().chartLucidColor || '#06b6d4'
  );

  useEffect(() => {
    const handlePrefsChange = (e: Event) => {
      const custom = e as CustomEvent<{ chartTotalColor?: string; chartLucidColor?: string }>;
      if (custom.detail) {
        if (custom.detail.chartTotalColor) setChartTotalColor(custom.detail.chartTotalColor);
        if (custom.detail.chartLucidColor) setChartLucidColor(custom.detail.chartLucidColor);
      }
    };
    window.addEventListener(PREFERENCES_CHANGED_EVENT, handlePrefsChange);
    return () => window.removeEventListener(PREFERENCES_CHANGED_EVENT, handlePrefsChange);
  }, []);

  const handleUpdateTotalColor = (newColor: string) => {
    setChartTotalColor(newColor);
    preferencesService.updatePreferences({ chartTotalColor: newColor });
  };

  const handleUpdateLucidColor = (newColor: string) => {
    setChartLucidColor(newColor);
    preferencesService.updatePreferences({ chartLucidColor: newColor });
  };

  const handleResetChartColors = () => {
    setChartTotalColor('#3b82f6');
    setChartLucidColor('#06b6d4');
    preferencesService.updatePreferences({
      chartTotalColor: '#3b82f6',
      chartLucidColor: '#06b6d4',
    });
  };

  const isCustomColors =
    chartTotalColor.toLowerCase() !== '#3b82f6' ||
    (chartLucidColor.toLowerCase() !== '#06b6d4' && chartLucidColor.toLowerCase() !== '#06b6d4');

  const handleRangeChange = async (newRange: RecallRange) => {
    setRecallRange(newRange);
    try {
      localStorage.setItem('oneiric_recall_range', newRange);
    } catch {
      // ignore
    }
    try {
      const chartData = await dreamService.getRecallChartData(newRange);
      setRecallChartData(chartData);
    } catch (err) {
      console.error('Failed to load recall chart data:', err);
    }
  };

  const handleCopyGraphText = async () => {
    if (!recallChartData || recallChartData.length === 0) return;
    const textDescription = generateRecallGraphDescription(
      recallChartData,
      recallRange,
      RECALL_RANGE_TITLES[recallRange]
    );

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textDescription);
      } else {
        throw new Error('Clipboard API unavailable');
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = textDescription;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
      } catch (err) {
        console.error('Failed to copy graph text description:', err);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchData = () => {
      Promise.all([
        analyticsService.getAnalytics(timeRange, lucidityFilter),
        dreamService.getRecallChartData(recallRange),
      ]).then(([res, chartData]) => {
        if (isMounted) {
          setData(res);
          setRecallChartData(chartData);
          setIsLoading(false);
        }
      });
    };
    fetchData();
    window.addEventListener('oneiric:dream-saved', fetchData);
    window.addEventListener('oneiric:sample-data-changed', fetchData);
    return () => {
      isMounted = false;
      window.removeEventListener('oneiric:dream-saved', fetchData);
      window.removeEventListener('oneiric:sample-data-changed', fetchData);
    };
  }, [timeRange, lucidityFilter, recallRange]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Dream Intelligence & Analytics</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Data-driven patterns, circadian recall rhythms, and conscious agency metrics.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time range buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            {(['7d', '30d', '90d', '1y', 'all'] as TimeRangeFilter[]).map((tr) => (
              <button
                key={tr}
                type="button"
                onClick={() => setTimeRange(tr)}
                className={`px-2.5 py-1 rounded-md font-medium transition-all duration-150 active:scale-95 cursor-pointer ${
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
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
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
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all duration-200 ease-out hover:-translate-y-0.5 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Dreams in Window
              </span>
              <div className="text-2xl font-bold text-slate-100">
                <AnimatedNumber value={data.totalDreams} />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {data.recordedDaysCount} of {data.calendarDaysCount} nights journaled
              </p>
            </div>

            {/* Recall Rate */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all duration-200 ease-out hover:-translate-y-0.5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-400">
                  Recall Consistency
                </span>
                <span className="text-xs font-bold text-blue-400">
                  <AnimatedNumber value={`${data.recallRate}%`} />
                </span>
              </div>
              <div className="text-2xl font-bold text-slate-100">
                <AnimatedNumber value={`${data.recallRate}%`} />
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${data.recallRate}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                Nights with at least 1 remembered dream
              </p>
            </div>

            {/* Lucid Rate */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all duration-200 ease-out hover:-translate-y-0.5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-slate-400">
                  Lucidity Frequency
                </span>
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-cyan-300">
                <AnimatedNumber value={data.totalLucid} />{' '}
                <span className="text-sm font-normal text-slate-400">({data.lucidityRate}%)</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Consciously awake nocturnal experiences
              </p>
            </div>

            {/* Average Vividness & Control */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-all duration-200 ease-out hover:-translate-y-0.5 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 block mb-1">
                Quality & Agency
              </span>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-2xl font-bold text-amber-300">
                    <AnimatedNumber value={data.averageVividness} />
                  </span>
                  <span className="text-xs text-slate-500 block">Vividness (/5)</span>
                </div>
                <div className="h-8 w-px bg-slate-800" />
                <div>
                  <span className="text-2xl font-bold text-blue-300">
                    {data.averageDreamControl !== null ? data.averageDreamControl : '—'}
                  </span>
                  <span className="text-xs text-slate-500 block">Control (/5)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Scientific Disclaimer Note */}
          <div className="p-3.5 rounded-lg bg-slate-900/50 border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Measurement methodology:</strong> Recall consistency reflects recorded nights in the journal. Unrecorded nights indicate no entry was submitted; they do not assume the absence of dreams, as dream forgetting is a natural neurochemical occurrence.
            </p>
          </div>

          {/* Main Visuals: Recall Activity Chart */}
          <div className="p-5 sm:p-6 rounded-xl bg-slate-900/60 border border-slate-800">
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
                        className={`px-2.5 py-1 rounded-md font-medium transition-all duration-150 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
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

                {/* Copy Graph Text Button */}
                <button
                  type="button"
                  onClick={handleCopyGraphText}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all duration-150 active:scale-95 cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none ${
                    isCopied
                      ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 shadow-sm'
                      : 'bg-[#0b132b] hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-slate-100'
                  }`}
                  title="Copy full text summary of the graph (peaks, dips, lucid/non-lucid breakdown, and date table)"
                  aria-label="Copy graph in text"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Copy Graph</span>
                    </>
                  )}
                </button>

                {/* Interactive Legend with Color Pickers */}
                <div className="flex items-center gap-3 text-xs pl-1">
                  <label
                    className="flex items-center gap-1.5 cursor-pointer group"
                    title="Click to customize Total dreams line color"
                  >
                    <span className="relative flex items-center justify-center">
                      <span
                        className="w-3 h-3 rounded-sm border border-white/20 shadow-xs transition-transform group-hover:scale-110"
                        style={{ backgroundColor: chartTotalColor }}
                      />
                      <input
                        type="color"
                        value={chartTotalColor}
                        onChange={(e) => handleUpdateTotalColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        aria-label="Pick color for Total dreams line"
                      />
                    </span>
                    <span className="text-slate-300 font-medium group-hover:text-white transition-colors">
                      Total
                    </span>
                  </label>

                  <label
                    className="flex items-center gap-1.5 cursor-pointer group"
                    title="Click to customize Lucid dreams line color"
                  >
                    <span className="relative flex items-center justify-center">
                      <span
                        className="w-3 h-3 rounded-sm border border-white/20 shadow-xs transition-transform group-hover:scale-110"
                        style={{ backgroundColor: chartLucidColor }}
                      />
                      <input
                        type="color"
                        value={chartLucidColor}
                        onChange={(e) => handleUpdateLucidColor(e.target.value)}
                        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        aria-label="Pick color for Lucid dreams line"
                      />
                    </span>
                    <span
                      className="font-medium group-hover:brightness-125 transition-all"
                      style={{ color: chartLucidColor }}
                    >
                      Lucid
                    </span>
                  </label>

                  {isCustomColors && (
                    <button
                      type="button"
                      onClick={handleResetChartColors}
                      className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer pl-1 border-l border-slate-800"
                      title="Reset graph line colors to default"
                      aria-label="Reset graph line colors to default"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <RecallChart
              data={recallChartData}
              totalColor={chartTotalColor}
              lucidColor={chartLucidColor}
            />
          </div>

          {/* Comparative Trends Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Weekly Comparison */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">
                  Weekly Recall Momentum
                </span>
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold text-slate-100">
                  {data.weeklyComparison.thisWeek} dreams
                </span>
                <span className="text-xs text-slate-400">this week</span>
              </div>
              <div className="mt-2 text-xs flex items-center gap-2">
                <span className="text-slate-400">vs last week: {data.weeklyComparison.lastWeek}</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-md ${
                    data.weeklyComparison.difference >= 0
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
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
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400">
                  Monthly Recall Horizon
                </span>
                <Calendar className="w-4 h-4 text-blue-400" />
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-xl font-bold text-slate-100">
                  {data.monthlyComparison.thisMonth} dreams
                </span>
                <span className="text-xs text-slate-400">past 30 days</span>
              </div>
              <div className="mt-2 text-xs flex items-center gap-2">
                <span className="text-slate-400">vs prior 30 days: {data.monthlyComparison.lastMonth}</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded-md ${
                    data.monthlyComparison.difference >= 0
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/50'
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
          <div className="p-5 sm:p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Dream Recall Activity Heatmap</h2>
              <p className="text-xs text-slate-400">Nocturnal distribution across the last 90 calendar days</p>
            </div>

            <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-slate-950/50 border border-slate-800/60">
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
                    className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-xs transition-colors cursor-pointer ${
                      hasLucid
                        ? 'bg-cyan-400'
                        : hasFA
                        ? 'bg-sky-500'
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Top Emotions */}
            <div className="p-5 sm:p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-sm font-semibold text-slate-100">Dominant Emotional Frequencies</h2>
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
            <div className="p-5 sm:p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h2 className="text-sm font-semibold text-slate-100">Recurring Thematic Tags</h2>
              {data.topTags.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No tags logged in this window.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.topTags.map((t) => (
                    <div
                      key={t.tag}
                      className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs flex items-center gap-1.5 text-slate-200"
                    >
                      <span className="text-blue-400">#{t.tag}</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 text-[10px] font-mono">
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
