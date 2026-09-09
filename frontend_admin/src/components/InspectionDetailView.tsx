import React, { useState } from 'react';
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
  Sparkles,
  FileText,
} from 'lucide-react';
import { InspectionDetailRow } from '../data/inspectionsData';
import { api } from '../api/client';

interface InspectionDetailViewProps {
  inspection: InspectionDetailRow | null;
  onBack: () => void;
  onApprove: (id: string) => void;
  onRequestReinspection: (id: string) => void;
  onReject: (id: string) => void;
}

export const InspectionDetailView: React.FC<InspectionDetailViewProps> = ({
  inspection,
  onBack,
  onApprove,
  onRequestReinspection,
  onReject,
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(2);
  const [activePin, setActivePin] = useState<number | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const openReport = async () => {
    if (!inspection) return;
    setReportLoading(true);
    setReportError(null);
    try {
      const report = await api<{ file_url?: string; url?: string }>(
        `/inspections/${inspection.id}/report`,
      );
      const url = report?.file_url ?? report?.url;
      if (url) {
        window.open(url, '_blank', 'noopener');
      } else {
        setReportError('Report URL unavailable');
      }
    } catch {
      setReportError('Could not load report');
    } finally {
      setReportLoading(false);
    }
  };

  // Default to LM-2024-0821 / Aaradhya Besan data if none passed or customized
  const inspectionCode = inspection ? inspection.id : 'LM-2024-0821';
  const productName = inspection ? inspection.product.name : 'Besan 1kg';
  const companyName = inspection ? inspection.company.name : 'Aaradhya Foods Pvt. Ltd.';

  const isAaradhya = !inspection || inspection.id === 'INS-2847' || inspection.id === 'LM-2024-0821';

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Bar with Back Button, Title, and Status Badges */}
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
              Inspection {inspectionCode.startsWith('INS') ? `LM-2024-${inspectionCode.slice(4)}` : inspectionCode}
            </h1>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600 shadow-2xs">
              AI Review
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#E37820]/15 text-[#E37820] border border-[#E37820]/30 shadow-2xs">
              High Priority
            </span>
          </div>
          <button
            onClick={openReport}
            disabled={reportLoading || !inspection}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#017374] text-white text-xs font-bold shadow-sm hover:bg-[#015c5d] disabled:opacity-50 transition-all"
            title="Open the compliance PDF report (view + export)"
          >
            <FileText className="w-4 h-4" />
            {reportLoading ? 'Preparing…' : 'View / Export Report'}
          </button>
          {reportError && (
            <span className="text-[11px] text-rose-600 font-semibold">{reportError}</span>
          )}
        </div>
      </div>

      {/* Main Grid: Info + Visualizer + AI Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card: Inspection Info */}
        <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#017374]" />
            Inspection Info
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-slate-400 text-[11px]">Company</div>
              <div className="font-bold text-slate-800">{companyName}</div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Product</div>
              <div className="font-bold text-slate-800">{productName}</div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Category</div>
              <div className="font-semibold text-slate-700">Flour & Pulses</div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Pack Size</div>
              <div className="font-semibold text-slate-700">1 kg</div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">MRP</div>
              <div className="font-bold text-slate-900">₹ 60.00</div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Batch No.</div>
              <div className="font-mono text-slate-700">BF24052001</div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-slate-400 text-[11px]">Mfg. Date</div>
                <div className="font-semibold text-slate-700">10 May 2024</div>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Exp. Date</div>
                <div className="font-semibold text-slate-700">10 Nov 2024</div>
              </div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">FSSAI Lic. No.</div>
              <div className="font-mono text-[11px] text-slate-700">10012022000459</div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Location</div>
              <div className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#017374]" />
                Jaipur, Rajasthan
              </div>
            </div>

            <div>
              <div className="text-slate-400 text-[11px]">Inspector</div>
              <div className="font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3 text-[#017374]" />
                R. Sharma
              </div>
            </div>
          </div>
        </div>

        {/* Center Card: Packaging Visualizer with Bounding Boxes & Pins */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between items-center relative">
          {/* Packaging Box Visualizer */}
          <div className="relative w-full max-w-[320px] aspect-[4/5] bg-[#fffaf0] rounded-2xl border border-amber-200/60 flex items-center justify-center p-4 overflow-hidden shadow-inner group">
            {/* Realistic Besan Packaging Render */}
            <div className="w-full h-full relative flex flex-col items-center justify-between p-3 rounded-xl bg-gradient-to-b from-[#fef3c7] via-[#fde68a] to-[#fcd34d] border border-amber-300 shadow-md select-none">
              {/* Top seal crimp */}
              <div className="w-full h-3 bg-amber-400/80 rounded-t flex items-center justify-center gap-1 opacity-70">
                <div className="w-full h-0.5 border-b border-dashed border-amber-600" />
              </div>

              {/* Veg Logo Pin at top right */}
              <div className="absolute top-5 right-4">
                <div className="w-4 h-4 border border-emerald-700 p-0.5 flex items-center justify-center bg-white rounded-xs">
                  <div className="w-2 h-2 rounded-full bg-emerald-700" />
                </div>
              </div>

              {/* Brand Oval Badge */}
              <div className="mt-2 bg-[#b91c1c] text-white px-5 py-1.5 rounded-full shadow-sm border border-red-800 flex items-center justify-center">
                <span className="font-serif font-black text-sm tracking-wide">Aaradhya</span>
              </div>

              {/* Product Big Title */}
              <div className="text-center my-auto">
                <h3 className="text-2xl font-black text-amber-950 tracking-wider font-sans">
                  BESAN
                </h3>
                <div className="text-[11px] font-bold text-amber-900 tracking-tight">
                  100% Chana Dal
                </div>
              </div>

              {/* Besan / Gram Flour bowl illustration */}
              <div className="w-24 h-12 relative bg-amber-200/80 rounded-full border border-amber-400 flex items-center justify-center overflow-hidden my-1">
                <div className="w-20 h-8 bg-amber-300 rounded-full blur-[1px]" />
                <span className="text-[9px] font-bold text-amber-900 relative">Freshly Ground</span>
              </div>

              {/* Net Weight Declaration */}
              <div className="w-full text-center pb-2">
                <span className="text-xs font-black text-amber-950">Net Weight: 1 kg</span>
              </div>

              {/* Bottom seal crimp */}
              <div className="w-full h-3 bg-amber-400/80 rounded-b flex items-center justify-center opacity-70">
                <div className="w-full h-0.5 border-t border-dashed border-amber-600" />
              </div>

              {/* AI INTERACTIVE BOUNDING BOX PINS */}
              {/* Pin 1: MRP Declaration (Top Left) */}
              <div
                onClick={() => setActivePin(1)}
                className={`absolute top-16 left-3 cursor-pointer transition-all transform hover:scale-110 ${
                  activePin === 1 ? 'scale-125 z-20' : 'z-10'
                }`}
                title="Pin 1: MRP Declaration (Font size below minimum)"
              >
                <div className="w-6 h-6 rounded-full bg-[#E37820] text-white font-black text-xs flex items-center justify-center shadow-md ring-2 ring-white animate-pulse">
                  1
                </div>
                {/* Visual Bounding Box */}
                <div className="absolute top-6 left-0 w-24 h-10 border-2 border-dashed border-[#E37820] bg-[#E37820]/10 rounded-md pointer-events-none" />
              </div>

              {/* Pin 2: Net Quantity (Bottom Left) */}
              <div
                onClick={() => setActivePin(2)}
                className={`absolute bottom-6 left-3 cursor-pointer transition-all transform hover:scale-110 ${
                  activePin === 2 ? 'scale-125 z-20' : 'z-10'
                }`}
                title="Pin 2: Net Quantity (Correct)"
              >
                <div className="w-6 h-6 rounded-md bg-[#017374] text-white font-black text-xs flex items-center justify-center shadow-md ring-2 ring-white">
                  2
                </div>
                <div className="absolute bottom-0 left-6 w-28 h-8 border-2 border-dashed border-[#017374] bg-[#017374]/10 rounded-md pointer-events-none" />
              </div>

              {/* Pin 3: Ingredients Declaration (Center Right) */}
              <div
                onClick={() => setActivePin(3)}
                className={`absolute top-1/2 -translate-y-1/2 right-3 cursor-pointer transition-all transform hover:scale-110 ${
                  activePin === 3 ? 'scale-125 z-20' : 'z-10'
                }`}
                title="Pin 3: Ingredients Declaration (Missing allergen info)"
              >
                <div className="w-6 h-6 rounded-full bg-[#FEB519] text-white font-black text-xs flex items-center justify-center shadow-md ring-2 ring-white">
                  3
                </div>
              </div>

              {/* Pin 4: FSSAI License Format (Top Right) */}
              <div
                onClick={() => setActivePin(4)}
                className={`absolute top-12 right-3 cursor-pointer transition-all transform hover:scale-110 ${
                  activePin === 4 ? 'scale-125 z-20' : 'z-10'
                }`}
                title="Pin 4: FSSAI License Format (License no. not on same line)"
              >
                <div className="w-6 h-6 rounded-full bg-[#E37820] text-white font-black text-xs flex items-center justify-center shadow-md ring-2 ring-white">
                  4
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="flex items-center gap-2 pt-4 overflow-x-auto max-w-full">
            {[0, 1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center p-1 cursor-pointer transition-all ${
                  selectedImageIndex === idx
                    ? 'border-[#E37820] bg-amber-50 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-full h-full rounded bg-amber-100/70 flex items-center justify-center text-[9px] font-bold text-amber-900 text-center leading-tight">
                  {idx === 0 ? 'Front' : idx === 1 ? 'Back' : idx === 2 ? 'Label' : idx === 3 ? 'Batch' : 'MRP'}
                </div>
              </div>
            ))}
            <div className="w-10 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">
              +2
            </div>
          </div>
        </div>

        {/* Right Cards: AI Findings + AI Confidence */}
        <div className="lg:col-span-4 space-y-6 flex flex-col justify-between">
          {/* AI Findings (4) Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#017374]" />
                AI Findings (4)
              </span>
            </h2>

            <div className="space-y-3.5">
              {/* Item 1 */}
              <div
                onClick={() => setActivePin(1)}
                className={`flex items-start justify-between gap-3 p-2.5 rounded-2xl transition-colors cursor-pointer ${
                  activePin === 1 ? 'bg-amber-50/80 border border-amber-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#E37820] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">MRP Declaration</div>
                    <div className="text-[11px] text-slate-500">Font size below minimum</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E37820]/15 text-[#E37820] shrink-0">
                  High
                </span>
              </div>

              {/* Item 2 */}
              <div
                onClick={() => setActivePin(2)}
                className={`flex items-start justify-between gap-3 p-2.5 rounded-2xl transition-colors cursor-pointer ${
                  activePin === 2 ? 'bg-emerald-50/80 border border-emerald-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-[#017374] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Net Quantity</div>
                    <div className="text-[11px] text-slate-500">Correct</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#017374] shrink-0">
                  Low
                </span>
              </div>

              {/* Item 3 */}
              <div
                onClick={() => setActivePin(3)}
                className={`flex items-start justify-between gap-3 p-2.5 rounded-2xl transition-colors cursor-pointer ${
                  activePin === 3 ? 'bg-amber-50/80 border border-amber-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#FEB519] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Ingredients Declaration</div>
                    <div className="text-[11px] text-slate-500">Missing allergen info</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEB519]/25 text-[#9a6206] shrink-0">
                  Medium
                </span>
              </div>

              {/* Item 4 */}
              <div
                onClick={() => setActivePin(4)}
                className={`flex items-start justify-between gap-3 p-2.5 rounded-2xl transition-colors cursor-pointer ${
                  activePin === 4 ? 'bg-amber-50/80 border border-amber-200' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#E37820] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">FSSAI License Format</div>
                    <div className="text-[11px] text-slate-500">License no. not on same line</div>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E37820]/15 text-[#E37820] shrink-0">
                  High
                </span>
              </div>
            </div>
          </div>

          {/* AI Confidence & Verdict Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-3">
            <div className="text-xs font-medium text-slate-400">AI Confidence</div>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-black text-slate-900">94%</span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-100 text-[#017374]">
                High Confidence
              </span>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="text-[11px] text-slate-400 mb-1">AI Decision</div>
              <span className="inline-block text-xs font-bold px-3 py-1 rounded-full bg-[#E37820]/15 text-[#E37820] border border-[#E37820]/30">
                Non-Compliant
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Decision Comparison Table + Action CTA Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Decision Comparison Table */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Decision Comparison</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100 pb-2">
                  <th className="pb-2 font-bold">Check Name</th>
                  <th className="pb-2 font-bold">AI Decision</th>
                  <th className="pb-2 font-bold">Officer Decision</th>
                  <th className="pb-2 font-bold">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 font-semibold text-slate-800">MRP Declaration</td>
                  <td className="py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E37820]/15 text-[#E37820]">
                      Violation
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEB519]/20 text-[#9a6206]">
                      Pending
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">Font size below minimum required</td>
                </tr>

                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 font-semibold text-slate-800">Net Quantity</td>
                  <td className="py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#017374]">
                      Compliant
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEB519]/20 text-[#9a6206]">
                      Pending
                    </span>
                  </td>
                  <td className="py-3 text-slate-400">-</td>
                </tr>

                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 font-semibold text-slate-800">Ingredients Declaration</td>
                  <td className="py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E37820]/15 text-[#E37820]">
                      Violation
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEB519]/20 text-[#9a6206]">
                      Pending
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">Allergen 'Oats' missing</td>
                </tr>

                <tr className="hover:bg-slate-50/60">
                  <td className="py-3 font-semibold text-slate-800">FSSAI License Format</td>
                  <td className="py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E37820]/15 text-[#E37820]">
                      Violation
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEB519]/20 text-[#9a6206]">
                      Pending
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">License number not on same line</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: 3 Action Decision Buttons */}
        <div className="lg:col-span-4 flex flex-col justify-between gap-3">
          {/* 1. Approve */}
          <button
            onClick={() => onApprove(inspectionCode)}
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

          {/* 2. Request Re-inspection */}
          <button
            onClick={() => onRequestReinspection(inspectionCode)}
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

          {/* 3. Reject */}
          <button
            onClick={() => onReject(inspectionCode)}
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
    </div>
  );
};
