import React from 'react';
import { Info, ArrowUpRight } from 'lucide-react';
import { COMPLIANCE_SEGMENTS } from '../data/mockData';
import { useLiveCompliance } from '../api/useLiveData';

export const ComplianceDonutCard: React.FC = () => {
  const { data: live, live: isLive } = useLiveCompliance({ pass: 0, fail: 0, review: 0, passRate: 0 });
  const total = live.pass + live.fail + live.review;
  const segments = isLive && total > 0
    ? [
        { name: 'Fully Compliant', count: live.pass, percentage: Math.round((live.pass / total) * 100), color: '#017374' },
        { name: 'Needs Review', count: live.review, percentage: Math.round((live.review / total) * 100), color: '#FEB519' },
        { name: 'Violations', count: live.fail, percentage: Math.max(Math.round((live.fail / total) * 100), 0), color: '#E37820' },
      ]
    : COMPLIANCE_SEGMENTS;
  // Radius = 65, Circumference = 2 * PI * 65 ≈ 408.4
  const radius = 65;
  const circumference = 2 * Math.PI * radius;
  
  let accumulatedPercent = 0;
  const strokeSegments = segments.map((seg) => {
    const strokeDasharray = `${(seg.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
    accumulatedPercent += seg.percentage;
    return {
      ...seg,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#8EC8BA]/40 shadow-xs flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5">
          <h2 className="text-base font-bold text-slate-800">Are we keeping standards in check?</h2>
          <button title="Compliance information" className="text-slate-400 hover:text-[#017374] transition-colors">
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Donut Chart and Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 my-auto">
        {/* SVG Donut Chart */}
        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background circle track */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="transparent"
              stroke="#E5F0EC"
              strokeWidth="14"
            />
            {/* Render donut slices */}
            {strokeSegments.map((seg, idx) => (
              <circle
                key={idx}
                cx="80"
                cy="80"
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth="14"
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            ))}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-3xl font-black text-slate-900 tracking-tight leading-none">{isLive ? `${live.passRate}%` : '79%'}</span>
            <span className="text-xs font-bold text-[#017374] mt-1">Compliant</span>
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 space-y-2.5 w-full">
          {segments.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-bold text-slate-800 min-w-[28px]">{item.count}</span>
                <span className="text-slate-600 font-medium">{item.name}</span>
              </div>
              <span className="text-slate-400 font-semibold text-[11px]">({item.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Subtext */}
      <div className="pt-4 border-t border-slate-100 mt-4 flex items-center gap-1 text-xs font-bold text-[#017374]">
        <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
        <span>3.1% improvement vs last period</span>
      </div>
    </div>
  );
};
