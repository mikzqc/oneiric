import { db } from '../db/database';
import { DreamEntry } from '../types/dream';
import { DreamSign } from '../types/dreamSign';
import { TechniqueLog } from '../types/technique';
import {
  CorrelationFilter,
  CorrelationReport,
  SignLucidityCorrelation,
  SignVividnessCorrelation,
  EmotionLucidityCorrelation,
  FalseAwakeningSignCorrelation,
  SceneComplexityCorrelation,
  TechniqueOutcomeCorrelation,
  ConfidenceRating,
} from '../types/correlation';
import { getTodayDateString, parseLocalDate } from '../utils/dateUtils';
import { normalizeText, matchesKeyword } from './dreamSignService';

function calculateConfidence(sampleSize: number): ConfidenceRating {
  if (sampleSize >= 5) return 'high';
  if (sampleSize >= 3) return 'moderate';
  return 'low';
}

function roundTo1Decimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundTo2Decimals(value: number): number {
  return Math.round(value * 100) / 100;
}

export const correlationService = {
  /**
   * Evaluates if a given dream entry matches a dream sign by:
   * 1. Direct explicit linkage in sign.linkedDreamIds
   * 2. Keyword or alias matching in dream title, narrative, tags, or notes
   */
  dreamMatchesSign(dream: DreamEntry, sign: DreamSign): boolean {
    if (sign.excludedDreamIds && sign.excludedDreamIds.includes(dream.id)) {
      return false;
    }

    if (sign.linkedDreamIds && sign.linkedDreamIds.includes(dream.id)) {
      return true;
    }

    const narrativeText = normalizeText(
      `${dream.title} ${dream.narrative} ${dream.tags?.join(' ') || ''} ${dream.dreamSignsNotes || ''}`
    );

    // Check each keyword/alias defined for this sign
    if (sign.keywords && sign.keywords.length > 0) {
      for (const kw of sign.keywords) {
        if (matchesKeyword(narrativeText, kw)) {
          return true;
        }
      }
    }

    // Also match sign name itself
    if (sign.name && matchesKeyword(narrativeText, sign.name)) {
      return true;
    }

    return false;
  },

  /**
   * Computes the complete cross-dream correlation report deterministically.
   */
  async computeCorrelations(
    filter: CorrelationFilter = {
      timeRange: 'all',
      lucidityFilter: 'all',
      signStatus: 'all_active',
      minOccurrences: 2,
    },
    referenceDate: Date = new Date()
  ): Promise<CorrelationReport> {
    const [allDreamsRaw, allSignsRaw, allTechniquesRaw] = await Promise.all([
      db.dreams.toArray(),
      db.dreamSigns.toArray(),
      db.techniqueLogs.toArray(),
    ]);

    // Exclude ephemeral sample preview data from production analysis unless specified
    const allDreams = allDreamsRaw.filter((d) => !d.isSample);
    const allSigns = allSignsRaw.filter((s) => !s.isSample);
    const allTechniques = allTechniquesRaw.filter((t) => !t.isSample);

    // 1. Determine Date Range Boundaries
    const todayStr = getTodayDateString(referenceDate);
    const startDateObj = new Date(referenceDate);
    let daysInPeriod = 30;

    if (filter.timeRange === '30d') daysInPeriod = 30;
    else if (filter.timeRange === '90d') daysInPeriod = 90;
    else if (filter.timeRange === '1y') daysInPeriod = 365;
    else if (filter.timeRange === 'all') {
      if (allDreams.length > 0) {
        const sortedDates = allDreams.map((d) => d.date).sort();
        const earliest = parseLocalDate(sortedDates[0]);
        const diffMs = referenceDate.getTime() - earliest.getTime();
        daysInPeriod = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1, 1);
      } else {
        daysInPeriod = 1;
      }
    }

    startDateObj.setDate(startDateObj.getDate() - (daysInPeriod - 1));
    const startDateStr = getTodayDateString(startDateObj);

    // Filter dreams within selected time range
    const periodDreams = allDreams.filter((d) => {
      const inDate = filter.timeRange === 'all' ? true : d.date >= startDateStr && d.date <= todayStr;
      if (!inDate) return false;
      if (filter.lucidityFilter !== 'all' && d.lucidity !== filter.lucidityFilter) return false;
      return true;
    });

    const totalDreamsAnalyzed = periodDreams.length;
    const totalLucidDreams = periodDreams.filter((d) => d.lucidity === 'lucid').length;
    const totalFalseAwakenings = periodDreams.filter((d) => Boolean(d.falseAwakening)).length;

    // Baselines
    const baselineLucidityRate =
      totalDreamsAnalyzed > 0
        ? roundTo1Decimal((totalLucidDreams / totalDreamsAnalyzed) * 100)
        : 0;

    const baselineFARate =
      totalDreamsAnalyzed > 0
        ? roundTo1Decimal((totalFalseAwakenings / totalDreamsAnalyzed) * 100)
        : 0;

    const dreamsWithVividness = periodDreams.filter(
      (d) => typeof d.vividness === 'number' && d.vividness >= 1 && d.vividness <= 5
    );
    const averageVividness =
      dreamsWithVividness.length > 0
        ? roundTo2Decimals(
            dreamsWithVividness.reduce((acc, d) => acc + d.vividness, 0) / dreamsWithVividness.length
          )
        : 0;

    // 2. Filter Active Dream Signs
    const activeSigns = allSigns.filter((sign) => {
      if (sign.status === 'dismissed') return false;
      if (filter.signStatus === 'confirmed_only' && sign.status !== 'confirmed') return false;
      if (filter.category && filter.category !== 'all' && sign.category !== filter.category) {
        return false;
      }
      return true;
    });

    // Precompute dream membership map for each sign (ensuring DISTINCT dream IDs only)
    const signToDreamIdsMap = new Map<string, string[]>();
    for (const sign of activeSigns) {
      const matchedDreamIdSet = new Set<string>();
      for (const dream of periodDreams) {
        if (this.dreamMatchesSign(dream, sign)) {
          matchedDreamIdSet.add(dream.id);
        }
      }
      signToDreamIdsMap.set(sign.id, Array.from(matchedDreamIdSet));
    }

    // 3. Domain A: Dream Signs vs. Lucidity Status
    const signLucidityCorrelations: SignLucidityCorrelation[] = [];
    for (const sign of activeSigns) {
      const matchedDreamIds = signToDreamIdsMap.get(sign.id) || [];
      const distinctCount = matchedDreamIds.length;

      if (distinctCount < filter.minOccurrences) continue;

      const dreamsWithSign = periodDreams.filter((d) => matchedDreamIds.includes(d.id));
      const lucidCount = dreamsWithSign.filter((d) => d.lucidity === 'lucid').length;
      const nonLucidCount = dreamsWithSign.filter((d) => d.lucidity === 'non-lucid').length;
      const uncertainCount = dreamsWithSign.filter((d) => d.lucidity === 'uncertain').length;

      const signLucidityRate = roundTo1Decimal((lucidCount / distinctCount) * 100);
      const rateDifference = roundTo1Decimal(signLucidityRate - baselineLucidityRate);

      // Relative risk: P(Lucid | Sign) / P(Lucid | ~Sign)
      const dreamsWithoutSign = periodDreams.filter((d) => !matchedDreamIds.includes(d.id));
      let relativeRisk: number | null = null;
      if (dreamsWithoutSign.length > 0) {
        const lucidWithoutSign = dreamsWithoutSign.filter((d) => d.lucidity === 'lucid').length;
        const nonSignLucidityRate = lucidWithoutSign / dreamsWithoutSign.length;
        if (nonSignLucidityRate > 0) {
          relativeRisk = roundTo2Decimals((lucidCount / distinctCount) / nonSignLucidityRate);
        }
      }

      signLucidityCorrelations.push({
        signId: sign.id,
        signName: sign.name,
        category: sign.category,
        status: sign.status,
        totalOccurrences: distinctCount,
        lucidOccurrences: lucidCount,
        nonLucidOccurrences: nonLucidCount,
        uncertainOccurrences: uncertainCount,
        signLucidityRate,
        baselineLucidityRate,
        rateDifference,
        relativeRisk,
        matchedDreamIds,
        confidence: calculateConfidence(distinctCount),
      });
    }

    // Sort by absolute rate difference descending, then by sample size
    signLucidityCorrelations.sort(
      (a, b) => Math.abs(b.rateDifference) - Math.abs(a.rateDifference) || b.totalOccurrences - a.totalOccurrences
    );

    // 4. Domain B: Dream Signs vs. Vividness Ratings
    const signVividnessCorrelations: SignVividnessCorrelation[] = [];
    for (const sign of activeSigns) {
      const matchedDreamIds = signToDreamIdsMap.get(sign.id) || [];
      const dreamsWithSign = periodDreams.filter((d) => matchedDreamIds.includes(d.id));
      const withVividness = dreamsWithSign.filter(
        (d) => typeof d.vividness === 'number' && d.vividness >= 1 && d.vividness <= 5
      );

      if (withVividness.length < filter.minOccurrences) continue;

      const dreamsWithoutSign = periodDreams.filter(
        (d) =>
          !matchedDreamIds.includes(d.id) &&
          typeof d.vividness === 'number' &&
          d.vividness >= 1 &&
          d.vividness <= 5
      );

      const avgWith =
        withVividness.reduce((acc, d) => acc + d.vividness, 0) / withVividness.length;
      const avgWithout =
        dreamsWithoutSign.length > 0
          ? dreamsWithoutSign.reduce((acc, d) => acc + d.vividness, 0) / dreamsWithoutSign.length
          : averageVividness;

      const diff = roundTo2Decimals(avgWith - avgWithout);

      signVividnessCorrelations.push({
        signId: sign.id,
        signName: sign.name,
        category: sign.category,
        status: sign.status,
        sampleSize: withVividness.length,
        avgVividnessWithSign: roundTo2Decimals(avgWith),
        avgVividnessWithoutSign: roundTo2Decimals(avgWithout),
        vividnessDifference: diff,
        matchedDreamIds: withVividness.map((d) => d.id),
        confidence: calculateConfidence(withVividness.length),
      });
    }

    signVividnessCorrelations.sort(
      (a, b) => Math.abs(b.vividnessDifference) - Math.abs(a.vividnessDifference) || b.sampleSize - a.sampleSize
    );

    // 5. Domain C: Emotional Tags vs. Lucidity Status
    const emotionMap = new Map<string, { totalDreamIds: Set<string>; lucidDreamIds: Set<string> }>();
    for (const dream of periodDreams) {
      if (dream.emotions && Array.isArray(dream.emotions)) {
        for (const rawEmotion of dream.emotions) {
          const norm = rawEmotion.trim();
          if (!norm) continue;
          const key = norm.charAt(0).toUpperCase() + norm.slice(1).toLowerCase();

          if (!emotionMap.has(key)) {
            emotionMap.set(key, { totalDreamIds: new Set(), lucidDreamIds: new Set() });
          }
          const entry = emotionMap.get(key)!;
          entry.totalDreamIds.add(dream.id);
          if (dream.lucidity === 'lucid') {
            entry.lucidDreamIds.add(dream.id);
          }
        }
      }
    }

    const emotionLucidityCorrelations: EmotionLucidityCorrelation[] = [];
    for (const [emotion, data] of emotionMap.entries()) {
      const total = data.totalDreamIds.size;
      if (total < filter.minOccurrences) continue;

      const lucid = data.lucidDreamIds.size;
      const emotionLucidityRate = roundTo1Decimal((lucid / total) * 100);
      const rateDifference = roundTo1Decimal(emotionLucidityRate - baselineLucidityRate);

      emotionLucidityCorrelations.push({
        emotion,
        totalOccurrences: total,
        lucidOccurrences: lucid,
        emotionLucidityRate,
        baselineLucidityRate,
        rateDifference,
        matchedDreamIds: Array.from(data.totalDreamIds),
        confidence: calculateConfidence(total),
      });
    }

    emotionLucidityCorrelations.sort(
      (a, b) => Math.abs(b.rateDifference) - Math.abs(a.rateDifference) || b.totalOccurrences - a.totalOccurrences
    );

    // 6. Domain D: False Awakenings vs. Dream Sign Recurrence
    const faSignCorrelations: FalseAwakeningSignCorrelation[] = [];
    for (const sign of activeSigns) {
      const matchedDreamIds = signToDreamIdsMap.get(sign.id) || [];
      const distinctCount = matchedDreamIds.length;

      if (distinctCount < filter.minOccurrences) continue;

      const dreamsWithSign = periodDreams.filter((d) => matchedDreamIds.includes(d.id));
      const faCount = dreamsWithSign.filter((d) => Boolean(d.falseAwakening)).length;

      const faRateWithSign = roundTo1Decimal((faCount / distinctCount) * 100);
      const rateDifference = roundTo1Decimal(faRateWithSign - baselineFARate);

      faSignCorrelations.push({
        signId: sign.id,
        signName: sign.name,
        category: sign.category,
        status: sign.status,
        signOccurrencesInFA: faCount,
        totalFADreams: totalFalseAwakenings,
        faRateWithSign,
        baselineFARate,
        rateDifference,
        matchedDreamIds,
        confidence: calculateConfidence(distinctCount),
      });
    }

    faSignCorrelations.sort(
      (a, b) => Math.abs(b.rateDifference) - Math.abs(a.rateDifference) || b.signOccurrencesInFA - a.signOccurrencesInFA
    );

    // 7. Domain E: Scene Complexity (Single vs Multi-Scene Complexity)
    const dreamsWithScenes = periodDreams.filter(
      (d) =>
        typeof d.scenesCount === 'number' ||
        (Array.isArray(d.scenes) && d.scenes.length > 0)
    );

    const singleSceneDreams: DreamEntry[] = [];
    const multiSceneDreams: DreamEntry[] = [];

    for (const d of dreamsWithScenes) {
      const count = d.scenesCount ?? d.scenes?.length ?? 1;
      if (count > 1) {
        multiSceneDreams.push(d);
      } else {
        singleSceneDreams.push(d);
      }
    }

    // Vividness averages
    const singleVividList = singleSceneDreams.filter((d) => typeof d.vividness === 'number');
    const multiVividList = multiSceneDreams.filter((d) => typeof d.vividness === 'number');
    const singleSceneAvgVividness =
      singleVividList.length > 0
        ? roundTo2Decimals(
            singleVividList.reduce((acc, d) => acc + d.vividness, 0) / singleVividList.length
          )
        : null;
    const multiSceneAvgVividness =
      multiVividList.length > 0
        ? roundTo2Decimals(
            multiVividList.reduce((acc, d) => acc + d.vividness, 0) / multiVividList.length
          )
        : null;

    // Control averages (distinct from zero)
    const singleControlList = singleSceneDreams.filter(
      (d) => typeof d.dreamControl === 'number' && d.dreamControl >= 1 && d.dreamControl <= 5
    );
    const multiControlList = multiSceneDreams.filter(
      (d) => typeof d.dreamControl === 'number' && d.dreamControl >= 1 && d.dreamControl <= 5
    );

    const singleSceneAvgControl =
      singleControlList.length > 0
        ? roundTo2Decimals(
            singleControlList.reduce((acc, d) => acc + (d.dreamControl as number), 0) /
              singleControlList.length
          )
        : null;
    const multiSceneAvgControl =
      multiControlList.length > 0
        ? roundTo2Decimals(
            multiControlList.reduce((acc, d) => acc + (d.dreamControl as number), 0) /
              multiControlList.length
          )
        : null;

    const sceneComplexity: SceneComplexityCorrelation = {
      totalAnalyzedDreams: dreamsWithScenes.length,
      singleSceneCount: singleSceneDreams.length,
      multiSceneCount: multiSceneDreams.length,
      singleSceneAvgVividness,
      multiSceneAvgVividness,
      singleSceneAvgControl,
      multiSceneAvgControl,
      vividnessDifference:
        singleSceneAvgVividness !== null && multiSceneAvgVividness !== null
          ? roundTo2Decimals(multiSceneAvgVividness - singleSceneAvgVividness)
          : null,
      controlDifference:
        singleSceneAvgControl !== null && multiSceneAvgControl !== null
          ? roundTo2Decimals(multiSceneAvgControl - singleSceneAvgControl)
          : null,
      singleSceneDreamIds: singleSceneDreams.map((d) => d.id),
      multiSceneDreamIds: multiSceneDreams.map((d) => d.id),
    };

    // 8. Domain F: Recorded Induction Techniques vs. Subsequent Recall Outcomes
    const periodTechniques = allTechniques.filter((t) => {
      if (filter.timeRange === 'all') return true;
      return t.date >= startDateStr && t.date <= todayStr;
    });

    const techniqueGroupMap = new Map<
      string,
      { logs: TechniqueLog[]; recallSuccess: number; lucidSuccess: number; confidences: number[] }
    >();

    for (const log of periodTechniques) {
      const techName = (log.customTechniqueName || log.technique || 'Unknown').trim();
      if (!techniqueGroupMap.has(techName)) {
        techniqueGroupMap.set(techName, {
          logs: [],
          recallSuccess: 0,
          lucidSuccess: 0,
          confidences: [],
        });
      }
      const group = techniqueGroupMap.get(techName)!;
      group.logs.push(log);

      if (log.outcome === 'dream_recalled' || log.outcome === 'lucid_dream') {
        group.recallSuccess++;
      }
      if (log.outcome === 'lucid_dream' || log.lucidDreamAchieved) {
        group.lucidSuccess++;
      }
      if (typeof log.confidenceRating === 'number') {
        group.confidences.push(log.confidenceRating);
      }
    }

    const techniqueOutcomes: TechniqueOutcomeCorrelation[] = [];
    for (const [technique, group] of techniqueGroupMap.entries()) {
      const sampleSize = group.logs.length;
      const recallRate = sampleSize > 0 ? roundTo1Decimal((group.recallSuccess / sampleSize) * 100) : 0;
      const lucidRate = sampleSize > 0 ? roundTo1Decimal((group.lucidSuccess / sampleSize) * 100) : 0;
      const avgConfidence =
        group.confidences.length > 0
          ? roundTo2Decimals(
              group.confidences.reduce((a, b) => a + b, 0) / group.confidences.length
            )
          : null;

      techniqueOutcomes.push({
        technique,
        sampleSize,
        recallCount: group.recallSuccess,
        recallRate,
        lucidCount: group.lucidSuccess,
        lucidRate,
        avgConfidence,
        hasSufficientData: sampleSize >= 3,
      });
    }

    techniqueOutcomes.sort((a, b) => b.sampleSize - a.sampleSize || b.lucidRate - a.lucidRate);

    // Count notable findings across all domains (effect size >= 15% rate difference or >= 0.5 vividness diff with n >= 3)
    let notableFindingsCount = 0;
    notableFindingsCount += signLucidityCorrelations.filter(
      (s) => Math.abs(s.rateDifference) >= 15 && s.totalOccurrences >= 3
    ).length;
    notableFindingsCount += signVividnessCorrelations.filter(
      (s) => Math.abs(s.vividnessDifference) >= 0.5 && s.sampleSize >= 3
    ).length;
    notableFindingsCount += emotionLucidityCorrelations.filter(
      (e) => Math.abs(e.rateDifference) >= 15 && e.totalOccurrences >= 3
    ).length;
    notableFindingsCount += faSignCorrelations.filter(
      (f) => Math.abs(f.rateDifference) >= 15 && f.signOccurrencesInFA >= 2
    ).length;

    return {
      totalDreamsAnalyzed,
      totalLucidDreams,
      baselineLucidityRate,
      totalFalseAwakenings,
      baselineFARate,
      averageVividness,
      activeSignsCount: activeSigns.length,
      filter,
      signLucidityCorrelations,
      signVividnessCorrelations,
      emotionLucidityCorrelations,
      faSignCorrelations,
      sceneComplexity,
      techniqueOutcomes,
      notableFindingsCount,
    };
  },
};
