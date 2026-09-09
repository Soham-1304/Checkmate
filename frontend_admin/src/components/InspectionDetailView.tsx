import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  XCircle,
  ShieldCheck,
  Building2,
  Calendar,
  MapPin,
  User,
  FileText,
  Loader2,
  Camera,
  Scale,
} from 'lucide-react';
import { InspectionDetailRow } from '../data/inspectionsData';
import { api, isLiveConfigured } from '../api/client';

interface InspectionDetailViewProps {
  inspection: InspectionDetailRow | null;
  onBack: () => void;
  onApprove: (id: string) => void;
  onRequestReinspection: (id: string) => void;
  onReject: (id: string) => void;
}

interface EvidenceItem {
  id: string;
  file_url?: string;
  url?: string;
  view_type: string;
  mime_type?: string;
  created_at: string;
}
interface DeclarationItem {
  id: string;
  canonical_key: string;
  display_name?: string;
  final_value?: string | number | null;
  machine_value?: string | number | null;
  confidence?: number | null;
  confidence_label?: string;
  script_language?: string;
}
interface FindingItem {
  id: string;
  severity: string;
  title: string;
  explanation?: string;
  legal_reference?: string;
}
interface InspectionFull {
  id: string;
  status: string;
  compliance_result?: string | null;
  final_decision?: string | null;
  context_notes?: string | null;
  created_at: string;
  submitted_at?: string | null;
}

const SEV_STYLE: Record<string, string> = {
  CRITICAL: 'bg-rose-100 text-rose-700 border-rose-200',
  MAJOR: 'bg-[#E37820]/15 text-[#E37820] border-[#E37820]/30',
  MINOR: 'bg-amber-100 text-[#9a6206] border-amber-200',
  INFO: 'bg-emerald-100 text-[#017374] border-emerald-200',
};
const COMP_STYLE: Record<string, string> = {
  Compliant: 'bg-emerald-100 text-[#017374] border-emerald-200',
  Minor: 'bg-amber-100 text-[#9a6206] border-amber-200',
  Major: 'bg-[#E37820]/15 text-[#E37820] border-[#E37820]/30',
  Critical: 'bg-rose-100 text-rose-700 border-rose-200',
};

