import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Sparkles, CheckCircle2, ShieldAlert, Loader2, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { api, token, BASE } from '../api/client';

interface NewInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitInspection: (data: any) => void;
}

export const NewInspectionModal: React.FC<NewInspectionModalProps> = ({
  isOpen,
  onClose,
  onSubmitInspection,
}) => {
  const [commodities, setCommodities] = useState<any[]>([]);
  const [selectedCommodityId, setSelectedCommodityId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loadingCommodities, setLoadingCommodities] = useState(false);
  const [stepStatus, setStepStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedResult, setCompletedResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setFilePreview(null);
      setStepStatus(null);
      setError(null);
      setCompletedResult(null);
      return;
    }

    setLoadingCommodities(true);
    api<any>('/commodities')
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.commodities ?? [];
        setCommodities(list);
        if (list.length > 0) {
          setSelectedCommodityId(list[0].id);
        }
      })
      .catch(() => {
        setError('Could not load registered commodities from the server.');
      })
      .finally(() => setLoadingCommodities(false));
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      const url = URL.createObjectURL(f);
      setFilePreview(url);
    }
  };

  const handleRunInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommodityId) {
      setError('Please select a commodity.');
      return;
    }

    setError(null);
    setStepStatus('1/4 Creating inspection session...');

    try {
      // 1. Create inspection
      const insp = await api<any>('/inspections', {
        method: 'POST',
        body: JSON.stringify({ commodity_id: selectedCommodityId }),
      });

      const inspectionId = insp.id;

      // 2. Upload photo if selected
      if (file) {
        setStepStatus('2/4 Uploading packaging photo evidence...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('view_type', 'FRONT_PDP');

        const authToken = token();
        const uploadRes = await fetch(`${BASE}/inspections/${inspectionId}/evidence`, {
          method: 'POST',
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          body: formData,
        });
        if (!uploadRes.ok) {
          const t = await uploadRes.text().catch(() => '');
          throw new Error(`Evidence upload failed (${uploadRes.status}): ${t.slice(0, 100)}`);
        }

        // 3. Analyze Auto
        setStepStatus('3/4 RapidOCR scanning & text extraction...');
        await api(`/inspections/${inspectionId}/analyze-auto?pkg_height_mm=150`, {
          method: 'POST',
        });
      }

      // 4. Evaluate compliance against rules
      setStepStatus('4/4 Evaluating Legal Metrology declarations...');
      const evalRes = await api<any>(`/inspections/${inspectionId}/evaluate`, {
        method: 'POST',
      });

      const chosenComm = commodities.find((c) => c.id === selectedCommodityId);

      setCompletedResult({
        id: inspectionId,
        shortId: inspectionId.slice(0, 8).toUpperCase(),
        productName: chosenComm?.generic_name || 'Packaged Goods',
        brandName: chosenComm?.brand_name || 'Brand',
        verdict: evalRes?.compliance_result ?? 'REVIEW',
        findingsCount: evalRes?.findings?.length ?? 0,
      });

      setStepStatus(null);
    } catch (err: any) {
      setError(err?.message || 'Inspection pipeline failed. Please try again.');
      setStepStatus(null);
    }
  };

  const handleFinish = () => {
    if (completedResult) {
      onSubmitInspection(completedResult);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#8EC8BA]/40 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#8EC8BA]/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">New AI Compliance Inspection</h3>
              <p className="text-xs text-slate-500">Live RapidOCR analysis against Legal Metrology Rules 2011</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-[#E5F0EC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {completedResult ? (
          <div className="p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#017374] flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">Inspection Completed</h4>
              <p className="text-xs text-slate-500 mt-1">
                {completedResult.brandName} • {completedResult.productName} ({completedResult.shortId})
              </p>
            </div>
            <div className="p-4 bg-[#E5F0EC]/50 rounded-2xl border border-[#8EC8BA]/30 text-left space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Compliance Verdict:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-md text-[11px] ${
                    completedResult.verdict === 'PASS'
                      ? 'bg-emerald-100 text-[#017374]'
                      : completedResult.verdict === 'FAIL'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {completedResult.verdict}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Violations Detected:</span>
                <span className="font-bold text-slate-800">{completedResult.findingsCount} findings</span>
              </div>
            </div>
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#017374] hover:bg-[#015758] text-white text-xs font-bold transition-all shadow-sm"
              >
                <span>View Full Record</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRunInspection} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Commodity Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Select Commodity / Target Package <span className="text-rose-500">*</span>
              </label>
              {loadingCommodities ? (
                <div className="text-xs text-slate-400 py-2 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#017374]" /> Loading commodities...
                </div>
              ) : (
                <select
                  value={selectedCommodityId}
                  onChange={(e) => setSelectedCommodityId(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30 font-medium"
                >
                  {commodities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand_name ? `${c.brand_name} · ` : ''}{c.generic_name} {c.barcode ? `(${c.barcode})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Packaging Image Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Packaging Label Photo</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#8EC8BA] hover:border-[#017374] bg-[#E5F0EC]/20 hover:bg-[#E5F0EC]/40 rounded-2xl p-5 text-center cursor-pointer transition-all"
              >
                {filePreview ? (
                  <div className="flex items-center gap-3 justify-center">
                    <img src={filePreview} alt="Packaging Preview" className="w-14 h-14 object-cover rounded-xl shadow-xs" />
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-800 truncate max-w-[200px]">{file?.name}</div>
                      <div className="text-[11px] text-[#017374] font-semibold">Click to change photo</div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-full bg-[#017374]/10 text-[#017374] flex items-center justify-center mx-auto">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-xs font-bold text-slate-800">Upload package label photo</div>
                    <p className="text-[11px] text-slate-400">PNG, JPG or WebP of front PDP or back panel</p>
                  </div>
                )}
              </div>
            </div>

            {/* Running Step Status */}
            {stepStatus && (
              <div className="p-3 bg-[#E5F0EC] border border-[#8EC8BA] rounded-xl flex items-center gap-2.5 text-xs font-semibold text-[#017374]">
                <Loader2 className="w-4 h-4 animate-spin text-[#017374] shrink-0" />
                <span>{stepStatus}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={!!stepStatus}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!!stepStatus || !selectedCommodityId}
                className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-[#017374] hover:bg-[#015758] rounded-xl transition-all shadow-sm disabled:opacity-50"
              >
                {stepStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Run Inspection</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
