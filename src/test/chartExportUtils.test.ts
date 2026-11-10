import { describe, it, expect } from 'vitest';
import {
  generateRecallGraphDescription,
  RecallChartDataPoint,
} from '../utils/chartExportUtils';

describe('generateRecallGraphDescription', () => {
  it('handles empty chart data gracefully', () => {
    const text = generateRecallGraphDescription([], '1w');
    expect(text).toContain('ONEIRIC RECALL ACTIVITY REPORT');
    expect(text).toContain('Timeframe: 1 Week (1W)');
    expect(text).toContain('No recall data points available');
  });

  it('generates a detailed report with spikes, dips, lucid and non-lucid breakdown for a 1-week range', () => {
    const mockData: RecallChartDataPoint[] = [
      { date: '2026-11-04', label: 'Wed', fullLabel: 'Nov 4', count: 3, lucidCount: 1 },
      { date: '2026-11-05', label: 'Thu', fullLabel: 'Nov 5', count: 0, lucidCount: 0 },
      { date: '2026-11-06', label: 'Fri', fullLabel: 'Nov 6', count: 2, lucidCount: 0 },
      { date: '2026-11-07', label: 'Sat', fullLabel: 'Nov 7', count: 0, lucidCount: 0 },
      { date: '2026-11-08', label: 'Sun', fullLabel: 'Nov 8', count: 1, lucidCount: 0 },
      { date: '2026-11-09', label: 'Mon', fullLabel: 'Nov 9', count: 3, lucidCount: 0 },
      { date: '2026-11-10', label: 'Tue', fullLabel: 'Nov 10', count: 1, lucidCount: 1 },
    ];

    const result = generateRecallGraphDescription(mockData, '1w', '7-Day Recall Activity');

    // 1. Title and context
    expect(result).toContain('Title: 7-Day Recall Activity');
    expect(result).toContain('Timeframe Scope: 1 Week (7-Day Rolling Window)');
    expect(result).toContain('(2026-11-04) to');
    expect(result).toContain('(2026-11-10)');
    expect(result).toContain('Total Days Observed: 7 calendar days');

    // 2. Metrics: 3+0+2+0+1+3+1 = 10 dreams, 1+0+0+0+0+0+1 = 2 lucid, 8 non-lucid
    expect(result).toContain('Total Dreams Logged: 10');
    expect(result).toContain('Non-Lucid Dreams: 8 (80.0% of total entries)');
    expect(result).toContain('Lucid Dreams: 2 (20.0% of total entries)');
    expect(result).toContain('Active Recall Nights: 5 of 7 days (71.4% recall rate)');
    expect(result).toContain('Zero-Recall Nights (Dips/Gaps): 2 of 7 days (28.6% of period)');
    expect(result).toContain('Average Dreams per Night (All Days): 1.43 dreams/night');
    expect(result).toContain('Average Dreams on Active Nights: 2.00 dreams/active night');

    // 3. Spikes
    expect(result).toContain('Maximum Single-Night Peak: 3 dreams');
    expect(result).toContain('Peak Spike Occurrences (2 nights)');
    expect(result).toContain('2026-11-04');
    expect(result).toContain('1 lucid, 2 non-lucid');
    expect(result).toContain('2026-11-09');
    expect(result).toContain('Secondary Spikes (1 night with 2+ dreams below peak)');
    expect(result).toContain('2026-11-06');

    // 4. Dips
    expect(result).toContain('3. DIPS & INACTIVITY GAPS');
    expect(result).toContain('Longest Inactivity Gap: 1 consecutive day with 0 dreams');

    // 5. Lucid details
    expect(result).toContain('4. LUCID VS NON-LUCID BREAKDOWN');
    expect(result).toContain('Lucidity Rate: 20.0% of all dreams in this period were lucid');
    expect(result).toContain('Nights with Lucidity: 2 of 7 total days');
    expect(result).toContain('2026-11-04');
    expect(result).toContain('2026-11-10');

    // 6. Chronological Table
    expect(result).toContain('6. CHRONOLOGICAL NIGHT-BY-NIGHT DATA TABLE');
    expect(result).toContain('2026-11-04   | Wed |     3 |     1 |         2 | Peak Spike (Lucid)');
    expect(result).toContain('2026-11-05   | Thu |     0 |     0 |         0 | Zero Recall (Dip)');
    expect(result).toContain('2026-11-06   | Fri |     2 |     0 |         2 | Secondary Spike');
  });

  it('correctly reports 2 weeks, 3 weeks, 1 month, and all time ranges', () => {
    const twoWeekData: RecallChartDataPoint[] = Array.from({ length: 14 }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      label: `${i + 1}`,
      fullLabel: `${i + 1} Oct`,
      count: i % 3 === 0 ? 2 : 0,
      lucidCount: i === 0 ? 1 : 0,
    }));

    const text2w = generateRecallGraphDescription(twoWeekData, '2w');
    expect(text2w).toContain('Timeframe Scope: 2 Weeks (14-Day Rolling Window)');

    const text3w = generateRecallGraphDescription(twoWeekData, '3w');
    expect(text3w).toContain('Timeframe Scope: 3 Weeks (21-Day Rolling Window)');

    const text1m = generateRecallGraphDescription(twoWeekData, '1m');
    expect(text1m).toContain('Timeframe Scope: 1 Month (30-Day Rolling Window)');

    const textAll = generateRecallGraphDescription(twoWeekData, 'all');
    expect(textAll).toContain('Timeframe Scope: All Time (Complete Journal History (All Time))');
  });

  it('identifies extended multi-day dormant gaps when present', () => {
    const dataWithGap: RecallChartDataPoint[] = [
      { date: '2026-08-01', label: '01/08', fullLabel: 'Aug 1', count: 1, lucidCount: 0 },
      { date: '2026-08-02', label: '02/08', fullLabel: 'Aug 2', count: 0, lucidCount: 0 },
      { date: '2026-08-03', label: '03/08', fullLabel: 'Aug 3', count: 0, lucidCount: 0 },
      { date: '2026-08-04', label: '04/08', fullLabel: 'Aug 4', count: 0, lucidCount: 0 },
      { date: '2026-08-05', label: '05/08', fullLabel: 'Aug 5', count: 0, lucidCount: 0 },
      { date: '2026-08-06', label: '06/08', fullLabel: 'Aug 6', count: 3, lucidCount: 1 },
    ];

    const result = generateRecallGraphDescription(dataWithGap, 'all');
    expect(result).toContain('Longest Inactivity Gap: 4 consecutive days with 0 dreams (from 2026-08-02 to 2026-08-05)');
    expect(result).toContain('Notable Dormant Gaps (>= 3 consecutive days with 0 dreams, 1 total)');
    expect(result).toContain('2026-08-02 to 2026-08-05: 4 consecutive days without recorded dreams');
  });
});
