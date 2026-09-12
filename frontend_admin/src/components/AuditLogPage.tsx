import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Search, Filter, Loader2, Calendar, User } from 'lucide-react';
import { api } from '../api/client';

interface AuditItem {
  id: string;
  created_at: string;
  user_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  changes?: Record<string, any> | null;
}

export const AuditLogPage: React.FC = () => {
  const [events, setEvents] = useState<AuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  useEffect(() => {
    setLoading(true);
    api<any>('/audit-events?limit=100')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.items ?? [];
        setEvents(list);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = events.filter((e) => {
    const s = search.toLowerCase();
    const matchesSearch =
      !s ||
      e.action.toLowerCase().includes(s) ||
      e.entity_type.toLowerCase().includes(s) ||
      (e.entity_id || '').toLowerCase().includes(s) ||
      (e.user_id || '').toLowerCase().includes(s);

    const matchesAction = actionFilter === 'ALL' || e.action.toUpperCase() === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#017374] tracking-wider uppercase mb-1">
            IMMUTABLE AUDIT LOG
          </div>
          <h1 className="text-3xl font-black text-[#12312b] tracking-tight leading-tight">
            Compliance & Enforcement Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tamper-proof record of all inspections, evaluations, reviews, master data updates and user actions
          </p>
        </div>
      </div>

      {/* Search & Action filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, entity type or user ID..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Action:</span>
          {['ALL', 'CREATE', 'UPDATE', 'REVIEW'].map((act) => (
            <button
              key={act}
              onClick={() => setActionFilter(act)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                actionFilter === act
                  ? 'bg-[#017374] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {act === 'ALL' ? 'All' : act}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-3xl border border-[#8EC8BA]/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#017374] animate-spin mx-auto" />
            <div className="text-xs text-slate-500 font-medium">Verifying immutable audit ledger...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No audit events match criteria</div>
            <p className="text-xs text-slate-400">All administrative operations and inspections are logged automatically.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E5F0EC]/40 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Timestamp</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Action</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Target Entity</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Entity ID</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Actor</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((evt) => {
                  const isReview = evt.action.includes('REVIEW');
                  const isCreate = evt.action.includes('CREATE');
                  return (
                    <tr key={evt.id} className="hover:bg-[#E5F0EC]/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">
                        {evt.created_at ? new Date(evt.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            isReview
                              ? 'bg-amber-100 text-amber-800'
                              : isCreate
                              ? 'bg-emerald-100 text-[#017374]'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {evt.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">{evt.entity_type}</td>
                      <td className="px-6 py-4 font-mono text-slate-400 text-[11px]">
                        {evt.entity_id ? evt.entity_id.slice(0, 8).toUpperCase() : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {evt.user_id ? evt.user_id.slice(0, 8).toUpperCase() : 'System Engine'}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400 font-mono text-[11px]">
                        {evt.changes ? Object.keys(evt.changes).join(', ') : 'Recorded'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
