import React from 'react';
import { Building2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useLiveHighRisk } from '../api/useLiveData';

interface HighRiskCompaniesCardProps {
  onViewAll?: () => void;
}

export const HighRiskCompaniesCard: React.FC<HighRiskCompaniesCardProps> = ({ onViewAll }) => {
  const { data: companies, live } = useLiveHighRisk([]);
  return (
    <div className="bg-white rounded-3xl p-6 border border-[#8EC8BA]/40 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#017374]/10 text-[#017374] flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">Who's raising red flags?</h2>
              <p className="text-[11px] text-slate-500">Repeat offenders & high-risk manufacturers</p>
            </div>
          </div>
          {live && (
            <span className="text-[10px] font-bold text-[#017374] bg-[#E5F0EC] px-2 py-0.5 rounded-full">
              Live
            </span>
          )}
        </div>

        {/* Table or Empty State */}
        {companies.length === 0 ? (
          <div className="py-8 text-center space-y-2 bg-[#f8faf9] rounded-2xl border border-dashed border-slate-200">
            <ShieldCheck className="w-7 h-7 text-[#017374] mx-auto opacity-70" />
            <div className="text-xs font-semibold text-slate-700">No repeat offenders flagged</div>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto px-2">
              Entity risk ratings update automatically as multiple non-compliant inspections occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-semibold text-slate-400 border-b border-slate-100 pb-2">
                  <th className="pb-2 font-semibold">#</th>
                  <th className="pb-2 font-semibold">Company</th>
                  <th className="pb-2 font-semibold text-center">Compliance</th>
                  <th className="pb-2 font-semibold text-center">Violations</th>
                  <th className="pb-2 font-semibold text-right">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {companies.map((company) => (
                  <tr key={company.rank} className="hover:bg-[#E5F0EC]/40 transition-colors">
                    <td className="py-2.5 text-slate-400 font-medium">{company.rank}</td>
                    <td className="py-2.5 text-slate-800 font-bold truncate max-w-[120px]">
                      {company.name}
                    </td>
                    <td className="py-2.5 text-slate-700 font-bold text-center">
                      {company.compliance}%
                    </td>
                    <td className="py-2.5 text-slate-500 text-center">{company.violations}</td>
                    <td className="py-2.5 text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          company.risk === 'High'
                            ? 'bg-[#E37820]/15 text-[#E37820] border border-[#E37820]/30'
                            : 'bg-[#FEB519]/25 text-[#9a6206] border border-[#FEB519]/40'
                        }`}
                      >
                        {company.risk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-4 mt-2 border-t border-slate-100">
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs font-bold text-[#017374] hover:text-[#015758] transition-colors"
        >
          <span>View all companies</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
