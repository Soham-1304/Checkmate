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
        const t = d?.trend ?? d?.inspections_trend ?? d?.volume_trend ?? [];
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

export type MockupType =
  | 'amul' | 'britannia' | 'mdh' | 'parleg' | 'classmate'
  | 'maggi' | 'fortune' | 'haldirams' | 'tatatea' | 'tata';

export const brandMockup = (brand?: string | null): MockupType => {
  const b = (brand || '').toLowerCase();
  if (b.includes('amul')) return 'amul';
  if (b.includes('britannia')) return 'britannia';
  if (b.includes('parle')) return 'parleg';
  if (b.includes('maggi') || b.includes('nestl')) return 'maggi';
  if (b.includes('haldiram')) return 'haldirams';
  if (b.includes('tata') && b.includes('tea')) return 'tatatea';
  if (b.includes('tata')) return 'tata';
  if (b.includes('saffola') || b.includes('fortune') || b.includes('oil')) return 'fortune';
  if (b.includes('aashirvaad') || b.includes('atta') || b.includes('flour')) return 'classmate';
  if (b.includes('mdh') || b.includes('spice')) return 'mdh';
  return 'tata';
};

export interface LiveInspectionRow {
  backendId: string;
  shortId: string;
  productName: string;
  category: string;
  mockupType: MockupType;
  brandName: string;
  officerName: string;
  officerInitials: string;
  dateTime: string;
  compliance: 'Compliant' | 'Minor' | 'Major' | 'Critical';
  aiConfidence: number;
  aiDescription: string;
  status: 'AI Review' | 'Pending' | 'Approved' | 'Rejected' | 'Re-inspection';
  isHighPriority: boolean;
}

export const asList = (d: any): any[] =>
  Array.isArray(d) ? d : d?.items ?? d?.commodities ?? d?.users ?? [];

const initialsOf = (name: string) =>
  name.split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') || 'OF';

const fmtDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  const dd = String(d.getDate()).padStart(2, '0');
  let h = d.getHours();
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd} ${mon} ${d.getFullYear()} ${String(h).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} ${ap}`;
};

export function useLiveInspections() {
  const [data, setData] = useState<LiveInspectionRow[]>([]);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    (async () => {
      try {
        const [inspections, users, commodities] = await Promise.all([
          api<any[]>('/inspections?limit=50'),
          api<any>('/users?limit=100').catch(() => []),
          api<any>('/commodities?limit=100').catch(() => []),
        ]);
        if (!inspections?.length) return;
        const officerById: Record<string, string> = {};
        asList(users).forEach((u: any) => {
          if (u?.id) officerById[String(u.id)] = String(u.name ?? u.email ?? 'Officer');
        });
        const catByCommodity: Record<string, string> = {};
        asList(commodities).forEach((c: any) => {
          if (c?.id) catByCommodity[String(c.id)] = String(c.category ?? '');
        });
        const details = await Promise.all(
          inspections.map((i: any) =>
            api<any>(`/inspections/${i.id}`).catch(() => null),
          ),
        );
        const rows: LiveInspectionRow[] = inspections.map((i: any, idx: number) => {
          const d = details[idx];
          const verdict = String(i.compliance_result ?? 'REVIEW').toUpperCase();
          const compliance =
            verdict === 'PASS' ? ('Compliant' as const)
            : verdict === 'FAIL' ? ('Major' as const)
            : ('Minor' as const);
          const finalDec = String(i.final_decision ?? '');
          const st = String(i.status ?? '');
          const status =
            st === 'UNDER_REVIEW' ? ('AI Review' as const)
            : st === 'COMPLETED'
              ? (finalDec === 'APPROVED_NON_COMPLIANT' ? ('Rejected' as const) : ('Approved' as const))
            : st === 'IN_PROGRESS' && finalDec === 'RETURNED_FOR_REVIEW'
              ? ('Re-inspection' as const)
              : ('Pending' as const);
          const findings = d?.findings ?? [];
          const decls = d?.declarations ?? [];
          const confs = decls.map((x: any) => Number(x.confidence)).filter((n: number) => !Number.isNaN(n));
          const aiConfidence = confs.length
            ? Math.round((confs.reduce((a: number, b: number) => a + b, 0) / confs.length) * 100)
            : 0;
          const firstFinding = String(findings[0]?.title ?? '')
            .replace(/^(Non-Compliance|Review Warranted):\s*/, '')
            .slice(0, 60) || (verdict === 'PASS' ? 'All declarations compliant' : 'Pending analysis');
          const officerName = officerById[String(i.officer_id)] ?? 'Field Officer';
          const brandName = String(i.brand_name ?? 'Brand');
          return {
            backendId: String(i.id),
            shortId: String(i.id).slice(0, 8).toUpperCase(),
            productName: String(i.commodity_name ?? 'Commodity'),
            category: catByCommodity[String(i.commodity_id)] || '',
            mockupType: brandMockup(brandName),
            brandName,
            officerName,
            officerInitials: initialsOf(officerName),
            dateTime: fmtDate(i.created_at),
            compliance,
            aiConfidence,
            aiDescription: firstFinding,
            status,
            isHighPriority: verdict === 'FAIL',
          };
        });
        setData(rows);
        setLive(true);
      } catch {}
    })();
  }, []);
  return { data, live };
}

export interface LiveInspectionDetail {
  backendId: string;
  verdict: string;
  status: string;
  brandName: string;
  commodityName: string;
  officerName: string;
  createdAt: string;
  evidence: { id: string; file_url: string | null; view_type: string }[];
  declarations: {
    display_name: string; canonical_key: string; final_value: string | null;
    confidence: number | null; is_corrected: boolean;
  }[];
  findings: {
    title: string; explanation: string; severity: string; legal_reference: string;
    officer_accepted: boolean | null;
  }[];
  reportUrl: string | null;
}

export function useLiveInspectionDetail(backendId: string | null) {
  const [data, setData] = useState<LiveInspectionDetail | null>(null);
  const [loading, setLoading] = useState(!!backendId);
  useEffect(() => {
    if (!backendId || !isLiveConfigured()) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      try {
        const [d, users, report] = await Promise.all([
          api<any>(`/inspections/${backendId}`),
          api<any>('/users?limit=100').catch(() => []),
          api<any>(`/inspections/${backendId}/report`).catch(() => null),
        ]);
        const officerById: Record<string, string> = {};
        asList(users).forEach((u: any) => {
          if (u?.id) officerById[String(u.id)] = String(u.name ?? u.email ?? 'Officer');
        });
        setData({
          backendId,
          verdict: String(d.compliance_result ?? 'PENDING'),
          status: String(d.status ?? ''),
          brandName: String(d.brand_name ?? 'Brand'),
          commodityName: String(d.commodity_name ?? 'Commodity'),
          officerName: officerById[String(d.officer_id)] ?? 'Field Officer',
          createdAt: d.created_at ?? '',
          evidence: (d.evidence_items ?? []).map((e: any) => ({
            id: String(e.id), file_url: e.file_url ?? null, view_type: String(e.view_type ?? ''),
          })),
          declarations: (d.declarations ?? []).map((x: any) => ({
            display_name: String(x.display_name ?? x.canonical_key ?? 'Field'),
            canonical_key: String(x.canonical_key ?? ''),
            final_value: x.final_value ?? x.machine_value ?? null,
            confidence: typeof x.confidence === 'number' ? x.confidence : null,
            is_corrected: !!x.is_corrected,
          })),
          findings: (d.findings ?? []).map((f: any) => ({
            title: String(f.title ?? ''),
            explanation: String(f.explanation ?? ''),
            severity: String(f.severity ?? ''),
            legal_reference: String(f.legal_reference ?? ''),
            officer_accepted: f.officer_accepted ?? null,
          })),
          reportUrl: report?.file_url ?? null,
        });
      } catch {}
      setLoading(false);
    })();
  }, [backendId]);
  return { data, loading };
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
// ---------------------------------------------------------------------------
// Live registry hooks (inspections list, companies, officers, AI decisions)
// Live-with-mock-fallback pattern: same as the dashboard hooks above.
// ---------------------------------------------------------------------------
import { InspectionDetailRow } from '../data/inspectionsData';
import { CompanyRegistryRow } from '../data/companiesData';
import { OfficerRecord } from '../data/officersData';
import { AIAnalysisItem } from '../types';
import { ProductType } from '../components/ProductMockup';

const AV_COLORS = ['#0284c7', '#ec4899', '#017374', '#E37820', '#7c3aed', '#059669'];
const colorFor = (s: string) =>
  AV_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AV_COLORS.length];
const mkInitials = (name: string) =>
  name.split(/\s+/).map((w) => w[0]?.toUpperCase() ?? '').slice(0, 2).join('') || '??';
const BRAND_TO_MOCKUP: Record<string, ProductType> = {
  amul: 'amul', britannia: 'britannia', mdh: 'mdh', parle: 'parleg',
  maggi: 'maggi', fortune: 'fortune', haldiram: 'haldirams', tata: 'tatatea',
  classmate: 'classmate',
};

interface RepoRow {
  inspection_id: string;
  created_at: string;
  status: string;
  compliance_result: string | null;
  final_decision: string | null;
  officer_name: string;
  commodity: string;
  brand: string;
  manufacturer: string;
  barcode: string;
  district?: string;
  state?: string;
  findings_count: number;
}

export function mapRepoRow(r: RepoRow): InspectionDetailRow {
  const brandKey = (r.brand || '').toLowerCase().replace(/[^a-z]/g, '');
  const mockupType: ProductType =
    Object.entries(BRAND_TO_MOCKUP).find(([k]) => brandKey.startsWith(k))?.[1] ?? 'britannia';
  const conf = r.compliance_result === 'PASS' ? 92 : r.compliance_result === 'REVIEW' ? 78 : r.compliance_result === 'FAIL' ? 71 : 0;
  const status: InspectionDetailRow['status'] =
    r.final_decision === 'APPROVED_COMPLIANT' || r.final_decision === 'APPROVED_NON_COMPLIANT'
      ? 'Approved'
      : r.final_decision === 'RETURNED_FOR_REVIEW'
        ? 'Re-inspection'
        : r.status === 'COMPLETED' ? 'Approved'
        : r.status === 'UNDER_REVIEW' ? 'Pending'
        : r.status === 'IN_PROGRESS' ? 'AI Review' : 'Pending';
  const compliance: InspectionDetailRow['compliance'] =
    r.compliance_result === 'PASS' ? 'Compliant'
      : r.compliance_result === 'REVIEW' ? 'Minor'
      : r.compliance_result === 'FAIL' ? 'Major' : 'Minor';
  return {
    id: r.inspection_id,
    isHighPriority: r.compliance_result === 'FAIL',
    product: { name: `${r.brand} ${r.commodity}`.trim(), category: 'Packaged Food', mockupType },
    company: { name: r.manufacturer, industry: 'Food & Beverage' },
    officer: { name: r.officer_name, initials: mkInitials(r.officer_name) },
    dateTime: fmtDate(r.created_at),
    compliance,
    aiFinding: {
      confidence: conf,
      description: r.findings_count > 0 ? `${r.findings_count} rule finding(s)` : 'All checks passed',
    },
    status,
  };
}

function useRepoRows(limit = 100): RepoRow[] {
  const [rows, setRows] = useState<RepoRow[]>([]);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    api<{ items?: RepoRow[] }>(`/repository/search?limit=${limit}`)
      .then((d) => setRows(d?.items ?? []))
      .catch(() => {});
  }, [limit]);
  return rows;
}

export async function fetchRepoRows(): Promise<RepoRow[]> {
  try {
    const d = await api<{ items?: RepoRow[] }>('/repository/search?limit=100');
    return d?.items ?? [];
  } catch {
    return [];
  }
}

export function useLiveCompanies(fallback: CompanyRegistryRow[]) {
  const [data, setData] = useState<CompanyRegistryRow[]>(fallback);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    Promise.all([api<any[]>('/entities'), api<any>('/dashboard/admin?days=60'), fetchRepoRows()])
      .then(([entities, dash, repoRows]) => {
        if (!Array.isArray(entities) || !entities.length) return;
        const offenders = new Map<string, { v: number; i: number }>();
        for (const r of dash?.repeat_offenders ?? []) {
          offenders.set(r.entity, { v: r.violations ?? 0, i: r.inspections ?? 0 });
        }
        const byEntity = new Map<string, RepoRow[]>();
        for (const r of repoRows) {
          const list = byEntity.get(r.manufacturer) ?? [];
          list.push(r);
          byEntity.set(r.manufacturer, list);
        }
        const mapped: CompanyRegistryRow[] = entities.map((e) => {
          const name = e.legal_name as string;
          const rows = byEntity.get(name) ?? [];
          const off = offenders.get(name);
          const violations = Math.max(off?.v ?? 0, rows.filter((r) => r.compliance_result === 'FAIL').length);
          const inspections = Math.max(off?.i ?? 0, rows.length);
          const passCount = rows.filter((r) => r.compliance_result === 'PASS').length;
          const compliancePct = inspections > 0 ? Math.round((passCount / inspections) * 100) : 0;
          const risk: CompanyRegistryRow['risk'] =
            inspections === 0 ? 'Medium'
              : compliancePct >= 85 ? 'Low'
              : compliancePct >= 65 ? 'Medium'
              : compliancePct >= 45 ? 'High' : 'Critical';
          const lastOfficer = rows[0]?.officer_name ?? 'Unassigned';
          const underReview = rows.some((r) => r.status === 'UNDER_REVIEW');
          return {
            id: e.id,
            name,
            licenseNo: e.gstin ? `GSTIN ${e.gstin}` : 'GSTIN —',
            avatarText: name[0]?.toUpperCase() ?? '?',
            avatarBg: colorFor(name),
            category: e.type === 'MANUFACTURER' ? 'Manufacturer' : e.type === 'PACKER' ? 'Packer' : 'Importer',
            state: e.state ?? '—',
            compliance: compliancePct,
            complianceBarColor: compliancePct >= 70 ? '#017374' : compliancePct >= 45 ? '#FEB519' : '#E37820',
            inspections,
            violations,
            risk,
            officer: { name: lastOfficer, initials: mkInitials(lastOfficer) },
            status: underReview ? 'Under Rev.' : 'Active',
          };
        });
        setData(mapped);
        setLive(true);
      })
      .catch(() => {});
  }, []);
  return { data, live };
}

export function useLiveOfficers(fallback: OfficerRecord[]) {
  const [data, setData] = useState<OfficerRecord[]>(fallback);
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!isLiveConfigured()) return;
    Promise.all([api<any>('/users'), api<any>('/dashboard/admin?days=60')])
      .then(([users, dash]) => {
        const officers = (Array.isArray(users) ? users : users?.users ?? []).filter(
          (u: any) => u.role === 'OFFICER',
        );
        if (!officers.length) return;
        const wl = new Map<string, { total: number; completed: number }>();
        for (const w of dash?.workload ?? []) {
          wl.set(w.officer_id, { total: w.total ?? 0, completed: w.completed ?? 0 });
        }
        const mapped: OfficerRecord[] = officers.map((u: any) => {
          const w = wl.get(u.id) ?? { total: 0, completed: 0 };
          const active = Math.max(0, w.total - w.completed);
          const accuracy = w.total > 0 ? Math.round((w.completed / w.total) * 100) : 100;
          return {
            id: u.id,
            name: u.name,
            badgeId: u.employee_id ?? '—',
            rank: 'Inspecting Officer',
            initials: mkInitials(u.name),
            avatarBg: colorFor(u.name),
            jurisdiction: u.location ?? 'Field Unit',
            district: (u.location ?? '—').split(',')[0],
            activeTasks: active,
            pendingTasks: 0,
            totalCompleted: w.completed,
            accuracy,
            avgResolutionTime: '—',
            status: active > 0 ? 'On Field' : 'In Office',
            contact: { email: u.email ?? '—', phone: u.phone ?? '—' },
          };
        });
        setData(mapped);
        setLive(true);
      })
      .catch(() => {});
  }, []);
  return { data, live };
}

export function useLiveAIDecisions(fallback: AIAnalysisItem[]) {
  const [data, setData] = useState<AIAnalysisItem[]>(fallback);
  const [live, setLive] = useState(false);
  const rows = useRepoRows();
  useEffect(() => {
    if (rows.length) {
      const items: AIAnalysisItem[] = rows.slice(0, 8).map((r) => ({
        id: r.inspection_id,
        code: r.barcode || r.inspection_id.slice(0, 8),
        productName: `${r.brand} ${r.commodity}`.trim(),
        packageImage: '',
        priority: r.compliance_result === 'FAIL' ? 'High' : r.compliance_result === 'REVIEW' ? 'Medium' : 'Low',
        status:
          r.compliance_result === 'FAIL' ? 'Non-Compliant'
            : r.compliance_result === 'REVIEW' ? 'Review Needed' : 'Compliant',
        confidence: r.compliance_result === 'PASS' ? 92 : r.compliance_result === 'REVIEW' ? 78 : 71,
        reason:
          r.findings_count > 0
            ? `${r.findings_count} rule finding(s) detected`
            : 'All label checks passed',
        details: {
          manufacturer: r.manufacturer,
          detectedIssues: r.findings_count > 0 ? [`${r.findings_count} findings`] : [],
        },
      }));
      setData(items);
      setLive(true);
    }
  }, [rows]);
  return { data, live };
}
