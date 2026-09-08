import React, { useState, useMemo } from 'react';
import { Search, Star, MapPin, Clock, CheckCircle2, AlertCircle, Briefcase, Filter } from 'lucide-react';
import { OFFICERS_DATA, OfficerRecord } from '../data/officersData';
import { OfficersIllustration } from './OfficersIllustration';

interface OfficersPageProps {
  onAddOfficer?: () => void;
}

const STATUS_CONFIG: Record<OfficerRecord['status'], { label: string; dot: string; bg: string; text: string }> = {
  'On Field': { label: 'On Field', dot: 'bg-[#017374]', bg: 'bg-[#E5F0EC]', text: 'text-[#017374]' },
  'In Office': { label: 'In Office', dot: 'bg-[#E37820]', bg: 'bg-amber-50', text: 'text-[#E37820]' },
  'On Leave': { label: 'On Leave', dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-500' },
};

const DISTRICTS = ['All Districts', 'Pune', 'Solapur', 'Satara', 'Kolhapur', 'Sangli', 'Ahmednagar'];
const STATUSES = ['All Status', 'On Field', 'In Office', 'On Leave'];
const ROLES = ['All Roles', 'Sr. Field Inspector', 'Legal Metrology Officer', 'Field Inspector', 'Compliance Reviewer', 'Enforcement Officer', 'Commodity Inspector', 'Metrology Officer', 'Sr. Inspector - D4'];

export const OfficersPage: React.FC<OfficersPageProps> = ({ onAddOfficer }) => {
  const [search, setSearch] = useState('');
  const [districtFilter, setDistrictFilter] = useState('All Districts');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [roleFilter, setRoleFilter] = useState('All Roles');

  const topPerformer = useMemo(() => [...OFFICERS_DATA].sort((a, b) => b.accuracy - a.accuracy)[0], []);

  const filtered = useMemo(() => {
    return OFFICERS_DATA.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch = !q || o.name.toLowerCase().includes(q) || o.badgeId.toLowerCase().includes(q) || o.rank.toLowerCase().includes(q) || o.jurisdiction.toLowerCase().includes(q);
      const matchDistrict = districtFilter === 'All Districts' || o.district === districtFilter;
      const matchStatus = statusFilter === 'All Status' || o.status === statusFilter;
      const matchRole = roleFilter === 'All Roles' || o.rank === roleFilter;
      return matchSearch && matchDistrict && matchStatus && matchRole;
    });
  }, [search, districtFilter, statusFilter, roleFilter]);

  const kpiCards = [
    { label: 'Total Officers', value: OFFICERS_DATA.length, icon: <Briefcase className="w-4 h-4" />, iconBg: 'bg-[#017374]/10', iconColor: 'text-[#017374]', subtitle: 'Registered in D4', isText: false },
    { label: 'On Field', value: OFFICERS_DATA.filter((o) => o.status === 'On Field').length, icon: <MapPin className="w-4 h-4" />, iconBg: 'bg-[#E5F0EC]', iconColor: 'text-[#017374]', subtitle: 'Active field ops', isText: false },
    { label: 'In Office', value: OFFICERS_DATA.filter((o) => o.status === 'In Office').length, icon: <CheckCircle2 className="w-4 h-4" />, iconBg: 'bg-amber-50', iconColor: 'text-[#E37820]', subtitle: 'Review & admin tasks', isText: false },
    { label: 'On Leave', value: OFFICERS_DATA.filter((o) => o.status === 'On Leave').length, icon: <AlertCircle className="w-4 h-4" />, iconBg: 'bg-slate-100', iconColor: 'text-slate-500', subtitle: 'Unavailable today', isText: false },
    { label: 'Top Performer', value: topPerformer?.name.split(' ')[0] ?? '—', icon: <Star className="w-4 h-4" />, iconBg: 'bg-[#FEB519]/15', iconColor: 'text-[#FEB519]', subtitle: 'Highest accuracy this month', isText: true },
  ];

  return (
    <div className="space-y-5 pb-10">
      {/* Hero */}
      <div className="relative bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E5F0EC]/60 via-white to-white pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row items-center gap-6 px-8 pt-8 pb-6">
          <div className="flex-1 space-y-5 min-w-0">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#E5F0EC] text-[#017374] text-[10px] font-bold px-3 py-1 rounded-full mb-3 tracking-wide uppercase">
                <Briefcase className="w-3 h-3" />
                Officer Registry — District 4
              </div>
              <h1 className="text-2xl font-extrabold text-slate-800 leading-snug">The team behind the compliance.</h1>
              <p className="text-xs text-slate-500 mt-1.5 max-w-xl">
                Monitor field officers across Maharashtra District 4 — track deployment status, inspection accuracy, resolution times, and task loads in real time.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpiCards.map((card) => (
                <div key={card.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs px-4 py-3 flex flex-col gap-2 hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide leading-tight">{card.label}</span>
                    <span className={`w-6 h-6 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center`}>{card.icon}</span>
                  </div>
                  <div className={`font-extrabold leading-none ${card.isText ? 'text-base text-[#017374]' : 'text-2xl text-slate-800'}`}>{String(card.value)}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{card.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:w-[280px] xl:w-[320px] shrink-0">
            <OfficersIllustration className="w-full h-[200px] lg:h-[220px]" />
          </div>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs px-5 py-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search officer name, badge ID, jurisdiction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#edf3f1] border border-slate-200/80 rounded-xl placeholder:text-slate-400 text-slate-700 outline-none focus:ring-2 focus:ring-[#017374]/30 focus:border-[#017374]/50 transition"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select value={districtFilter} onChange={(e) => setDistrictFilter(e.target.value)} className="text-xs text-slate-600 bg-[#edf3f1] border border-slate-200/80 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#017374]/30 cursor-pointer font-medium">
            {DISTRICTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="text-xs text-slate-600 bg-[#edf3f1] border border-slate-200/80 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#017374]/30 cursor-pointer font-medium">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-xs text-slate-600 bg-[#edf3f1] border border-slate-200/80 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#017374]/30 cursor-pointer font-medium">
            {ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
          <span className="text-[10px] text-slate-400 font-semibold ml-1">{filtered.length} officer{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800">Officer Roster</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">District 4 field team — live deployment & performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            {(['On Field', 'In Office', 'On Leave'] as OfficerRecord['status'][]).map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium">
                <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[s].dot} inline-block`} />{s}
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-[#edf3f1]/60 text-left">
                {['Officer', 'Rank / Role', 'Jurisdiction', 'Active Tasks', 'Pending', 'Completed', 'Accuracy', 'Avg. Resolution', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 first:px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">No officers match your filters.</td></tr>
              ) : filtered.map((officer) => {
                const statusCfg = STATUS_CONFIG[officer.status];
                const isTop = officer.id === topPerformer?.id;
                const taskBarPct = Math.min(100, (officer.activeTasks / 15) * 100);
                return (
                  <tr key={officer.id} className="hover:bg-[#edf3f1]/40 transition-colors cursor-pointer group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-xs" style={{ backgroundColor: officer.avatarBg }}>{officer.initials}</div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-800 group-hover:text-[#017374] transition-colors">{officer.name}</span>
                            {isTop && <span className="inline-flex items-center gap-0.5 bg-[#FEB519]/20 text-[#c68b0a] text-[9px] font-bold px-1.5 py-0.5 rounded-full"><Star className="w-2.5 h-2.5" /> Top</span>}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{officer.badgeId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4"><span className="text-xs text-slate-600 font-medium">{officer.rank}</span></td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-600 max-w-[160px] leading-tight">{officer.jurisdiction}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-xs font-bold text-slate-800">{officer.activeTasks}</div>
                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#017374] transition-all" style={{ width: `${taskBarPct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-bold ${officer.pendingTasks > 3 ? 'text-[#E37820]' : officer.pendingTasks > 0 ? 'text-slate-600' : 'text-[#017374]'}`}>{officer.pendingTasks}</span>
                    </td>
                    <td className="px-4 py-4"><span className="text-xs font-semibold text-slate-700">{officer.totalCompleted}</span></td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-extrabold ${officer.accuracy >= 97 ? 'text-[#017374]' : officer.accuracy >= 95 ? 'text-amber-600' : 'text-rose-500'}`}>{officer.accuracy.toFixed(1)}%</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />{officer.avgResolutionTime}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusCfg.bg} ${statusCfg.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between bg-[#edf3f1]/30">
          <span className="text-[10px] text-slate-400 font-medium">Showing {filtered.length} of {OFFICERS_DATA.length} officers — District 4 Jurisdiction</span>
          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
            <span>Avg. Accuracy: <span className="text-[#017374] font-bold">{(OFFICERS_DATA.reduce((s, o) => s + o.accuracy, 0) / OFFICERS_DATA.length).toFixed(1)}%</span></span>
            <span>Total Completed: <span className="text-slate-700 font-bold">{OFFICERS_DATA.reduce((s, o) => s + o.totalCompleted, 0)}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
};
