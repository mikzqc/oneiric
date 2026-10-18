import React, { useState, useEffect } from 'react';
import { correlationService } from '../services/correlationService';
import {
  CorrelationFilter,
  CorrelationReport,
  CorrelationTimeRange,
} from '../types/correlation';
import { DreamSignCategory } from '../types/dreamSign';
import { DreamEntry } from '../types/dream';
import { CorrelationSummaryBar } from '../components/correlation/CorrelationSummaryBar';
import { CorrelationCard } from '../components/correlation/CorrelationCard';
import { DrilldownDreamsModal } from '../components/correlation/DrilldownDreamsModal';
import { EmptyState } from '../components/common/EmptyState';
import {
  Network,
  Eye,
  Star,
  Smile,
  AlertTriangle,
  Layers,
  Compass,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface CorrelationPageProps {
  onOpenDream?: (dream: DreamEntry) => void;
}

type CorrelationTab =
  | 'signs-lucidity'
  | 'signs-vividness'
  | 'emotions'
  | 'false-awakenings'
  | 'scene-complexity'
  | 'techniques';

export const CorrelationPage: React.FC<CorrelationPageProps> = ({ onOpenDream }) => {
  const [filter, setFilter] = useState<CorrelationFilter>({
    timeRange: 'all',
    lucidityFilter: 'all',
    signStatus: 'all_active',
    minOccurrences: 2,
    category: 'all',
  });

  const [activeTab, setActiveTab] = useState<CorrelationTab>('signs-lucidity');
  const [report, setReport] = useState<CorrelationReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMethodology, setShowMethodology] = useState(false);

  // Drilldown modal state
  const [drilldownModal, setDrilldownModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    dreamIds: string[];
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    dreamIds: [],
  });

  useEffect(() => {
    let isMounted = true;

    const fetchReport = () => {
      correlationService
        .computeCorrelations(filter)
        .then((res) => {
          if (isMounted) {
            setReport(res);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to compute correlations:', err);
          if (isMounted) setIsLoading(false);
        });
    };

    fetchReport();
    window.addEventListener('oneiric:dream-saved', fetchReport);
    window.addEventListener('oneiric:sample-data-changed', fetchReport);

    return () => {
      isMounted = false;
      window.removeEventListener('oneiric:dream-saved', fetchReport);
      window.removeEventListener('oneiric:sample-data-changed', fetchReport);
    };
  }, [filter]);

  const openDrilldown = (title: string, subtitle: string, dreamIds: string[]) => {
    setDrilldownModal({
      isOpen: true,
      title,
      subtitle,
      dreamIds,
    });
  };

  if (isLoading || !report) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const tabs = [
    {
      id: 'signs-lucidity' as CorrelationTab,
      label: 'Signs & Lucidity',
      icon: Eye,
      count: report.signLucidityCorrelations.length,
    },
    {
      id: 'signs-vividness' as CorrelationTab,
      label: 'Signs & Vividness',
      icon: Star,
      count: report.signVividnessCorrelations.length,
    },
    {
      id: 'emotions' as CorrelationTab,
      label: 'Emotional Triggers',
      icon: Smile,
      count: report.emotionLucidityCorrelations.length,
    },
    {
      id: 'false-awakenings' as CorrelationTab,
      label: 'False Awakenings',
      icon: AlertTriangle,
      count: report.faSignCorrelations.length,
    },
    {
      id: 'scene-complexity' as CorrelationTab,
      label: 'Scene Complexity',
      icon: Layers,
      count: report.sceneComplexity.totalAnalyzedDreams > 0 ? 1 : 0,
    },
    {
      id: 'techniques' as CorrelationTab,
      label: 'Techniques vs Recall',
      icon: Compass,
      count: report.techniqueOutcomes.length,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
            Cross-Dream Correlation Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Empirical descriptive associations across recurring signs, emotions, scene complexity, and induction techniques.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            {(['30d', '90d', '1y', 'all'] as CorrelationTimeRange[]).map((tr) => (
              <button
                key={tr}
                type="button"
                onClick={() => setFilter((prev) => ({ ...prev, timeRange: tr }))}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filter.timeRange === tr
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tr.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Sign Status Toggle */}
          <select
            value={filter.signStatus}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                signStatus: e.target.value as 'all_active' | 'confirmed_only',
              }))
            }
            aria-label="Filter by sign status"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all_active">All Active Signs (Confirmed + Suggested)</option>
            <option value="confirmed_only">Confirmed Signs Only</option>
          </select>

          {/* Min Occurrences */}
          <select
            value={filter.minOccurrences}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, minOccurrences: Number(e.target.value) }))
            }
            aria-label="Filter by minimum occurrences"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value={2}>Min Occurrences: ≥ 2</option>
            <option value={3}>Min Occurrences: ≥ 3 (Recommended)</option>
            <option value={5}>Min Occurrences: ≥ 5 (High Evidence)</option>
          </select>

          {/* Category Filter */}
          <select
            value={filter.category || 'all'}
            onChange={(e) =>
              setFilter((prev) => ({
                ...prev,
                category: e.target.value as DreamSignCategory | 'all',
              }))
            }
            aria-label="Filter by sign category"
            className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="anomaly">Anomalies</option>
            <option value="location">Locations</option>
            <option value="object">Objects</option>
            <option value="person">People</option>
            <option value="action">Actions</option>
            <option value="emotion">Emotions</option>
          </select>
        </div>
      </div>

      {/* Top Metrics Summary Bar */}
      <CorrelationSummaryBar report={report} />

      {/* Statistical Integrity Notice */}
      <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-200">Descriptive Nocturnal Associations (Correlation ≠ Causation)</p>
          <p className="text-slate-400 leading-relaxed text-[11px]">
            Statistical patterns represent observed co-occurrences in your private journal entries. They do not constitute scientific proof of causation. Sample size (<span className="font-mono text-slate-300">n</span>) and baseline comparisons are reported beside every observation.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-800 overflow-x-auto gap-2 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                  isActive ? 'bg-blue-900/60 text-blue-200' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tab Content 1: Signs & Lucidity */}
      {activeTab === 'signs-lucidity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Dream Signs Associated with Conscious Lucidity
            </h2>
            <span className="text-xs text-slate-400">
              Baseline: <strong className="text-slate-200">{report.baselineLucidityRate}%</strong>
            </span>
          </div>

          {report.signLucidityCorrelations.length === 0 ? (
            <EmptyState
              title="No Recurring Sign Correlations Found"
              description={`No active dream signs meet the current threshold of ≥ ${filter.minOccurrences} occurrences in the selected period. Log more dreams containing recurring signs or lower the occurrence threshold.`}
              icon={<Network className="w-10 h-10 text-blue-400" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.signLucidityCorrelations.map((item) => (
                <CorrelationCard
                  key={item.signId}
                  title={item.signName}
                  category={item.category}
                  sampleSize={item.totalOccurrences}
                  rateWithElement={item.signLucidityRate}
                  baselineRate={item.baselineLucidityRate}
                  rateDifference={item.rateDifference}
                  relativeRisk={item.relativeRisk}
                  confidence={item.confidence}
                  metricLabel="Lucidity Rate"
                  onInspect={() =>
                    openDrilldown(
                      `Dreams containing "${item.signName}"`,
                      `${item.lucidOccurrences} of ${item.totalOccurrences} dreams with this sign were lucid (${item.signLucidityRate}% vs ${item.baselineLucidityRate}% baseline).`,
                      item.matchedDreamIds
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 2: Signs & Vividness */}
      {activeTab === 'signs-vividness' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Dream Signs Associated with Sensory Vividness (1–5 Scale)
            </h2>
            <span className="text-xs text-slate-400">
              Average Vividness: <strong className="text-slate-200">{report.averageVividness} / 5</strong>
            </span>
          </div>

          {report.signVividnessCorrelations.length === 0 ? (
            <EmptyState
              title="No Vividness Correlations Found"
              description={`No signs meet the minimum threshold of ≥ ${filter.minOccurrences} rated dreams in this period.`}
              icon={<Star className="w-10 h-10 text-amber-400" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.signVividnessCorrelations.map((item) => (
                <CorrelationCard
                  key={item.signId}
                  title={item.signName}
                  category={item.category}
                  sampleSize={item.sampleSize}
                  rateWithElement={item.avgVividnessWithSign}
                  baselineRate={item.avgVividnessWithoutSign}
                  rateDifference={item.vividnessDifference}
                  confidence={item.confidence}
                  unit=" / 5"
                  metricLabel="Average Vividness"
                  onInspect={() =>
                    openDrilldown(
                      `Dreams containing "${item.signName}"`,
                      `Average vividness is ${item.avgVividnessWithSign}/5 vs ${item.avgVividnessWithoutSign}/5 without this sign.`,
                      item.matchedDreamIds
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: Emotional Triggers */}
      {activeTab === 'emotions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Emotional States Co-occurring with Conscious Awakenings
            </h2>
            <span className="text-xs text-slate-400">
              Baseline: <strong className="text-slate-200">{report.baselineLucidityRate}%</strong>
            </span>
          </div>

          {report.emotionLucidityCorrelations.length === 0 ? (
            <EmptyState
              title="No Emotional Correlations Found"
              description="Add emotional tags when logging dreams to discover whether feelings like Wonder, Serenity, or Fear correlate with becoming lucid."
              icon={<Smile className="w-10 h-10 text-amber-400" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.emotionLucidityCorrelations.map((item) => (
                <CorrelationCard
                  key={item.emotion}
                  title={item.emotion}
                  sampleSize={item.totalOccurrences}
                  rateWithElement={item.emotionLucidityRate}
                  baselineRate={item.baselineLucidityRate}
                  rateDifference={item.rateDifference}
                  confidence={item.confidence}
                  metricLabel="Lucidity Rate"
                  onInspect={() =>
                    openDrilldown(
                      `Dreams tagged with feeling "${item.emotion}"`,
                      `${item.lucidOccurrences} of ${item.totalOccurrences} dreams featuring "${item.emotion}" were lucid (${item.emotionLucidityRate}% vs ${item.baselineLucidityRate}% baseline).`,
                      item.matchedDreamIds
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 4: False Awakenings */}
      {activeTab === 'false-awakenings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Recurring Elements Disproportionately Present in False Awakenings
            </h2>
            <span className="text-xs text-slate-400">
              Baseline FA Rate: <strong className="text-slate-200">{report.baselineFARate}%</strong> ({report.totalFalseAwakenings} total)
            </span>
          </div>

          {report.faSignCorrelations.length === 0 ? (
            <EmptyState
              title="No False Awakening Sign Correlations"
              description="Log dreams with false awakenings enabled in the editor to track which recurring elements (like bedrooms, clocks, or light switches) accompany simulated awakenings."
              icon={<AlertTriangle className="w-10 h-10 text-amber-400" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.faSignCorrelations.map((item) => (
                <CorrelationCard
                  key={item.signId}
                  title={item.signName}
                  category={item.category}
                  sampleSize={item.signOccurrencesInFA}
                  rateWithElement={item.faRateWithSign}
                  baselineRate={item.baselineFARate}
                  rateDifference={item.rateDifference}
                  confidence={item.confidence}
                  metricLabel="False Awakening Rate"
                  onInspect={() =>
                    openDrilldown(
                      `False Awakening Dreams with "${item.signName}"`,
                      `${item.signOccurrencesInFA} false awakenings contain this sign (${item.faRateWithSign}% of all occurrences vs ${item.baselineFARate}% baseline).`,
                      item.matchedDreamIds
                    )
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content 5: Scene Complexity */}
      {activeTab === 'scene-complexity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Single-Scene vs. Multi-Scene Dream Structure
            </h2>
            <span className="text-xs text-slate-400">
              Total Analyzed: <strong className="text-slate-200">{report.sceneComplexity.totalAnalyzedDreams} dreams</strong>
            </span>
          </div>

          {report.sceneComplexity.totalAnalyzedDreams === 0 ? (
            <EmptyState
              title="No Scene Complexity Data"
              description="Record dreams with multiple scenes in the editor to evaluate whether multi-scene dreams correlate with higher sensory vividness or agency/control ratings."
              icon={<Layers className="w-10 h-10 text-blue-400" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vividness Comparison Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">Sensory Vividness</span>
                  <span className="text-xs font-mono text-slate-400">Scale 1–5</span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Single-Scene ({report.sceneComplexity.singleSceneCount})</span>
                    <span className="text-base font-bold text-slate-200">
                      {report.sceneComplexity.singleSceneAvgVividness ?? '—'} / 5
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Multi-Scene ({report.sceneComplexity.multiSceneCount})</span>
                    <span className="text-base font-bold text-blue-300">
                      {report.sceneComplexity.multiSceneAvgVividness ?? '—'} / 5
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>
                    Shift:{' '}
                    <strong className={Number(report.sceneComplexity.vividnessDifference) > 0 ? 'text-emerald-400' : 'text-slate-300'}>
                      {Number(report.sceneComplexity.vividnessDifference) > 0 ? `+${report.sceneComplexity.vividnessDifference}` : report.sceneComplexity.vividnessDifference ?? '0'}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      openDrilldown(
                        'Multi-Scene Dreams',
                        'Dreams recorded with 2 or more distinct sequential scenes.',
                        report.sceneComplexity.multiSceneDreamIds
                      )
                    }
                    className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer"
                  >
                    Inspect Multi-Scene Dreams
                  </button>
                </div>
              </div>

              {/* Dream Control Comparison Card */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-100">Dream Agency & Control</span>
                  <span className="text-xs font-mono text-slate-400">Scale 1–5</span>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Single-Scene</span>
                    <span className="text-base font-bold text-slate-200">
                      {report.sceneComplexity.singleSceneAvgControl ?? '—'} / 5
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Multi-Scene</span>
                    <span className="text-base font-bold text-blue-300">
                      {report.sceneComplexity.multiSceneAvgControl ?? '—'} / 5
                    </span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 flex items-center justify-between pt-1">
                  <span>
                    Shift:{' '}
                    <strong className={Number(report.sceneComplexity.controlDifference) > 0 ? 'text-emerald-400' : 'text-slate-300'}>
                      {Number(report.sceneComplexity.controlDifference) > 0 ? `+${report.sceneComplexity.controlDifference}` : report.sceneComplexity.controlDifference ?? '0'}
                    </strong>
                  </span>
                  <span className="text-[10px] text-slate-500">Unrated dreams excluded</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 6: Induction Techniques vs Recall */}
      {activeTab === 'techniques' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">
              Personal Induction Protocols vs. Recall Outcomes
            </h2>
            <span className="text-xs text-slate-400">
              {report.techniqueOutcomes.length} protocols evaluated
            </span>
          </div>

          {report.techniqueOutcomes.length === 0 ? (
            <EmptyState
              title="No Technique Logs Found"
              description="Log induction practices like MILD, SSILD, or WBTB in the Techniques section to track recall and lucidity success rates over time."
              icon={<Compass className="w-10 h-10 text-cyan-400" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.techniqueOutcomes.map((t) => (
                <div
                  key={t.technique}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{t.technique}</h3>
                      <p className="text-[11px] text-slate-400 font-mono">
                        Logged on <strong className="text-slate-300">{t.sampleSize}</strong> {t.sampleSize === 1 ? 'night' : 'nights'}
                      </p>
                    </div>
                    {t.hasSufficientData ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                        Reliable (n ≥ 3)
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-amber-950/70 text-amber-300 border border-amber-800/50">
                        Low Sample (n &lt; 3)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-950 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Morning Recall Rate</span>
                      <span className="text-base font-bold text-slate-200">
                        {t.recallRate}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {t.recallCount} / {t.sampleSize} nights
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 block">Lucidity Achieved</span>
                      <span className="text-base font-bold text-blue-400">
                        {t.lucidRate}%
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        {t.lucidCount} / {t.sampleSize} nights
                      </span>
                    </div>
                  </div>

                  {typeof t.avgConfidence === 'number' && (
                    <div className="text-[11px] text-slate-400 pt-1">
                      Average Subjective Confidence: <strong className="text-slate-200">{t.avgConfidence} / 5</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Methodology & Calculation Formulas Accordion */}
      <div className="pt-4 border-t border-slate-800/80">
        <button
          type="button"
          onClick={() => setShowMethodology(!showMethodology)}
          className="w-full p-3.5 rounded-lg bg-slate-900/40 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs text-slate-300 cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            <span className="font-semibold">Calculation Methodology & Statistical Safeguards</span>
          </div>
          {showMethodology ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showMethodology && (
          <div className="p-4 mt-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-3 leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="font-semibold text-blue-300">1. Distinct Entry Counting</span>
                <p className="text-slate-400 text-[11px]">
                  Recurring mentions of a word within a single dream narrative are strictly counted as <strong>one occurrence</strong>. We analyze co-occurrence across distinct nocturnal entries, preventing repeated phrasing from distorting rates.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-blue-300">2. Baseline & Shift</span>
                <p className="text-slate-400 text-[11px]">
                  <strong>Rate Difference (Shift):</strong> Calculated as <code className="text-slate-200">Rate(Sign) − Rate(Overall)</code> in percentage points. Positive values indicate higher frequency of conscious lucidity or false awakening when the sign is present.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-blue-300">3. Relative Risk Ratio</span>
                <p className="text-slate-400 text-[11px]">
                  <code className="text-slate-200">RR = P(Lucid | Sign) / P(Lucid | ~Sign)</code>. Measures how many times more likely a dream is to be lucid when the recurring sign occurs compared to nights when it does not.
                </p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-blue-300">4. Treatment of Missing Data</span>
                <p className="text-slate-400 text-[11px]">
                  Dreams with unrated vividness or control are never filled with assumed 0 values. Unrated records are cleanly excluded from vividness and agency calculations to preserve statistical integrity.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supporting Dreams Drilldown Modal */}
      <DrilldownDreamsModal
        isOpen={drilldownModal.isOpen}
        onClose={() => setDrilldownModal((prev) => ({ ...prev, isOpen: false }))}
        title={drilldownModal.title}
        subtitle={drilldownModal.subtitle}
        dreamIds={drilldownModal.dreamIds}
        onOpenDream={onOpenDream}
      />
    </div>
  );
};
