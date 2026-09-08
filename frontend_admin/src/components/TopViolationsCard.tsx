import React from 'react';
import { AlertOctagon, ArrowRight } from 'lucide-react';
import { TOP_VIOLATIONS } from '../data/mockData';
import { useLiveTopViolations } from '../api/useLiveData';

interface TopViolationsCardProps {
  onViewAnalytics?: () => void;
}

export const TopViolationsCard: React.FC<TopViolationsCardProps> = ({ onViewAnalytics }) => {
  const { data: violations } = useLiveTopViolations(TOP_VIOLATIONS);
  return (
    <div className="bg-white rounded-3xl p-6 border border-[#8EC8BA]/40 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#E37820]/10 text-[#E37820] flex items-center justify-center shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">What's going wrong?</h2>
            <p className="text-[11px] text-slate-500">Top violation types</p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3.5">
          {violations.map((violation) => (
            <div key={violation.title} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 truncate pr-2">
                  {violation.title}
                </span>
                <span className="font-bold text-slate-900 shrink-0">{violation.count}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#E5F0EC] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${violation.percentage}%`,
                    backgroundColor: violation.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Link */}
      <div className="pt-4 mt-2 border-t border-slate-100">
        <button
          onClick={onViewAnalytics}
          className="flex items-center gap-1 text-xs font-bold text-[#017374] hover:text-[#015758] transition-colors"
        >
          <span>View violation analytics</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
