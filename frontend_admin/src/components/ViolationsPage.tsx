import React, { useState, useEffect } from 'react';
import { AlertTriangle, AlertOctagon, Scale, ShieldAlert, Search, ArrowUpDown, Filter, Loader2 } from 'lucide-react';
import { api } from '../api/client';

export interface ViolationRow {
  rule_reference: string;
  title: string;
  occurrences: number;
}

export const ViolationsPage: React.FC = () => {
  const [violations, setViolations] = useState<ViolationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  useEffect(() => {
    setLoading(true);
    api<ViolationRow[]>('/dashboard/violations')
      .then((data) => {
        setViolations(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setViolations([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalViolations = violations.reduce((acc, v) => acc + (v.occurrences || 0), 0);
  const uniqueRules = new Set(violations.map((v) => v.rule_reference)).size;

  const filtered = violations
    .filter(
      (v) =>
        v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.rule_reference.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) =>
      sortOrder === 'desc' ? b.occurrences - a.occurrences : a.occurrences - b.occurrences
    );

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#E37820] tracking-wider uppercase mb-1">
            ENFORCEMENT INTELLIGENCE
          </div>
          <h1 className="text-3xl font-black text-[#12312b] tracking-tight leading-tight">
            Statutory Violations Registry
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Aggregated legal non-compliances under The Legal Metrology (Packaged Commodities) Rules, 2011
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-[#E37820]/10 text-[#E37820] flex items-center justify-center mb-3">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800">{loading ? '—' : totalViolations}</div>
          <div className="text-xs text-slate-500 font-medium">Total Violations Flagged</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center mb-3">
            <Scale className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800">{loading ? '—' : uniqueRules}</div>
          <div className="text-xs text-slate-500 font-medium">Distinct Legal Clauses Breached</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs">
          <div className="w-8 h-8 rounded-xl bg-[#FEB519]/20 text-[#9a6206] flex items-center justify-center mb-3">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-slate-800">Rule 6 & Rule 7</div>
          <div className="text-xs text-slate-500 font-medium">Primary Statutory Focus Areas</div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-2xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search violation title or rule citation..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/20"
          />
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <span>Occurrences: {sortOrder === 'desc' ? 'High to Low' : 'Low to High'}</span>
        </button>
      </div>

      {/* Violations Table */}
      <div className="bg-white rounded-3xl border border-[#8EC8BA]/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#017374] animate-spin mx-auto" />
            <div className="text-xs text-slate-500 font-medium">Aggregating live violations data...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No violations match your search</div>
            <p className="text-xs text-slate-400">Try searching for other Legal Metrology rule clauses.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-[#E5F0EC]/40 border-b border-slate-200/80">
              <tr>
                <th className="px-6 py-3.5 font-bold text-slate-700">Statutory Rule Reference</th>
                <th className="px-6 py-3.5 font-bold text-slate-700">Violation Title & Legal Scope</th>
                <th className="px-6 py-3.5 font-bold text-slate-700 text-right">Occurrences</th>
                <th className="px-6 py-3.5 font-bold text-slate-700 text-right">Enforcement Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((v, i) => {
                const pct = totalViolations > 0 ? Math.round((v.occurrences / totalViolations) * 100) : 0;
                return (
                  <tr key={i} className="hover:bg-[#E5F0EC]/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-[#017374]">{v.rule_reference}</td>
                    <td className="px-6 py-4 text-slate-800 font-semibold">{v.title}</td>
                    <td className="px-6 py-4 text-right font-black text-slate-900">{v.occurrences}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#E37820]/15 text-[#E37820]">
                        {pct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
