import { RecallRange } from '../services/dreamService';
import { formatDate, parseLocalDate } from './dateUtils';

export interface RecallChartDataPoint {
  date: string;
  label: string;
  fullLabel: string;
  count: number;
  lucidCount: number;
}

export const RECALL_RANGE_LABELS: Record<RecallRange, string> = {
  '1w': '1 Week',
  '2w': '2 Weeks',
  '3w': '3 Weeks',
  '1m': '1 Month',
  'all': 'All Time',
};

export const RECALL_RANGE_DESCRIPTIONS: Record<RecallRange, string> = {
  '1w': '7-Day Rolling Window',
  '2w': '14-Day Rolling Window',
  '3w': '21-Day Rolling Window',
  '1m': '30-Day Rolling Window',
  'all': 'Complete Journal History (All Time)',
};

interface DormantGap {
  startDate: string;
  endDate: string;
  length: number;
}

/**
 * Generates an exhaustive, high-fidelity text description of the Recall Activity Graph.
 * Captures all spikes, dips, lucid/non-lucid breakdowns, timeframe details,
 * statistical metrics, and an aligned night-by-night chronological data table.
 */
export function generateRecallGraphDescription(
  data: RecallChartDataPoint[],
  range: RecallRange,
  customTitle?: string
): string {
  if (!data || data.length === 0) {
    return [
      '============================================================',
      'ONEIRIC RECALL ACTIVITY REPORT',
      '============================================================',
      `Timeframe: ${RECALL_RANGE_LABELS[range]} (${range.toUpperCase()})`,
      'Status: No recall data points available for this period.',
    ].join('\n');
  }

  const totalDays = data.length;
  const startDate = data[0].date;
  const endDate = data[data.length - 1].date;

  const totalDreams = data.reduce((acc, d) => acc + d.count, 0);
  const totalLucid = data.reduce((acc, d) => acc + d.lucidCount, 0);
  const totalNonLucid = totalDreams - totalLucid;

  const activeDays = data.filter((d) => d.count > 0);
  const zeroDays = data.filter((d) => d.count === 0);

  const activeDaysCount = activeDays.length;
  const zeroDaysCount = zeroDays.length;

  const consistencyRate = ((activeDaysCount / totalDays) * 100).toFixed(1);
  const dormantRate = ((zeroDaysCount / totalDays) * 100).toFixed(1);

  const lucidPct = totalDreams > 0 ? ((totalLucid / totalDreams) * 100).toFixed(1) : '0.0';
  const nonLucidPct = totalDreams > 0 ? ((totalNonLucid / totalDreams) * 100).toFixed(1) : '0.0';

  const nightlyAverage = (totalDreams / totalDays).toFixed(2);
  const activeNightAverage = activeDaysCount > 0 ? (totalDreams / activeDaysCount).toFixed(2) : '0.00';

  const maxSpike = Math.max(...data.map((d) => d.count), 0);
  const peakNights = data.filter((d) => d.count === maxSpike && maxSpike > 0);
  const secondarySpikes = data.filter((d) => d.count < maxSpike && d.count >= 2);
  const singleDreamNights = data.filter((d) => d.count === 1);

  // Compute dormant dry spells (consecutive zero-recall gaps)
  const dormantGaps: DormantGap[] = [];
  let currentGapStart: string | null = null;
  let currentGapLen = 0;

  for (let i = 0; i < data.length; i++) {
    const d = data[i];
    if (d.count === 0) {
      if (currentGapStart === null) {
        currentGapStart = d.date;
      }
      currentGapLen++;
    } else {
      if (currentGapStart !== null) {
        dormantGaps.push({
          startDate: currentGapStart,
          endDate: data[i - 1].date,
          length: currentGapLen,
        });
        currentGapStart = null;
        currentGapLen = 0;
      }
    }
  }

  if (currentGapStart !== null) {
    dormantGaps.push({
      startDate: currentGapStart,
      endDate: data[data.length - 1].date,
      length: currentGapLen,
    });
  }

  const sortedGaps = [...dormantGaps].sort((a, b) => b.length - a.length);
  const longestGap = sortedGaps.length > 0 ? sortedGaps[0] : null;
  const multiDayGaps = dormantGaps.filter((g) => g.length >= 3);

  // Identify sudden dips: drop from an active or peak night to zero dreams
  const suddenDips: { date: string; prevCount: number; nextCount: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1].count >= 2 && data[i].count === 0) {
      const nextCount = i + 1 < data.length ? data[i + 1].count : -1;
      suddenDips.push({
        date: data[i].date,
        prevCount: data[i - 1].count,
        nextCount,
      });
    }
  }

  // Lucid nights breakdown
  const lucidNights = data.filter((d) => d.lucidCount > 0);

  // Trajectory analysis (First Half vs Second Half)
  const midPoint = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, midPoint);
  const secondHalf = data.slice(midPoint);

  const firstHalfTotal = firstHalf.reduce((sum, d) => sum + d.count, 0);
  const secondHalfTotal = secondHalf.reduce((sum, d) => sum + d.count, 0);
  const firstHalfAvg = firstHalf.length > 0 ? (firstHalfTotal / firstHalf.length).toFixed(2) : '0.00';
  const secondHalfAvg = secondHalf.length > 0 ? (secondHalfTotal / secondHalf.length).toFixed(2) : '0.00';

  let trajectoryText = '';
  if (firstHalfTotal === 0 && secondHalfTotal === 0) {
    trajectoryText = 'DORMANT: No recall activity recorded across either half of this period.';
  } else if (firstHalfTotal === 0 && secondHalfTotal > 0) {
    trajectoryText = `EMERGENT MOMENTUM: Journaling initiated in the second half of this period (${secondHalfTotal} dreams recorded vs 0 in the first half).`;
  } else if (secondHalfTotal === 0 && firstHalfTotal > 0) {
    trajectoryText = `DORMANT DIP: Journaling paused in the second half (${firstHalfTotal} dreams in first half vs 0 in second half).`;
  } else {
    const diffPct = Math.round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100);
    if (diffPct >= 15) {
      trajectoryText = `UPWARD MOMENTUM: Recall increased by +${diffPct}% in the second half (${firstHalfTotal} dreams -> ${secondHalfTotal} dreams), indicating strengthened dream retention.`;
    } else if (diffPct <= -15) {
      trajectoryText = `DOWNWARD TREND: Recall decreased by ${diffPct}% in the second half (${firstHalfTotal} dreams -> ${secondHalfTotal} dreams).`;
    } else {
      trajectoryText = `BALANCED CONSISTENCY: Recall remained steady across both halves (${firstHalfTotal} dreams in first half vs ${secondHalfTotal} in second half).`;
    }
  }

  // Trailing 7-day velocity (most recent week in the dataset)
  const trailingDays = data.slice(-Math.min(7, data.length));
  const trailingTotal = trailingDays.reduce((sum, d) => sum + d.count, 0);
  const trailingLucid = trailingDays.reduce((sum, d) => sum + d.lucidCount, 0);

  const chartTitle = customTitle || `${RECALL_RANGE_LABELS[range]} Recall Activity`;

  // Build the text blocks
  const lines: string[] = [];

  lines.push('============================================================');
  lines.push('ONEIRIC DREAM RECALL ACTIVITY REPORT');
  lines.push('============================================================');
  lines.push(`Title: ${chartTitle}`);
  lines.push(`Timeframe Scope: ${RECALL_RANGE_LABELS[range]} (${RECALL_RANGE_DESCRIPTIONS[range]})`);
  lines.push(`Date Span: ${formatDate(startDate)} (${startDate}) to ${formatDate(endDate)} (${endDate})`);
  lines.push(`Total Days Observed: ${totalDays} calendar days`);
  lines.push(`Metric Measured: Total dream entries and lucid dreams per night`);
  lines.push('');

  // Section 1: Executive Summary
  lines.push('------------------------------------------------------------');
  lines.push('1. EXECUTIVE SUMMARY & RECALL METRICS');
  lines.push('------------------------------------------------------------');
  lines.push(`• Total Dreams Logged: ${totalDreams}`);
  lines.push(`• Non-Lucid Dreams: ${totalNonLucid} (${nonLucidPct}% of total entries)`);
  lines.push(`• Lucid Dreams: ${totalLucid} (${lucidPct}% of total entries)`);
  lines.push(`• Active Recall Nights: ${activeDaysCount} of ${totalDays} days (${consistencyRate}% recall rate)`);
  lines.push(`• Zero-Recall Nights (Dips/Gaps): ${zeroDaysCount} of ${totalDays} days (${dormantRate}% of period)`);
  lines.push(`• Average Dreams per Night (All Days): ${nightlyAverage} dreams/night`);
  lines.push(`• Average Dreams on Active Nights: ${activeNightAverage} dreams/active night`);
  lines.push('');

  // Section 2: Spikes & High-Recall Peaks
  lines.push('------------------------------------------------------------');
  lines.push('2. RECALL SPIKES & PEAK NIGHTS');
  lines.push('------------------------------------------------------------');
  if (maxSpike === 0) {
    lines.push('• No recall spikes recorded during this timeframe (all nights had 0 dreams).');
  } else {
    lines.push(`• Maximum Single-Night Peak: ${maxSpike} dream${maxSpike > 1 ? 's' : ''}`);
    lines.push(`• Peak Spike Occurrences (${peakNights.length} night${peakNights.length > 1 ? 's' : ''}):`);
    for (const p of peakNights) {
      const weekday = parseLocalDate(p.date).toLocaleDateString('en-US', { weekday: 'short' });
      const lucidNote = p.lucidCount > 0 ? ` (${p.lucidCount} lucid, ${p.count - p.lucidCount} non-lucid) [LUCID PEAK]` : ` (${p.count} non-lucid)`;
      lines.push(`  - ${p.date} (${weekday}, ${formatDate(p.date)}): ${p.count} dreams${lucidNote}`);
    }

    if (secondarySpikes.length > 0) {
      lines.push(`• Secondary Spikes (${secondarySpikes.length} night${secondarySpikes.length > 1 ? 's' : ''} with 2+ dreams below peak):`);
      for (const s of secondarySpikes) {
        const weekday = parseLocalDate(s.date).toLocaleDateString('en-US', { weekday: 'short' });
        const lucidNote = s.lucidCount > 0 ? ` (${s.lucidCount} lucid, ${s.count - s.lucidCount} non-lucid)` : ` (${s.count} non-lucid)`;
        lines.push(`  - ${s.date} (${weekday}, ${formatDate(s.date)}): ${s.count} dreams${lucidNote}`);
      }
    }

    lines.push(`• Single-Dream Baseline Nights: ${singleDreamNights.length} night${singleDreamNights.length !== 1 ? 's' : ''} with exactly 1 dream.`);
  }
  lines.push('');

  // Section 3: Dips & Zero-Recall Periods
  lines.push('------------------------------------------------------------');
  lines.push('3. DIPS & INACTIVITY GAPS');
  lines.push('------------------------------------------------------------');
  if (zeroDaysCount === 0) {
    lines.push('• Flawless Consistency: Zero dips or dormant nights! A dream was recorded every single night.');
  } else {
    if (longestGap) {
      lines.push(`• Longest Inactivity Gap: ${longestGap.length} consecutive day${longestGap.length > 1 ? 's' : ''} with 0 dreams (from ${longestGap.startDate} to ${longestGap.endDate}).`);
    }

    if (multiDayGaps.length > 0) {
      lines.push(`• Notable Dormant Gaps (>= 3 consecutive days with 0 dreams, ${multiDayGaps.length} total):`);
      for (const gap of multiDayGaps) {
        lines.push(`  - ${gap.startDate} to ${gap.endDate}: ${gap.length} consecutive days without recorded dreams`);
      }
    } else {
      lines.push('• No extended multi-day gaps (>= 3 days) observed; dips were isolated single or two-day pauses.');
    }

    if (suddenDips.length > 0) {
      lines.push(`• Sharp Dips from High Recall (${suddenDips.length} instance${suddenDips.length > 1 ? 's' : ''} where recall dropped from 2+ dreams straight to 0):`);
      for (const dip of suddenDips.slice(0, 5)) {
        lines.push(`  - ${dip.date}: dropped from ${dip.prevCount} dreams on previous night to 0 dreams`);
      }
      if (suddenDips.length > 5) {
        lines.push(`  - ... and ${suddenDips.length - 5} more sharp single-day transitions.`);
      }
    }
  }
  lines.push('');

  // Section 4: Lucid vs Non-Lucid Deep Dive
  lines.push('------------------------------------------------------------');
  lines.push('4. LUCID VS NON-LUCID BREAKDOWN');
  lines.push('------------------------------------------------------------');
  lines.push(`• Total Lucid Dreams: ${totalLucid}`);
  lines.push(`• Total Non-Lucid Dreams: ${totalNonLucid}`);
  lines.push(`• Lucidity Rate: ${lucidPct}% of all dreams in this period were lucid.`);
  lines.push(`• Nights with Lucidity: ${lucidNights.length} of ${totalDays} total days (${((lucidNights.length / totalDays) * 100).toFixed(1)}% of nights).`);

  if (lucidNights.length > 0) {
    lines.push('• Detailed Lucid Occurrences:');
    for (const l of lucidNights) {
      const weekday = parseLocalDate(l.date).toLocaleDateString('en-US', { weekday: 'short' });
      lines.push(`  - ${l.date} (${weekday}, ${formatDate(l.date)}): ${l.lucidCount} lucid dream${l.lucidCount > 1 ? 's' : ''} (out of ${l.count} total dreams logged that night)`);
    }
  } else {
    lines.push('• No lucid dreams were logged during this specific timeframe.');
  }
  lines.push('');

  // Section 5: Trajectory & Momentum
  lines.push('------------------------------------------------------------');
  lines.push('5. TRAJECTORY & MOMENTUM');
  lines.push('------------------------------------------------------------');
  lines.push(`• Period Split:`);
  lines.push(`  - First Half (${firstHalf.length} days, ${firstHalf[0]?.date} to ${firstHalf[firstHalf.length - 1]?.date}): ${firstHalfTotal} dreams (${firstHalfAvg} dreams/day)`);
  lines.push(`  - Second Half (${secondHalf.length} days, ${secondHalf[0]?.date} to ${secondHalf[secondHalf.length - 1]?.date}): ${secondHalfTotal} dreams (${secondHalfAvg} dreams/day)`);
  lines.push(`• Trend Assessment: ${trajectoryText}`);
  lines.push(`• Trailing 7-Day Velocity: ${trailingTotal} dream${trailingTotal !== 1 ? 's' : ''} (${trailingLucid} lucid) logged over the most recent 7 days.`);
  lines.push('');

  // Section 6: Chronological Data Table
  lines.push('------------------------------------------------------------');
  lines.push('6. CHRONOLOGICAL NIGHT-BY-NIGHT DATA TABLE');
  lines.push('------------------------------------------------------------');
  lines.push('Date         | Day | Total | Lucid | Non-Lucid | Status');
  lines.push('-------------+-----+-------+-------+-----------+--------------------');

  for (const d of data) {
    const weekday = parseLocalDate(d.date).toLocaleDateString('en-US', { weekday: 'short' });
    const nonLucid = d.count - d.lucidCount;

    let status = 'Zero Recall (Dip)';
    if (d.count === maxSpike && maxSpike > 0) {
      status = d.lucidCount > 0 ? 'Peak Spike (Lucid)' : 'Peak Spike';
    } else if (d.count >= 2) {
      status = d.lucidCount > 0 ? 'Spike (Lucid)' : 'Secondary Spike';
    } else if (d.count === 1) {
      status = d.lucidCount > 0 ? 'Active (Lucid)' : 'Active';
    }

    const dateCol = d.date.padEnd(13);
    const dayCol = weekday.padEnd(4);
    const totalCol = String(d.count).padStart(5);
    const lucidCol = String(d.lucidCount).padStart(5);
    const nonLucidCol = String(nonLucid).padStart(9);

    lines.push(`${dateCol}| ${dayCol}| ${totalCol} | ${lucidCol} | ${nonLucidCol} | ${status}`);
  }

  lines.push('============================================================');
  lines.push('END OF REPORT - ONEIRIC NOCTURNAL JOURNAL');
  lines.push('============================================================');

  return lines.join('\n');
}
