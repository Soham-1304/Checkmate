import React, { useState } from 'react';
import { X, UserPlus, Check, Loader2, AlertCircle } from 'lucide-react';
import { api } from '../api/client';

interface AddOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AddOfficerModal: React.FC<AddOfficerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [location, setLocation] = useState('District 4, Pune');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Officer@12345');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Officer name and official email are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await api('/users', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          employee_id: employeeId.trim() ? employeeId.trim().toUpperCase() : undefined,
          location: location.trim() || undefined,
          phone: phone.trim() || undefined,
          password: password.trim() || 'Officer@12345',
          role: 'OFFICER',
          is_active: true,
        }),
      });

      onSuccess(`Successfully onboarded Inspector ${name.trim()}.`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create officer account in the database.');
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
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Onboard Field Officer</h3>
              <p className="text-xs text-slate-500">Add Legal Metrology inspecting officer</p>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kulkarni"
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="r.kulkarni@doca.gov.in"
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Badge / Employee ID</label>
              <input
                type="text"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                placeholder="OFF-D4-0109"
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98220 12345"
                className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Jurisdiction / Field Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="District 4, Pune Metro"
              className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Temporary Initial Password</label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs p-3 rounded-xl border border-[#8EC8BA]/60 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30 font-mono text-slate-700"
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
              <span>Create Officer Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
