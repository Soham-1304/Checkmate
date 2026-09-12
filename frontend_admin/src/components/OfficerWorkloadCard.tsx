import React from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { useLiveOfficerWorkload } from '../api/useLiveData';

interface OfficerWorkloadCardProps {
  onManageOfficers?: () => void;
}

export const OfficerWorkloadCard: React.FC<OfficerWorkloadCardProps> = ({ onManageOfficers }) => {
  const { data: officers, live } = useLiveOfficerWorkload([]);
  return (
    <div className="bg-white rounded-3xl p-6 border border-[#8EC8BA]/40 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#017374]/10 text-[#017374] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">How's the team doing?</h2>
              <p className="text-[11px] text-slate-500">Officer inspection workload</p>
            </div>
          </div>
          {live && (
            <span className="text-[10px] font-bold text-[#017374] bg-[#E5F0EC] px-2 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>

        {/* Officers List or Empty State */}
        {officers.length === 0 ? (
          <div className="py-8 text-center space-y-2 bg-[#f8faf9] rounded-2xl border border-dashed border-slate-200">
            <Users className="w-7 h-7 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold text-slate-600">No officer workload tracked yet</div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto px-2">
              Assigned and completed tasks will be charted in real-time as officers conduct field inspections.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {officers.map((officer) => (
              <div key={officer.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#017374] text-[#E5F0EC] text-[11px] font-bold flex items-center justify-center">
                      {officer.initials}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 leading-tight">{officer.name}</div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {officer.active} active • {officer.pending} pending
                      </div>
                    </div>
                  </div>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#E5F0EC] overflow-hidden ml-9">
                  <div
                    className="h-full rounded-full bg-[#017374] transition-all duration-500"
                    style={{ width: `${officer.progressPercent}%` }}
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
          onClick={onManageOfficers}
          className="flex items-center gap-1 text-xs font-bold text-[#017374] hover:text-[#015758] transition-colors"
        >
          <span>Manage officers</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
