import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Calendar } from 'lucide-react';
import { TREND_DATA } from '../data/mockData';
import { useLiveTrend } from '../api/useLiveData';

export const InspectionTrendCard: React.FC = () => {
  const { data: trend, live: isLive } = useLiveTrend(
    TREND_DATA.map((t) => ({ month: t.month, completed: t.completed, flagged: t.flagged })),
  );
  return (
    <div className="bg-white rounded-3xl p-6 border border-[#8EC8BA]/40 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-800">Inspection Trend</h2>
          <span className="flex items-center gap-1.5 text-xs text-[#017374] bg-[#E5F0EC] px-2.5 py-1 rounded-md font-semibold">
            <Calendar className="w-3.5 h-3.5 text-[#017374]" />
            Apr - Sep 2026
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#017374]" />
            <span className="text-slate-700">Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E37820]" />
            <span className="text-slate-700">Flagged</span>
          </div>
        </div>
      </div>

      {/* Recharts Line Chart */}
      <div className="w-full h-48 sm:h-52 pt-2">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={isLive ? trend : TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5F0EC" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              dy={8}
            />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              dx={-4}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #8EC8BA',
                boxShadow: '0 4px 6px -1px rgba(1, 115, 116, 0.08)',
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              name="Completed"
              stroke="#017374"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#017374', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 5, fill: '#017374' }}
            />
            <Line
              type="monotone"
              dataKey="flagged"
              name="Flagged"
              stroke="#E37820"
              strokeWidth={2.5}
              dot={{ r: 3.5, fill: '#E37820', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 5, fill: '#E37820' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
