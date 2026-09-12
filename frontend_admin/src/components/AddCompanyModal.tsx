import React, { useState } from 'react';
import { X, Building2, Check, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

interface AddCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AddCompanyModal: React.FC<AddCompanyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [legalName, setLegalName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [type, setType] = useState<'MANUFACTURER' | 'PACKER' | 'IMPORTER'>('MANUFACTURER');
  const [gstin, setGstin] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!legalName.trim()) {
      setError('Legal company name is required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api('/entities', {
        method: 'POST',
        body: JSON.stringify({
          legal_name: legalName.trim(),
          trade_name: tradeName.trim() || undefined,
          type,
          gstin: gstin.trim() ? gstin.trim().toUpperCase() : undefined,
          state: state.trim() || 'Maharashtra',
          address: address.trim() || undefined,
          is_active: true,
        }),
      });

      onSuccess(`Successfully added "${legalName.trim()}" to Legal Metrology Registry.`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create business entity in the database.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#8EC8BA]/40 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#8EC8BA]/30 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Onboard Business Entity</h3>
              <p className="text-xs text-slate-500">Add manufacturer, packer or importer to registry</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Legal Registered Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              placeholder="e.g. Parle Products Private Limited"
              className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Trade / Brand Name</label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                placeholder="e.g. Parle-G"
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Entity Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30 font-medium"
              >
                <option value="MANUFACTURER">Manufacturer</option>
                <option value="PACKER">Packer</option>
                <option value="IMPORTER">Importer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={(e) => setGstin(e.target.value)}
                placeholder="27AAACP1234F1Z5"
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">State / Jurisdiction</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra"
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Factory / Operating Address</label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Plot No. 42, MIDC Industrial Area, Pune 411018"
              className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#017374] hover:bg-[#015758] rounded-xl transition-all shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>Register Company</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
