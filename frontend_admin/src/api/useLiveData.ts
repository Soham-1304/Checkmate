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
