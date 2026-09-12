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
import { Calendar, TrendingUp } from 'lucide-react';
import { useLiveTrend } from '../api/useLiveData';

export const InspectionTrendCard: React.FC = () => {
  const { data: trend, live: isLive } = useLiveTrend([]);

  const currentYear = new Date().getFullYear();

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#8EC8BA]/40 shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-slate-800">Inspection Trend</h2>
          <span className="flex items-center gap-1.5 text-xs text-[#017374] bg-[#E5F0EC] px-2.5 py-1 rounded-md font-semibold">
            <Calendar className="w-3.5 h-3.5 text-[#017374]" />
            Rolling 30 Days ({currentYear})
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
          {isLive && (
            <span className="text-[10px] font-bold text-[#017374] bg-[#E5F0EC] px-2 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>
      </div>

      {/* Recharts Line Chart or Empty State */}
      <div className="w-full h-48 sm:h-52 pt-2">
        {trend.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-2 bg-[#f8faf9] rounded-2xl border border-dashed border-slate-200">
            <TrendingUp className="w-7 h-7 text-slate-300" />
            <div className="text-xs font-semibold text-slate-600">No trend history recorded yet</div>
            <p className="text-[11px] text-slate-400 max-w-xs">
              Daily inspection volumes and violation trends will be plotted automatically as field officers submit inspections.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5F0EC" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#64748b', fontSize: 11 }}
                dy={8}
              />
              <YAxis
                allowDecimals={false}
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
        )}
      </div>
    </div>
  );
};
