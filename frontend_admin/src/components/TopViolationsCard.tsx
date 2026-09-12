import React from 'react';
import { AlertOctagon, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useLiveTopViolations } from '../api/useLiveData';

interface TopViolationsCardProps {
  onViewAnalytics?: () => void;
}

export const TopViolationsCard: React.FC<TopViolationsCardProps> = ({ onViewAnalytics }) => {
  const { data: violations, live } = useLiveTopViolations([]);
  return (
    <div className="bg-white rounded-3xl p-6 border border-[#8EC8BA]/40 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E37820]/10 text-[#E37820] flex items-center justify-center shrink-0">
              <AlertOctagon className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">What's going wrong?</h2>
              <p className="text-[11px] text-slate-500">Top violation types from Legal Metrology rules</p>
            </div>
          </div>
          {live && (
            <span className="text-[10px] font-bold text-[#017374] bg-[#E5F0EC] px-2 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>

        {/* Progress Bars or Empty State */}
        {violations.length === 0 ? (
          <div className="py-8 text-center space-y-2 bg-[#f8faf9] rounded-2xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-7 h-7 text-[#017374] mx-auto opacity-70" />
            <div className="text-xs font-semibold text-slate-700">No active violations detected</div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto px-2">
              All inspected products meet mandatory Legal Metrology declaration standards.
            </p>
          </div>
        ) : (
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
        )}
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
