import React from 'react';
import { Building2, ArrowRight } from 'lucide-react';
import { HIGH_RISK_COMPANIES } from '../data/mockData';

interface HighRiskCompaniesCardProps {
  onViewAll?: () => void;
}

export const HighRiskCompaniesCard: React.FC<HighRiskCompaniesCardProps> = ({ onViewAll }) => {
  return (
    <div className="bg-white rounded-3xl p-6 border border-[#8EC8BA]/40 shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-[#017374]/10 text-[#017374] flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">Who's raising red flags?</h2>
            <p className="text-[11px] text-slate-500">High-risk companies</p>
          </div>
        </div>

        {/* Table */}
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
              {HIGH_RISK_COMPANIES.map((company) => (
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
