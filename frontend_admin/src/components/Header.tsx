import React, { useState, useRef, useEffect } from 'react';
import { Search, Bell, Plus, Download, ChevronDown, LogOut, ShieldCheck, User as UserIcon, UserCheck } from 'lucide-react';
import { triggerSignOut } from './LoginGate';
import { BASE } from '../api/client';

interface HeaderProps {
  currentTab: string;
  onOpenSearch: () => void;
  onOpenNewInspection: () => void;
  onAssignCommodity?: () => void;
  onAddCompany?: () => void;
  onAddOfficer?: () => void;
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenSearch,
  onOpenNewInspection,
  onAssignCommodity,
  onAddCompany,
  onAddOfficer,
  notificationCount = 3,
}) => {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isCompaniesTab = currentTab === 'companies';
  const isOfficersTab = currentTab === 'officers';

  const adminName = localStorage.getItem('doca_admin_name') || 'Checkmate Admin';
  const adminRole = localStorage.getItem('doca_admin_role') || 'Admin';
  const initials =
    adminName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('') || 'DA';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExportCsv = async () => {
    try {
      const authToken = localStorage.getItem('doca_admin_token') || '';
      const res = await fetch(`${BASE}/repository/export/csv`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doca_inspections_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || 'Failed to download CSV export.');
    }
  };

  return (
    <header className="px-8 pt-6 pb-2 flex items-center justify-between transition-all">
      {/* Search Bar */}
      <div className="w-full max-w-md">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between bg-white/90 hover:bg-white border border-slate-200/80 text-slate-400 px-4 py-2 rounded-xl text-xs transition-all shadow-2xs group"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#017374] transition-colors" />
            <span className="text-slate-500 font-normal">
              {isCompaniesTab
                ? 'Search company, license number, GSTIN or location...'
                : isOfficersTab
                ? 'Search officer name, badge ID, rank or jurisdiction...'
                : 'Search by inspection ID, product, company or officer...'}
            </span>
          </div>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-100 border border-slate-200 rounded shadow-2xs">
            ⌘ K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Export Button */}
        <button
          onClick={handleExportCsv}
          className="hidden sm:flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-all"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export CSV</span>
        </button>

        {/* Assign Task Button */}
        {onAssignCommodity && (
          <button
            onClick={onAssignCommodity}
            className="flex items-center gap-1.5 bg-white border border-[#017374]/30 hover:border-[#017374] text-[#017374] hover:bg-[#E5F0EC]/50 px-3.5 py-2 rounded-xl text-xs font-bold shadow-2xs transition-all duration-150"
            title="Assign Commodity to Officer"
          >
            <UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Assign Task</span>
          </button>
        )}

        {/* Action CTA Button */}
        {isCompaniesTab ? (
          <button
            onClick={onAddCompany || onOpenNewInspection}
            className="flex items-center gap-1.5 bg-[#E37820] hover:bg-[#c96414] active:scale-[0.98] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Company</span>
          </button>
        ) : isOfficersTab ? (
          <button
            onClick={onAddOfficer || onOpenNewInspection}
            className="flex items-center gap-1.5 bg-[#E37820] hover:bg-[#c96414] active:scale-[0.98] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add Officer</span>
          </button>
        ) : (
          <button
            onClick={onOpenNewInspection}
            className="flex items-center gap-1.5 bg-[#E37820] hover:bg-[#c96414] active:scale-[0.98] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition-all duration-150"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>New Inspection</span>
          </button>
        )}

        {/* Notification Bell */}
        <button
          className="relative p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#E37820] text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-slate-200 hidden md:block" />

        {/* Far-Right Profile Dropdown Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 transition-all shadow-2xs group focus:outline-none"
            title="Account settings & profile"
          >
            <div className="w-8 h-8 rounded-full bg-[#017374] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight group-hover:text-[#017374] transition-colors">
                {adminName}
              </div>
              <div className="text-[10px] text-slate-400 font-semibold leading-tight capitalize">
                {adminRole.toLowerCase()}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-transform duration-200" />
          </button>

          {/* Dropdown Menu */}
          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{adminName}</p>
                <p className="text-[11px] text-slate-400 font-medium truncate">admin@doca.gov.in</p>
                <div className="mt-1.5 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                    Active Authority
                  </span>
                </div>
              </div>

              <div className="py-1">
                <div className="px-4 py-1.5 text-[11px] font-medium text-slate-500 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#017374]" />
                  <span>Enforcement Role: {adminRole}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    triggerSignOut();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
