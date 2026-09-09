import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, AlertCircle, Loader2, Package, UserCheck, ShieldAlert, FileText } from 'lucide-react';
import { createAssignmentApi, fetchCommoditiesApi, fetchUsersApi } from '../api/client';

interface AssignCommodityModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedOfficerId?: string;
  onSuccess: (message: string) => void;
}

export const AssignCommodityModal: React.FC<AssignCommodityModalProps> = ({
  isOpen,
  onClose,
  preselectedOfficerId,
  onSuccess,
}) => {
  const [officers, setOfficers] = useState<{ id: string; name: string; employee_id?: string }[]>([]);
  const [commodities, setCommodities] = useState<{ id: string; generic_name: string; brand_name?: string; category: string }[]>([]);
  const [selectedOfficer, setSelectedOfficer] = useState('');
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'STANDARD' | 'URGENT' | 'HIGH_RISK'>('STANDARD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Set default due date to 7 days in the future
    const d = new Date();
    d.setDate(d.getDate() + 7);
    setDueDate(d.toISOString().split('T')[0]);

    if (preselectedOfficerId) {
      setSelectedOfficer(preselectedOfficerId);
    }

    setLoadingData(true);
    setError(null);

    Promise.all([fetchUsersApi(), fetchCommoditiesApi()])
      .then(([users, comms]) => {
        const officerUsers = (Array.isArray(users) ? users : users?.users ?? []).filter(
          (u: any) => u.role === 'OFFICER' || u.role?.name === 'OFFICER'
        );
        setOfficers(officerUsers);
        if (!preselectedOfficerId && officerUsers.length > 0) {
          setSelectedOfficer(officerUsers[0].id);
        }

        const commList = Array.isArray(comms) ? comms : comms?.commodities ?? [];
        setCommodities(commList);
        if (commList.length > 0) {
          setSelectedCommodity(commList[0].id);
        }
      })
      .catch(() => {
        setError('Could not fetch live officers or commodities from the database.');
      })
      .finally(() => {
        setLoadingData(false);
      });
  }, [isOpen, preselectedOfficerId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfficer || !selectedCommodity) {
      setError('Please select both an officer and a commodity.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const fullNotes = `[${priority}] ${notes ? notes.trim() : 'Routine Legal Metrology Compliance Inspection.'}`;
      const res = await createAssignmentApi({
        commodity_id: selectedCommodity,
        assigned_to: selectedOfficer,
        due_date: dueDate || undefined,
        notes: fullNotes,
      });

      const officerName = officers.find((o) => o.id === selectedOfficer)?.name || 'Officer';
      const commName = commodities.find((c) => c.id === selectedCommodity)?.generic_name || 'Commodity';

      onSuccess(`Successfully assigned ${commName} to ${officerName}!`);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create assignment on the server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 font-sans">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-[#E5F0EC]/50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#017374] text-white flex items-center justify-center shadow-xs">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Assign Commodity to Officer</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Dispatch an active Legal Metrology inspection task to a field officer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loadingData ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-[#017374] mb-2" />
              Loading officers and commodities from database...
            </div>
          ) : (
            <>
              {/* Select Officer */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-[#017374]" />
                  Select Inspecting Officer
                </label>
                <select
                  value={selectedOfficer}
                  onChange={(e) => setSelectedOfficer(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:ring-2 focus:ring-[#017374] focus:bg-white transition"
                  required
                >
                  {officers.length === 0 ? (
                    <option value="">No officers registered in database</option>
                  ) : (
                    officers.map((off) => (
                      <option key={off.id} value={off.id}>
                        {off.name} {off.employee_id ? `(${off.employee_id})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Select Commodity */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#017374]" />
                  Select Target Commodity
                </label>
                <select
                  value={selectedCommodity}
                  onChange={(e) => setSelectedCommodity(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:ring-2 focus:ring-[#017374] focus:bg-white transition"
                  required
                >
                  {commodities.length === 0 ? (
                    <option value="">No commodities available</option>
                  ) : (
                    commodities.map((comm) => (
                      <option key={comm.id} value={comm.id}>
                        {comm.brand_name ? `${comm.brand_name} — ` : ''}{comm.generic_name} ({comm.category})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Due Date & Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium outline-none focus:ring-2 focus:ring-[#017374] focus:bg-white transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#E37820]" />
                    Inspection Priority
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['STANDARD', 'HIGH_RISK', 'URGENT'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-2 px-1 text-[10px] font-bold rounded-lg border transition text-center ${
                          priority === p
                            ? 'bg-[#017374] text-white border-[#017374] shadow-xs'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {p === 'HIGH_RISK' ? 'High Risk' : p === 'URGENT' ? 'Urgent' : 'Routine'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Inspection Instructions / Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Inspection Scope & Directives
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Conduct retail market sweep. Verify font size of Net Quantity and MRP declaration under PCR 2011..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#017374] focus:bg-white transition resize-none"
                />
              </div>
            </>
          )}

          {/* Footer Controls */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingData}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-[#017374] hover:bg-[#015758] active:scale-[0.98] rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[2.5]" />
              )}
              <span>{submitting ? 'Assigning...' : 'Dispatch Assignment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
