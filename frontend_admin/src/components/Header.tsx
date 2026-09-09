import React from 'react';
import { Search, Bell, Plus, Download, ChevronDown } from 'lucide-react';

interface HeaderProps {
  currentTab: string;
  onOpenSearch: () => void;
  onOpenNewInspection: () => void;
  onAddCompany?: () => void;
  onAddOfficer?: () => void;
  notificationCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onOpenSearch,
  onOpenNewInspection,
  onAddCompany,
  onAddOfficer,
  notificationCount = 3,
}) => {
  const isCompaniesTab = currentTab === 'companies';
  const isOfficersTab = currentTab === 'officers';

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
      <div className="flex items-center gap-5">
        {/* Notification Bell */}
        <button
          className="relative p-1.5 rounded-lg text-slate-600 hover:text-slate-900 transition-colors"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {notificationCount > 0 && (
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-[#E37820] text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              {notificationCount}
            </span>
          )}
        </button>

        {/* Date & Time display */}
        <div className="hidden lg:block text-xs font-medium text-slate-500">
          {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
        </div>

        {/* User Info */}
        {(() => {
          const adminName = localStorage.getItem('doca_admin_name') || 'Checkmate Admin';
          const adminRole = localStorage.getItem('doca_admin_role') || 'Admin';
          const initials = adminName.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('') || 'DA';
          return (
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              title="Signed in as Administrator"
            >
              <div className="w-8 h-8 rounded-full bg-[#017374] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">{adminName}</div>
                <div className="text-[11px] text-[#017374] font-semibold leading-tight capitalize">{adminRole.toLowerCase()}</div>
              </div>
            </div>
          );
        })()}

        {/* Export Button */}
        <button
          onClick={() => alert(`Exporting ${isCompaniesTab ? 'companies registry' : 'inspections'} report...`)}
          className="hidden sm:flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200/80 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs transition-all"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export</span>
        </button>

        {/* + Add Company / + Add Officer / + New Inspection CTA Button */}
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
      </div>
    </header>
  );
};
