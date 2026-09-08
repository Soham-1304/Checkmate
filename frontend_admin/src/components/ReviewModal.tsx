import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { AIAnalysisItem } from '../types';

interface ReviewModalProps {
  item: AIAnalysisItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDecision: (itemId: string, decision: 'approved' | 'flagged') => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  item,
  isOpen,
  onClose,
  onDecision,
}) => {
  const [officerNotes, setOfficerNotes] = useState('');
  const [actionDone, setActionDone] = useState<string | null>(null);

  if (!isOpen || !item) return null;

  const handleApprove = () => {
    setActionDone('approved');
    setTimeout(() => {
      onDecision(item.id, 'approved');
      setActionDone(null);
      onClose();
    }, 600);
  };

  const handleFlag = () => {
    setActionDone('flagged');
    setTimeout(() => {
      onDecision(item.id, 'flagged');
      setActionDone(null);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#8EC8BA]/40 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#8EC8BA]/30 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-lg">{item.productName}</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#E5F0EC] text-[#017374]">
                  {item.code}
                </span>
              </div>
              <p className="text-xs text-slate-500">Legal Metrology AI Compliance Verification</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-[#E5F0EC] transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* AI Confidence & Status Banner */}
          <div
            className={`p-4 rounded-2xl flex items-center justify-between border ${
              item.status === 'Non-Compliant'
                ? 'bg-[#E37820]/10 border-[#E37820]/30 text-[#E37820]'
                : item.status === 'Compliant'
                ? 'bg-[#017374]/10 border-[#017374]/30 text-[#017374]'
                : 'bg-[#FEB519]/15 border-[#FEB519]/40 text-[#9a6206]'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.status === 'Non-Compliant' ? (
                <ShieldAlert className="w-6 h-6 text-[#E37820] shrink-0" />
              ) : item.status === 'Compliant' ? (
                <ShieldCheck className="w-6 h-6 text-[#017374] shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-[#FEB519] shrink-0" />
              )}
              <div>
                <div className="text-sm font-bold flex items-center gap-2 text-slate-900">
                  AI Verdict: {item.status}
                  <span className="text-xs font-normal text-slate-500">
                    ({item.confidence}% Model Confidence)
                  </span>
                </div>
                <div className="text-xs font-medium text-slate-700">Primary reason: {item.reason}</div>
              </div>
            </div>
          </div>

          {/* Package Details & OCR Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Extracted Specifications */}
            <div className="bg-[#E5F0EC]/40 p-4 rounded-2xl border border-[#8EC8BA]/40 space-y-3">
              <h4 className="text-xs font-bold text-[#017374] uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#017374]" />
                Extracted Package Metadata
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Manufacturer: </span>
                  <span className="font-semibold text-slate-800">
                    {item.details?.manufacturer || 'Declared on package'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Declared MRP: </span>
                  <span className="font-semibold text-slate-800">{item.details?.mrp || '₹--'}</span>
                </div>
                <div>
                  <span className="text-slate-400">Net Quantity: </span>
                  <span className="font-semibold text-slate-800">
                    {item.details?.netWeight || '1 unit'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Shelf Life: </span>
                  <span className="font-semibold text-slate-800">
                    {item.details?.shelfLife || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Detected Violations / Observations */}
            <div className="bg-[#E5F0EC]/40 p-4 rounded-2xl border border-[#8EC8BA]/40 space-y-3">
              <h4 className="text-xs font-bold text-[#E37820] uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-[#E37820]" />
                AI Observations & Rules
              </h4>
              <ul className="space-y-2 text-xs text-slate-700">
                {item.details?.detectedIssues?.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E37820] mt-1.5 shrink-0" />
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
              {item.details?.rulesViolated && item.details.rulesViolated.length > 0 && (
                <div className="pt-2 border-t border-[#8EC8BA]/40">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    Applicable Acts & Rules:
                  </span>
                  {item.details.rulesViolated.map((rule, idx) => (
                    <div
                      key={idx}
                      className="text-[11px] font-medium text-[#017374] flex items-center gap-1 mt-1"
                    >
                      <ExternalLink className="w-3 h-3 text-[#017374]" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Inspector Decision Notes */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">
              Inspector Verification Remarks & Order:
            </label>
            <textarea
              rows={3}
              value={officerNotes}
              onChange={(e) => setOfficerNotes(e.target.value)}
              placeholder="Enter remarks for official record or notice issuance..."
              className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#8EC8BA]/30 flex items-center justify-between bg-[#E5F0EC]/50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleFlag}
              disabled={actionDone !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#E37820] hover:bg-[#c96414] active:scale-95 text-white text-xs font-bold transition-all shadow-xs"
            >
              <XCircle className="w-4 h-4" />
              <span>Flag Violation & Issue Notice</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={actionDone !== null}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#017374] hover:bg-[#015758] active:scale-95 text-white text-xs font-bold transition-all shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Compliance</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
