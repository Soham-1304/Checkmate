import { useEffect, useState } from 'react';
import { api, isLiveConfigured } from './client';

export interface LiveCompliance {
  pass: number;
  fail: number;
  review: number;
  passRate: number;
}

export interface LiveTrendPoint {
  month: string;
  completed: number;
  flagged: number;
}

export interface LiveRecentRow {
  id: string;
  product: string;
  company: string;
  officer: string;
  date: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'AI Review';
}

const num = (v: any, fb = 0) => (typeof v === 'number' && !Number.isNaN(v) ? v : fb);

export function useLiveCompliance(fallback: LiveCompliance) {
  const [data, setData] = useState<LiveCompliance>(fallback);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    api<any>('/dashboard/admin?days=30')
      .then((d) => {
        const c = d?.compliance ?? d?.compliance_summary ?? {};
        const pass = num(c.pass ?? c.compliant ?? c.PASS);
        const fail = num(c.fail ?? c.failed ?? c.non_compliant ?? c.FAIL);
        const review = num(c.review ?? c.needs_review ?? c.REVIEW);
        if (pass + fail + review > 0) {
          const total = pass + fail + review;
          setData({
            pass, fail, review,
            passRate: Math.round((pass / total) * 100),
          });
          setLive(true);
        }
      })
      .catch(() => {});
  }, []);
  return { data, live };
}

export function useLiveTrend(fallback: LiveTrendPoint[]) {
  const [data, setData] = useState<LiveTrendPoint[]>(fallback);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    api<any>('/dashboard/admin?days=30')
      .then((d) => {
        const t = d?.trend ?? d?.inspections_trend ?? [];
        if (Array.isArray(t) && t.length) {
          setData(
            t.map((p: any) => ({
              month: String(p.date ?? p.day ?? p.label ?? '').slice(5),
              completed: num(p.count ?? p.completed ?? p.total),
              flagged: num(p.fail_count ?? p.flagged ?? p.fails),
            })),
          );
          setLive(true);
        }
      })
      .catch(() => {});
  }, []);
  return { data, live };
}

export function useLiveRecent(fallback: LiveRecentRow[]) {
  const [data, setData] = useState<LiveRecentRow[]>(fallback);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    api<any>('/repository/search?limit=6')
      .then((d) => {
        const items = d?.items ?? (Array.isArray(d) ? d : []);
        if (items.length) {
          setData(
            items.map((i: any) => ({
              id: String(i.id ?? i.inspection_id ?? '').slice(0, 8),
              product: i.commodity ?? i.generic_name ?? '—',
              company: i.brand ?? i.manufacturer ?? '—',
              officer: i.officer_name ?? i.officer ?? '—',
              date: (i.created_at ?? '').slice(0, 10),
              status:
                i.compliance_result === 'PASS'
                  ? 'Approved'
                  : i.compliance_result === 'FAIL'
                    ? ('Rejected' as const)
                    : ('AI Review' as const),
            })),
          );
          setLive(true);
        }
      })
      .catch(() => {});
  }, []);
  return { data, live };
}

export interface LiveViolation {
  title: string;
  count: number;
  percentage: number;
  color: string;
}

const VCOLORS = ['#E37820', '#FEB519', '#E37820', '#017374', '#8EC8BA'];

export function useLiveTopViolations(fallback: LiveViolation[]) {
  const [data, setData] = useState<LiveViolation[]>(fallback);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    api<{ rule_reference: string; title: string; occurrences: number }[]>('/dashboard/violations')
      .then((rows) => {
        if (rows?.length) {
          const max = Math.max(...rows.map((r) => num(r.occurrences)));
          setData(
            rows.slice(0, 5).map((r, i) => ({
              title: String(r.title ?? r.rule_reference ?? 'Violation').replace(/^(Non-Compliance|Review Warranted):\s*/, ''),
              count: num(r.occurrences),
              percentage: max ? Math.round((num(r.occurrences) / max) * 100) : 0,
              color: VCOLORS[i % VCOLORS.length],
            })),
          );
          setLive(true);
        }
      })
      .catch(() => {});
  }, []);
  return { data, live };
}

export interface LiveRiskCompany {
  rank: number;
  name: string;
  compliance: number;
  violations: number;
  risk: 'High' | 'Medium' | 'Low';
}

export function useLiveHighRisk(fallback: LiveRiskCompany[]) {
  const [data, setData] = useState<LiveRiskCompany[]>(fallback);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    api<any>('/dashboard/admin?days=60')
      .then((d) => {
        const rows = d?.repeat_offenders ?? [];
        if (rows.length) {
          setData(
            rows.slice(0, 5).map((r: any, i: number) => {
              const insp = num(r.inspections);
              const viol = num(r.violations);
              const compliance = Math.min(100, Math.round((insp / Math.max(1, insp + viol)) * 100));
              return {
                rank: i + 1,
                name: String(r.brand ?? r.entity ?? 'Company'),
                compliance,
                violations: viol,
                risk: viol >= 2 ? ('High' as const) : ('Medium' as const),
              };
            }),
          );
          setLive(true);
        }
      })
      .catch(() => {});
  }, []);
  return { data, live };
}

export interface LiveWorkloadItem {
  id: string;
  name: string;
  initials: string;
  active: number;
  pending: number;
  progressPercent: number;
}

export function useLiveOfficerWorkload(fallback: LiveWorkloadItem[]) {
  const [data, setData] = useState<LiveWorkloadItem[]>(fallback);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    api<any>('/dashboard/admin?days=60')
      .then((d) => {
        const rows = d?.workload ?? [];
        if (rows.length) {
          setData(
            rows.slice(0, 5).map((r: any) => {
              const name = String(r.officer ?? 'Officer');
              const total = num(r.total);
              const completed = num(r.completed);
              const initials = name
                .split(/\s+/)
                .map((w: string) => w[0]?.toUpperCase() ?? '')
                .slice(0, 2)
                .join('');
              return {
                id: String(r.officer_id ?? name),
                name,
                initials: initials || 'OF',
                active: completed,
                pending: Math.max(0, total - completed),
                progressPercent: total ? Math.round((completed / total) * 100) : 0,
              };
            }),
          );
          setLive(true);
        }
      })
      .catch(() => {});
  }, []);
  return { data, live };
}
