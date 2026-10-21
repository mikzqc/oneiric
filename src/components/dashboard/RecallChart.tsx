import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface RecallChartDataPoint {
  date: string;
  label: string;
  fullLabel: string;
  count: number;
  lucidCount: number;
}

interface RecallChartProps {
  data: RecallChartDataPoint[];
}

export const RecallChart: React.FC<RecallChartProps> = ({ data }) => {
  const maxCount = data.length > 0 ? Math.max(...data.map((d) => d.count), 3) : 3;

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="colorLucid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
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
                    <div className="flex items-center gap-2 text-blue-300">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>Total Recalled: <strong className="text-white">{item.count}</strong></span>
                    </div>
                    <div className="flex items-center gap-2 text-cyan-300">
                      <span className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span>Lucid Dreams: <strong className="text-white">{item.lucidCount}</strong></span>
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
            stroke="#3b82f6"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorTotal)"
            name="Total Dreams"
          />
          <Area
            type="monotone"
            dataKey="lucidCount"
            stroke="#06b6d4"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorLucid)"
            name="Lucid Dreams"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
