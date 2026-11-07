import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { preferencesService, PREFERENCES_CHANGED_EVENT } from '../../services/preferencesService';
import { UserPreferences } from '../../types/preferences';

interface RecallChartDataPoint {
  date: string;
  label: string;
  fullLabel: string;
  count: number;
  lucidCount: number;
}

interface RecallChartProps {
  data: RecallChartDataPoint[];
  totalColor?: string;
  lucidColor?: string;
}

export const RecallChart: React.FC<RecallChartProps> = ({
  data,
  totalColor: propTotalColor,
  lucidColor: propLucidColor,
}) => {
  const [prefs, setPrefs] = useState<UserPreferences>(() => preferencesService.getPreferences());

  useEffect(() => {
    const handlePrefsChange = (e: Event) => {
      const custom = e as CustomEvent<UserPreferences>;
      if (custom.detail) {
        setPrefs(custom.detail);
      }
    };
    window.addEventListener(PREFERENCES_CHANGED_EVENT, handlePrefsChange);
    return () => window.removeEventListener(PREFERENCES_CHANGED_EVENT, handlePrefsChange);
  }, []);

  const effectiveTotalColor = propTotalColor || prefs.chartTotalColor || '#3b82f6';
  const effectiveLucidColor = propLucidColor || prefs.chartLucidColor || '#06b6d4';

  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count), 3) : 3;
  const isReduced =
    typeof window !== 'undefined' &&
    (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ||
      document.documentElement.classList.contains('reduce-motion'));

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={effectiveTotalColor} stopOpacity={0.4} />
              <stop offset="95%" stopColor={effectiveTotalColor} stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorLucid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={effectiveLucidColor} stopOpacity={0.6} />
              <stop offset="95%" stopColor={effectiveLucidColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255, 255, 255, 0.05)"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.1)' }}
            minTickGap={20}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            domain={[0, maxCount]}
            allowDecimals={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const item = payload[0].payload as RecallChartDataPoint;
                return (
                  <div className="p-3 bg-[#0b132b] border border-slate-700/80 rounded-lg shadow-lg text-xs space-y-1">
                    <p className="font-semibold text-slate-200">
                      {item.label} ({item.fullLabel})
                    </p>
                    <div className="flex items-center gap-2" style={{ color: effectiveTotalColor }}>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: effectiveTotalColor }}
                      />
                      <span>
                        Total Recalled: <strong className="text-white">{item.count}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2" style={{ color: effectiveLucidColor }}>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: effectiveLucidColor }}
                      />
                      <span>
                        Lucid Dreams: <strong className="text-white">{item.lucidCount}</strong>
                      </span>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={effectiveTotalColor}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorTotal)"
            name="Total Dreams"
            isAnimationActive={!isReduced}
            animationDuration={600}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="lucidCount"
            stroke={effectiveLucidColor}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorLucid)"
            name="Lucid Dreams"
            isAnimationActive={!isReduced}
            animationDuration={600}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