export const InspectionDetailView: React.FC<InspectionDetailViewProps> = ({
  inspection,
  onBack,
  onApprove,
  onRequestReinspection,
  onReject,
}) => {
  const [full, setFull] = useState<InspectionFull | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [declarations, setDeclarations] = useState<DeclarationItem[]>([]);
  const [findings, setFindings] = useState<FindingItem[]>([]);
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const inspId = inspection?.id ?? null;

  useEffect(() => {
    if (!inspId || !isLiveConfigured()) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    Promise.allSettled([
      api<InspectionFull>(`/inspections/${inspId}`),
      api<EvidenceItem[]>(`/inspections/${inspId}/evidence`),
      api<DeclarationItem[] | { declarations?: DeclarationItem[] }>(`/inspections/${inspId}/declarations`),
      api<FindingItem[]>(`/inspections/${inspId}/findings`),
    ]).then((res) => {
      if (cancelled) return;
      if (res[0].status === 'fulfilled') setFull(res[0].value);
      if (res[1].status === 'fulfilled') setEvidence(res[1].value ?? []);
      if (res[2].status === 'fulfilled') {
        const v = res[2].value;
        setDeclarations(Array.isArray(v) ? v : v?.declarations ?? []);
      }
      if (res[3].status === 'fulfilled') setFindings(res[3].value ?? []);
      if (res[0].status === 'rejected') setLoadError('Live record unavailable — showing summary.');
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [inspId]);

  const openReport = async () => {
    if (!inspId) return;
    try {
      const r = await api<{ file_url?: string; url?: string }>(`/inspections/${inspId}/report`);
      const url = r?.file_url ?? r?.url;
      if (url) {
        setReportUrl(url);
        window.open(url, '_blank', 'noopener');
      }
    } catch {
      setLoadError('Could not open the report.');
    }
  };

  if (!inspection) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200/80 text-center">
        <p className="text-sm text-slate-500">Select an inspection from the list to view its record.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-xl bg-[#017374] text-white text-xs font-bold">Back to inspections</button>
      </div>
    );
  }

  const detected = declarations.map((d) => ({
    label: d.display_name ?? d.canonical_key,
    value: String(d.final_value ?? d.machine_value ?? '—'),
    conf: d.confidence != null ? Math.round(d.confidence * 100) : null,
    heard: (d.confidence_label ?? '').toUpperCase() !== 'UNDETECTED',
  }));
  const heardCount = detected.filter((d) => d.value !== '—').length;
  const verdict = full?.compliance_result ?? ({ Compliant: 'PASS', Minor: 'REVIEW', Major: 'FAIL', Critical: 'FAIL' } as Record<string, string>)[inspection.compliance] ?? null;
  const decided = !!full?.final_decision;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#017374] hover:border-[#017374] transition-all shadow-2xs group shrink-0"
            title="Back to inspections"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight truncate">{inspection.product.name}</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500 font-mono">
                {inspection.id.slice(0, 8)}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${COMP_STYLE[inspection.compliance] ?? COMP_STYLE.Minor}`}>
                {verdict ?? inspection.compliance}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                {full?.status ?? inspection.status}
              </span>
              {decided && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#017374]/10 border border-[#017374]/30 text-[#017374]">
                  {full?.final_decision?.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {inspection.company.name} · {inspection.officer.name} · {inspection.dateTime}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openReport}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#017374] hover:bg-[#015758] text-white text-xs font-bold shadow-xs transition-all"
            title="View / export the official PDF report"
          >
            <FileText className="w-4 h-4" />
            View / Export Report
          </button>
        </div>
      </div>

      {loadError && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] font-semibold text-amber-800">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {loadError}
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: record info + detections */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-3">
              <Building2 className="w-4 h-4 text-[#017374]" /> Inspection record
            </h2>
            <div className="space-y-2.5 text-xs">
              <InfoRow label="Company" value={inspection.company.name} bold />
              <InfoRow label="Product" value={inspection.product.name} bold />
              <InfoRow label="Officer" value={inspection.officer.name} />
              <InfoRow label="Captured" value={inspection.dateTime} />
              {full?.context_notes && <InfoRow label="Notes" value={full.context_notes} />}
              {full?.submitted_at && <InfoRow label="Submitted" value={new Date(full.submitted_at).toLocaleString()} />}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-1">
              <Scale className="w-4 h-4 text-[#017374]" />
              Label declarations
              <span className="ml-auto text-[10px] font-semibold text-slate-400">{heardCount}/{detected.length} detected</span>
            </h2>
            {loading && (
              <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin text-[#017374]" /> Loading OCR results…
              </div>
            )}
            {!loading && detected.length === 0 && (
              <p className="py-4 text-[11px] text-slate-400">No OCR declarations on record for this inspection.</p>
            )}
            <div className="divide-y divide-slate-100">
              {detected.map((d, i) => (
                <div key={i} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-slate-700 truncate">{d.label}</div>
                    <div className={`text-xs font-bold truncate ${d.value === '—' ? 'text-slate-300' : 'text-slate-900'}`}>{d.value}</div>
                  </div>
                  {d.conf != null && d.value !== '—' && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#E5F0EC] text-[#017374] shrink-0">{d.conf}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle: evidence photos */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-3">
              <Camera className="w-4 h-4 text-[#017374]" />
              Package evidence
              <span className="ml-auto text-[10px] font-semibold text-slate-400">{evidence.length} photo(s)</span>
            </h2>
            {evidence.length === 0 && !loading && (
              <p className="py-4 text-[11px] text-slate-400">No evidence photos stored for this inspection.</p>
            )}
            <div className="space-y-3">
              {evidence.map((ev) => {
                const url = ev.file_url ?? ev.url;
                return (
                  <a key={ev.id} href={url} target="_blank" rel="noopener" className="block group">
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                      {url ? (
                        <img src={url} alt={ev.view_type} className="w-full object-cover max-h-64 group-hover:scale-[1.01] transition-transform" loading="lazy" />
                      ) : (
                        <div className="h-32 flex items-center justify-center text-slate-300 text-[11px]">preview unavailable</div>
                      )}
                      <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-900/70 text-white">
                        {ev.view_type?.replace(/_/g, ' ') ?? 'PHOTO'}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: findings + decision */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-[#017374]" />
              AI findings
              <span className="ml-auto text-[10px] font-semibold text-slate-400">{findings.length}</span>
            </h2>
            {findings.length === 0 && !loading && (
              <p className="py-4 text-[11px] text-slate-400">No rule findings — all label checks passed.</p>
            )}
            <div className="space-y-2.5">
              {findings.map((f) => (
                <div key={f.id} className={`p-3 rounded-xl border text-[11px] ${SEV_STYLE[f.severity] ?? SEV_STYLE.INFO}`}>
                  <div className="font-bold">{f.title}</div>
                  {f.explanation && <div className="mt-1 opacity-90 leading-relaxed">{f.explanation}</div>}
                  {f.legal_reference && (
                    <div className="mt-1.5 text-[10px] font-bold opacity-80">⚖ {f.legal_reference}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-3 mb-3">Official decision</h2>
            {decided ? (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#017374]/10 border border-[#017374]/30 text-xs font-bold text-[#017374]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {full?.final_decision?.replace(/_/g, ' ')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => onApprove(inspection.id)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#017374] hover:bg-[#015758] text-white text-xs font-bold transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve — Compliant
                </button>
                <button
                  onClick={() => onReject(inspection.id)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#E37820] hover:bg-[#c96414] text-white text-xs font-bold transition-all"
                >
                  <XCircle className="w-4 h-4" /> Reject — Non-Compliant
                </button>
                <button
                  onClick={() => onRequestReinspection(inspection.id)}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 transition-all"
                >
                  <RotateCcw className="w-4 h-4" /> Return for re-inspection
                </button>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <User className="w-3.5 h-3.5 shrink-0" />
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Decisions are written to the official audit trail.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string; bold?: boolean }> = ({ label, value, bold }) => (
  <div>
    <div className="text-slate-400 text-[11px]">{label}</div>
    <div className={bold ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}>{value}</div>
  </div>
);
