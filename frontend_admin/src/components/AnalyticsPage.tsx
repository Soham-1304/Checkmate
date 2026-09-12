import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Users,
  Building2,
  Calendar,
  Loader2,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { api } from '../api/client';

export const AnalyticsPage: React.FC = () => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api<any>(`/dashboard/admin?days=${days}`)
      .then((res) => setData(res))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [days]);

  const compliance = data?.compliance ?? data?.compliance_summary ?? {};
  const pass = compliance?.pass ?? compliance?.PASS ?? 0;
  const fail = compliance?.fail ?? compliance?.FAIL ?? 0;
  const review = compliance?.review ?? compliance?.REVIEW ?? 0;
  const total = pass + fail + review;
  const passRate = total > 0 ? Math.round((pass / total) * 100) : 0;

  const trend = (data?.trend ?? data?.inspections_trend ?? []).map((t: any) => ({
    date: String(t.date ?? t.day ?? '').slice(5),
    total: t.count ?? t.total ?? 0,
    fails: t.fail_count ?? t.flagged ?? t.fails ?? 0,
  }));

  const repeatOffenders = data?.repeat_offenders ?? [];
  const workload = data?.workload ?? [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#017374] tracking-wider uppercase mb-1">
            EXECUTIVE INTELLIGENCE
          </div>
          <h1 className="text-3xl font-black text-[#12312b] tracking-tight leading-tight">
            Compliance Analytics & Enforcement Trends
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            District 4 legal compliance velocity, manufacturer risk ranking, and officer resolution metrics
          </p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
          {[7, 30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                days === d
                  ? 'bg-[#017374] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="w-8 h-8 text-[#017374] animate-spin mx-auto" />
          <div className="text-xs text-slate-500 font-medium">Computing legal metrics for the last {days} days...</div>
        </div>
      ) : (
        <>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs">
              <div className="text-2xl font-black text-slate-800">{total}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Total Inspections</div>
              <div className="text-[11px] text-[#017374] font-semibold mt-2">In {days}-day window</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs">
              <div className="text-2xl font-black text-[#017374]">{passRate}%</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Clearance Compliance Rate</div>
              <div className="text-[11px] text-emerald-600 font-semibold mt-2">{pass} verified compliant</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs">
              <div className="text-2xl font-black text-[#E37820]">{fail}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Statutory Violations</div>
              <div className="text-[11px] text-[#E37820] font-semibold mt-2">Packaged goods failed</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-2xs">
              <div className="text-2xl font-black text-[#FEB519]">{review}</div>
              <div className="text-xs text-slate-500 font-medium mt-0.5">Pending AI Reviews</div>
              <div className="text-[11px] text-amber-700 font-semibold mt-2">Requires admin sign-off</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Inspection Volume Trend */}
            <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-[#8EC8BA]/40 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-800">Inspection & Flagged Trends</h3>
                  <p className="text-xs text-slate-500">Total volume vs non-compliant package detections</p>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#017374]" />
                    <span className="text-slate-600">Total</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E37820]" />
                    <span className="text-slate-600">Flagged</span>
                  </div>
                </div>
              </div>

              <div className="w-full h-64 pt-2">
                {trend.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                    No trend datapoints available for this timeframe
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5F0EC" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #8EC8BA',
                          fontSize: '12px',
                        }}
                      />
                      <Line type="monotone" dataKey="total" stroke="#017374" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="fails" stroke="#E37820" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Officer Workload Breakdown */}
            <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-[#8EC8BA]/40 shadow-xs space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Officer Workload</h3>
                <p className="text-xs text-slate-500">Distribution of inspections by officer</p>
              </div>

              <div className="space-y-3 pt-2">
                {workload.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No active officer workload recorded
                  </div>
                ) : (
                  workload.slice(0, 5).map((w: any, idx: number) => {
                    const done = w.completed ?? 0;
                    const tot = w.total ?? 1;
                    const pct = Math.round((done / tot) * 100);
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-700">{w.officer || 'Officer'}</span>
                          <span className="text-slate-500 font-semibold">{done} / {tot} done</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-[#E5F0EC] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#017374]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Repeat Offenders Ranking Table */}
          <div className="bg-white rounded-3xl border border-[#8EC8BA]/40 shadow-xs overflow-hidden p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">Repeat Non-Compliant Entities</h3>
              <p className="text-xs text-slate-500">Entities with repeated packaging non-compliances</p>
            </div>

            {repeatOffenders.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No repeated non-compliances flagged in this timeframe
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#E5F0EC]/30 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 font-bold text-slate-700">Entity Legal Name</th>
                      <th className="px-4 py-3 font-bold text-slate-700 text-center">Total Inspections</th>
                      <th className="px-4 py-3 font-bold text-slate-700 text-center">Violations Issued</th>
                      <th className="px-4 py-3 font-bold text-slate-700 text-right">Risk Assessment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {repeatOffenders.map((r: any, idx: number) => {
                      const v = r.violations ?? 0;
                      return (
                        <tr key={idx} className="hover:bg-[#E5F0EC]/20 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-800">{r.entity || r.brand}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{r.inspections ?? 0}</td>
                          <td className="px-4 py-3 text-center font-bold text-[#E37820]">{v}</td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                v >= 2
                                  ? 'bg-[#E37820]/15 text-[#E37820]'
                                  : 'bg-[#FEB519]/25 text-[#9a6206]'
                              }`}
                            >
                              {v >= 2 ? 'High Risk' : 'Elevated Attention'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
