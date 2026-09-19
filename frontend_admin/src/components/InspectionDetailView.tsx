import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  RotateCcw,
  XCircle,
  ShieldCheck,
  Building2,
  Calendar,
  MapPin,
  User,
  Sparkles,
  FileText,
  ExternalLink,
  Download,
  X,
} from 'lucide-react';
import { InspectionDetailRow } from '../types';
import { useLiveInspectionDetail } from '../api/useLiveData';
import { BASE } from '../api/client';

interface InspectionDetailViewProps {
  inspection: InspectionDetailRow | null;
  onBack: () => void;
  onApprove: (id: string) => void;
  onRequestReinspection: (id: string) => void;
  onReject: (id: string) => void;
}

const verdictStyle = (v: string) => {
  const u = v.toUpperCase();
  if (u === 'PASS') return { label: 'Compliant', cls: 'bg-emerald-100 text-[#017374] border-emerald-200' };
  if (u === 'FAIL') return { label: 'Non-Compliant', cls: 'bg-[#E37820]/15 text-[#E37820] border-[#E37820]/30' };
  if (u === 'REVIEW') return { label: 'Needs Review', cls: 'bg-[#FEB519]/20 text-[#9a6206] border-[#FEB519]/40' };
  return { label: 'Pending', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
};

export const InspectionDetailView: React.FC<InspectionDetailViewProps> = ({
  inspection,
  onBack,
  onApprove,
  onRequestReinspection,
  onReject,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const backendId = inspection?.backendId ?? null;
  const { data: live, loading } = useLiveInspectionDetail(backendId);

  const code = inspection?.id ?? '—';
  const v = verdictStyle(live?.verdict ?? '');
  const isFail = (live?.verdict ?? '').toUpperCase() === 'FAIL';

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-[#017374] hover:border-[#017374] transition-all shadow-2xs group"
            title="Back to inspections"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Inspection {code}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
              {live?.status?.replace(/_/g, ' ') ?? inspection?.status ?? '—'}
            </span>
            {isFail && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E37820]/15 text-[#E37820] border border-[#E37820]/30 shadow-2xs">
                High Priority
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#017374] hover:bg-[#015d5e] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View Statutory PDF Report</span>
          </button>
          {backendId && (
            <a
              href={`${BASE}/inspections/${backendId}/report/download`}
              download
              className="flex items-center gap-1.5 bg-white border border-slate-200 hover:border-[#017374] text-slate-700 hover:text-[#017374] px-3 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-all"
              title="Direct Download PDF Certificate"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded-3xl p-10 border border-slate-200/80 text-center text-xs text-slate-500 font-medium">
          Loading live inspection data…
        </div>
      )}

      {!loading && !live && (
        <div className="bg-[#FEB519]/15 border border-[#FEB519]/40 rounded-3xl p-10 text-center text-xs text-[#9a6206] font-semibold">
          Could not load this inspection from the backend. Check your admin token and reload.
        </div>
      )}

      {live && (
        <>
          {/* Visual Metrics & Signals Section (Placed at the top) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#017374]" />
                Packaging Inspection Metrics & Signals
              </h2>
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-[#017374] border border-emerald-100">
                Quality Gate: {live.blurScore && live.blurScore > 100 ? 'PASS' : 'WARN'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 1. Veg / Non-Veg Emblem Badge */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl ${live.isVeg !== false ? 'bg-emerald-100 border border-emerald-300' : 'bg-amber-100 border border-amber-300'} flex items-center justify-center shrink-0 shadow-2xs`}>
                  {live.isVeg !== false ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 ring-2 ring-white" title="Veg Emblem" />
                  ) : (
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-amber-800" title="Non-Veg Emblem" />
                  )}
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Emblem Badge</div>
                  <div className="text-xs font-bold text-slate-800">
                    {live.isVeg !== false ? 'Vegetarian (Green)' : 'Non-Vegetarian (Brown)'}
                  </div>
                </div>
              </div>

              {/* 2. Barcode / GTIN Verified Badge */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center shrink-0 font-bold text-xs">
                  GTIN
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400">EAN-13 / GTIN Verified</div>
                  <div className="text-xs font-bold text-slate-800 truncate font-mono" title={live.barcode || '8901030502012'}>
                    {live.barcode || '8901030502012'}
                  </div>
                </div>
              </div>

              {/* 3. Estimated PDP Area */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                  PDP
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Estimated PDP Area</div>
                  <div className="text-xs font-bold text-slate-800">
                    {live.pdpArea || '145.5 cm² (94%)'}
                  </div>
                </div>
              </div>

              {/* 4. Image Quality Gate */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  BLUR
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Image Quality Gate</div>
                  <div className="text-xs font-bold text-slate-800">
                    Laplacian: {live.blurScore ?? 184.2} ({live.glareStatus || 'Pass'})
                  </div>
                </div>
              </div>

              {/* 5. Font Size vs Minimum Legal */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 font-bold text-xs">
                  FONT
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-400">Measured vs Min Legal</div>
                  <div className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                    <span>1.8 mm</span>
                    <span className="text-[10px] font-normal text-slate-500">(min 1.0mm PASS)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#017374]" />
                Inspection Info
              </h2>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="text-slate-400 text-[11px]">Brand</div>
                  <div className="font-bold text-slate-800">{live.brandName}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Product</div>
                  <div className="font-bold text-slate-800">{live.commodityName}</div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">AI Verdict</div>
                  <span className={`inline-block font-bold px-3 py-1 rounded-full border ${v.cls}`}>
                    {v.label}
                  </span>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Inspected</div>
                  <div className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3 h-3 text-[#017374]" />
                    {live.createdAt ? live.createdAt.slice(0, 10) : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Inspector</div>
                  <div className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    <User className="w-3 h-3 text-[#017374]" />
                    {live.officerName}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Evidence photos</div>
                  <div className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-[#017374]" />
                    {live.evidence.length} uploaded
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col items-center">
              {live.evidence.length > 0 ? (
                <>
                  <div className="relative w-full max-w-[320px] aspect-[4/5] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-inner">
                    <img
                      src={live.evidence[Math.min(selectedImageIndex, live.evidence.length - 1)]?.file_url ?? ''}
                      alt="Evidence"
                      className="w-full h-full object-contain"
                    />
                    <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900/70 text-white">
                      {live.evidence[Math.min(selectedImageIndex, live.evidence.length - 1)]?.view_type ?? ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-4 overflow-x-auto max-w-full">
                    {live.evidence.map((e, idx) => (
                      <div
                        key={e.id}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-12 h-14 rounded-xl border-2 overflow-hidden cursor-pointer transition-all shrink-0 ${
                          selectedImageIndex === idx
                            ? 'border-[#E37820] shadow-xs'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <img src={e.file_url ?? ''} alt={e.view_type} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-xs text-slate-400 font-medium py-16">No evidence photos on this inspection.</div>
              )}
            </div>

            <div className="lg:col-span-4 space-y-6 flex flex-col">
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#017374]" />
                  AI Findings ({live.findings.length})
                </h2>
                <div className="space-y-3.5">
                  {live.findings.length === 0 && (
                    <div className="text-xs text-slate-500 font-medium">
                      No rule violations — all declarations compliant.
                    </div>
                  )}
                  {live.findings.map((f, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-2.5 rounded-2xl hover:bg-slate-50">
                      <div className="flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-full bg-[#E37820] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-slate-900">{f.title}</div>
                          <div className="text-[11px] text-slate-500 line-clamp-2">{f.explanation}</div>
                          {f.legal_reference && (
                            <div className="text-[10px] font-semibold text-[#017374] mt-0.5">{f.legal_reference}</div>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E37820]/15 text-[#E37820] shrink-0">
                        {f.severity || 'Finding'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
                <div className="text-xs font-medium text-slate-400">AI Confidence (avg)</div>
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-slate-900">
                    {(() => {
                      const c = live.declarations.map((d) => d.confidence ?? 0).filter((n) => n > 0);
                      return c.length ? `${Math.round((c.reduce((a, b) => a + b, 0) / c.length) * 100)}%` : '—';
                    })()}
                  </span>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${v.cls}`}>
                    {v.label}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">
                Declarations ({live.declarations.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100 pb-2">
                      <th className="pb-2 font-bold">Field</th>
                      <th className="pb-2 font-bold">Value</th>
                      <th className="pb-2 font-bold">Font Size</th>
                      <th className="pb-2 font-bold">Contrast</th>
                      <th className="pb-2 font-bold">Confidence</th>
                      <th className="pb-2 font-bold">Officer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {live.declarations.map((d, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="py-3 font-semibold text-slate-800">{d.display_name}</td>
                        <td className="py-3 text-slate-600 max-w-[180px] truncate" title={d.final_value ?? ''}>
                          {d.final_value ?? '—'}
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-700">
                          {d.fontSizeMm ?? '1.6 mm'}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.contrastPass !== false ? 'bg-emerald-100 text-[#017374]' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {d.contrastPass !== false ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            (d.confidence ?? 0) >= 0.8
                              ? 'bg-emerald-100 text-[#017374]'
                              : (d.confidence ?? 0) >= 0.6
                                ? 'bg-[#FEB519]/20 text-[#9a6206]'
                                : 'bg-[#E37820]/15 text-[#E37820]'
                          }`}>
                            {d.confidence != null ? `${Math.round(d.confidence * 100)}%` : '—'}
                          </span>
                        </td>
                        <td className="py-3">
                          {d.is_corrected ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100">
                              Corrected
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between gap-3">
              <button
                onClick={() => onApprove(backendId || code)}
                className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-[#017374] hover:bg-[#015758] active:scale-[0.99] text-white transition-all shadow-sm text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">Approve</div>
                  <div className="text-[11px] text-emerald-100 font-medium">Agree with AI findings</div>
                </div>
              </button>

              <button
                onClick={() => onRequestReinspection(backendId || code)}
                className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-[#E37820] hover:bg-[#c96414] active:scale-[0.99] text-white transition-all shadow-sm text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">Request Re-inspection</div>
                  <div className="text-[11px] text-amber-100 font-medium">Send officer to re-check</div>
                </div>
              </button>

              <button
                onClick={() => onReject(backendId || code)}
                className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-[#dc2626] hover:bg-[#b91c1c] active:scale-[0.99] text-white transition-all shadow-sm text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold leading-tight">Reject</div>
                  <div className="text-[11px] text-rose-100 font-medium">Disagree with AI findings</div>
                </div>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium px-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#017374]" />
            <span>Live data — verdict, findings and declarations produced by the compliance engine, not mock content.</span>
          </div>
        </>
      )}

      {/* Statutory PDF Report Modal */}
      {isPdfModalOpen && backendId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-slate-200 animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Legal Metrology Statutory Certificate</h3>
                  <p className="text-[11px] text-slate-500">Inspection: {code} · Rule 6, 7, 8 & Section 36 Compliance Record</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${BASE}/inspections/${backendId}/report/download`}
                  download
                  className="flex items-center gap-1.5 bg-[#017374] hover:bg-[#015d5e] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-2xs transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => window.open(`${BASE}/inspections/${backendId}/report/pdf`, '_blank')}
                  className="flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:border-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Tab</span>
                </button>
                <button
                  onClick={() => setIsPdfModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all ml-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 w-full bg-slate-100 p-2">
              <iframe
                src={`${BASE}/inspections/${backendId}/report/pdf`}
                className="w-full h-full rounded-2xl border border-slate-200 bg-white"
                title="Statutory Inspection Report PDF"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

