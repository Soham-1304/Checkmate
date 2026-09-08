import React, { useState } from 'react';
import { X, Upload, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

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
  const [productName, setProductName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [category, setCategory] = useState('Packaged Food & Dairy');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  if (!isOpen) return null;

  const handleStartAIScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName) return;

    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        confidence: 96,
        verdict: 'Non-Compliant',
        issue: 'Mandatory Unit Sale Price (USP) font height is below 2.5mm standard',
      });
    }, 1200);
  };

  const handleSave = () => {
    onSubmitInspection({
      productName,
      companyName: companyName || 'Verified Manufacturer',
      category,
      scanResult,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#8EC8BA]/40 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#8EC8BA]/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E37820]/15 text-[#E37820] flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">New AI Compliance Inspection</h3>
              <p className="text-xs text-slate-500">Scan packaging for Legal Metrology violations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-[#E5F0EC]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleStartAIScan} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Britannia Bourbon 150g"
              className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Company / Brand</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Britannia Industries"
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
              >
                <option>Packaged Food & Dairy</option>
                <option>Edible Oils & Fats</option>
                <option>Spices & Condiments</option>
                <option>Personal Care & Cosmetics</option>
                <option>Stationery & Goods</option>
              </select>
            </div>
          </div>

          {/* Upload Box */}
          <div className="border-2 border-dashed border-[#8EC8BA]/60 rounded-2xl p-6 text-center bg-[#E5F0EC]/40 hover:bg-[#E5F0EC] transition-colors cursor-pointer">
            <Upload className="w-8 h-8 text-[#017374] mx-auto mb-2" />
            <div className="text-xs font-bold text-slate-700">Upload Product Label / Packaging Image</div>
            <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, WEBP up to 10MB</p>
          </div>

          {/* AI Scan Status */}
          {isScanning && (
            <div className="p-4 rounded-xl bg-[#E5F0EC] border border-[#8EC8BA] flex items-center gap-3 text-xs text-[#017374] font-bold animate-pulse">
              <Sparkles className="w-4 h-4 animate-spin text-[#017374]" />
              <span>AI analyzing OCR text, font heights, MRP, and net quantity compliance...</span>
            </div>
          )}

          {scanResult && (
            <div className="p-4 rounded-xl bg-[#E37820]/10 border border-[#E37820]/30 text-xs text-slate-800 space-y-1">
              <div className="flex items-center gap-2 font-bold text-[#E37820]">
                <ShieldAlert className="w-4 h-4 text-[#E37820]" />
                <span>Verdict: {scanResult.verdict} ({scanResult.confidence}% confidence)</span>
              </div>
              <p className="text-[11px] text-slate-600">{scanResult.issue}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            {!scanResult ? (
              <button
                type="submit"
                disabled={isScanning || !productName}
                className="flex items-center gap-1.5 bg-[#E37820] hover:bg-[#c96414] disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <Sparkles className="w-4 h-4" />
                <span>Run AI Analysis</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 bg-[#017374] hover:bg-[#015758] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit to Inspection Queue</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
