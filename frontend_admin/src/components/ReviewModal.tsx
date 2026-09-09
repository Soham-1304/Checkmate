import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { AIAnalysisItem } from '../types';
import { api } from '../api/client';

export type ReviewDecisionValue = 'APPROVED_COMPLIANT' | 'APPROVED_NON_COMPLIANT' | 'RETURNED_FOR_REVIEW';

interface ReviewModalProps {
  item: AIAnalysisItem | null;
  isOpen: boolean;
  onClose: () => void;
  /** Real API decision handler */
  onDecision: (itemId: string, decision: ReviewDecisionValue) => Promise<void> | void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  item,
  isOpen,
  onClose,
  onDecision,
}) => {
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<ReviewDecisionValue | null>(null);
  const [done, setDone] = useState<ReviewDecisionValue | null>(null);

  useEffect(() => {
    if (!isOpen || !item) return;
    let cancelled = false;
    setReportUrl(null);
    setReportError(null);
    setDone(null);
    setReportLoading(true);
    api<{ file_url?: string; url?: string }>(`/inspections/${item.id}/report`)
      .then((r) => {
        if (cancelled) return;
        const url = r?.file_url ?? r?.url ?? null;
        setReportUrl(url);
        if (!url) setReportError('Report URL unavailable.');
      })
      .catch(() => {
        if (!cancelled) setReportError('Could not load the generated report.');
      })
      .finally(() => {
        if (!cancelled) setReportLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const decide = async (decision: ReviewDecisionValue) => {
    setSubmitting(decision);
    try {
      await onDecision(item.id, decision);
      setDone(decision);
      setTimeout(onClose, 900);
    } catch {
      /* toast handled by parent */
    } finally {
      setSubmitting(null);
    }
  };

  const busy = submitting !== null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-5xl w-full h-[92vh] shadow-2xl border border-[#8EC8BA]/40 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#8EC8BA]/30 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 truncate">{item.productName}</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E5F0EC] text-[#017374]">
                  {item.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.status === 'Non-Compliant'
                      ? 'bg-rose-100 text-rose-700'
                      : item.status === 'Compliant'
                      ? 'bg-emerald-100 text-[#017374]'
                      : 'bg-amber-100 text-[#9a6206]'
                  }`}
                >
                  AI: {item.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Official compliance report — review, then record your decision
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {reportUrl && (
              <a
                href={reportUrl}
                target="_blank"
                rel="noopener"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#8EC8BA]/60 text-[#017374] text-[11px] font-bold hover:bg-[#E5F0EC] transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open PDF
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-[#E5F0EC] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report viewer */}
        <div className="flex-1 min-h-0 bg-slate-100 relative">
          {reportLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin text-[#017374]" />
              <span className="text-xs font-semibold">Fetching generated report…</span>
            </div>
          )}
          {!reportLoading && reportError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-slate-500">
              <AlertTriangle className="w-8 h-8 text-[#E37820]" />
              <span className="text-xs font-semibold">{reportError}</span>
            </div>
          )}
          {!reportLoading && reportUrl && (
            <iframe
              src={`${reportUrl}#toolbar=1&view=FitH`}
              title="Compliance report"
              className="w-full h-full border-0"
            />
          )}
        </div>

        {/* Decision footer */}
        <div className="px-6 py-4 border-t border-[#8EC8BA]/30 bg-white flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
            {done ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-[#017374] shrink-0" />
                <span className="font-semibold text-[#017374]">
                  Decision recorded — {done === 'APPROVED_COMPLIANT' ? 'approved as compliant.' : done === 'APPROVED_NON_COMPLIANT' ? 'recorded as non-compliant.' : 'returned for re-inspection.'}
                </span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4 text-[#FEB519] shrink-0" />
                <span className="truncate">
                  Your decision is recorded in the official audit trail and updates the registry instantly.
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => decide('RETURNED_FOR_REVIEW')}
              disabled={busy || !!done}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-40 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Re-inspect
            </button>
            <button
              onClick={() => decide('APPROVED_NON_COMPLIANT')}
              disabled={busy || !!done}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E37820] hover:bg-[#c96414] active:scale-95 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40"
            >
              {submitting === 'APPROVED_NON_COMPLIANT' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
              Non-Compliant
            </button>
            <button
              onClick={() => decide('APPROVED_COMPLIANT')}
              disabled={busy || !!done}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#017374] hover:bg-[#015758] active:scale-95 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-40"
            >
              {submitting === 'APPROVED_COMPLIANT' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Compliant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
