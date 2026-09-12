import React from 'react';
import {
  LayoutDashboard,
  ClipboardList,
  Building2,
  Users,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from 'lucide-react';
import { triggerSignOut } from './LoginGate';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  inspectionBadgeCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
  inspectionBadgeCount = 12,
}) => {
  const navSections = [
    {
      title: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'inspections', label: 'Inspections', icon: ClipboardList, badge: inspectionBadgeCount },
      ],
    },
    {
      title: 'REGISTRY',
      items: [
        { id: 'companies', label: 'Companies', icon: Building2 },
        { id: 'officers', label: 'Officers', icon: Users },
      ],
    },
    {
      title: 'ENFORCEMENT',
      items: [
        { id: 'violations', label: 'Violations', icon: AlertTriangle },
        { id: 'analytics', label: 'Analytics', icon: TrendingUp },
        { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
      ],
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'audit-log', label: 'Audit Log', icon: History },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const adminName = localStorage.getItem('doca_admin_name') || 'Checkmate Admin';
  const adminRole = localStorage.getItem('doca_admin_role') || 'Admin';
  const initials =
    adminName
      .split(' ')
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('') || 'DA';

  return (
    <aside
      className={`bg-[#017374] text-white flex flex-col justify-between transition-all duration-300 select-none z-30 shrink-0 h-screen sticky top-0 shadow-xl border-r border-[#015758] ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Header / Logo */}
      <div className="flex flex-col shrink-0">
        <div
          className={`flex items-center gap-3 pt-6 pb-5 transition-all ${
            collapsed ? 'justify-center px-2' : 'px-6'
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md shrink-0 overflow-hidden ring-2 ring-white/20">
            <img src="/logo-mark.png" alt="Checkmate" className="w-8 h-8 object-contain" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <div className="text-xl font-black tracking-tight text-white font-sans leading-tight">
                Checkmate
              </div>
              <div className="text-[10px] text-[#8EC8BA] font-semibold tracking-wide truncate">
                AI Compliance & Inspection
              </div>
            </div>
          )}
        </div>

        {/* Section Divider */}
        <div className="mx-3 border-b border-white/10 mb-2" />
      </div>

      {/* Navigation Sections */}
      <div className="px-3 space-y-5 py-2 flex-1 overflow-y-auto overflow-x-hidden scrollbar-none">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!collapsed ? (
              <div className="px-3 text-[10px] font-bold text-[#8EC8BA]/80 uppercase tracking-wider mb-1.5">
                {section.title}
              </div>
            ) : (
              <div className="w-6 mx-auto border-t border-white/10 my-2" />
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-white/20 text-white shadow-sm font-semibold backdrop-blur-sm'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      } ${collapsed ? 'justify-center px-0' : 'px-3.5'}`}
                    >
                      <div className="relative">
                        <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#8EC8BA]' : 'text-white/80'}`} />
                        {collapsed && item.badge !== undefined && item.badge > 0 && (
                          <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 rounded-full bg-[#E37820] ring-2 ring-[#017374]" />
                        )}
                      </div>

                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1 truncate">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#E37820] text-white leading-none shadow-xs">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    {/* Tooltip on Collapsed Hover */}
                    {collapsed && (
                      <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-xl whitespace-nowrap shadow-xl z-50 transition-all">
                        {item.label}
                        {item.badge !== undefined && (
                          <span className="ml-1.5 px-1.5 py-0.2 bg-[#E37820] rounded-full text-[10px]">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Area */}
      <div className="p-3 border-t border-white/10 space-y-2 bg-[#015758]/60 shrink-0">
        {/* Collapse Toggle Button */}
        <div className="relative group">
          <button
            onClick={onToggleCollapse}
            className={`flex items-center gap-2 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 w-full py-2 rounded-xl transition-all ${
              collapsed ? 'justify-center px-0' : 'px-3'
            }`}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
          {collapsed && (
            <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap shadow-xl z-50">
              Expand
            </div>
          )}
        </div>

        {/* User Card & Logout in Sidebar */}
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 transition-all ${
            collapsed ? 'justify-center p-1.5' : ''
          }`}
        >
          <div
            className="w-8 h-8 rounded-full bg-[#015758] border-2 border-[#8EC8BA]/60 flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0"
            title={`${adminName} (${adminRole})`}
          >
            {initials}
          </div>

          {!collapsed && (
            <div className="truncate flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate">{adminName}</div>
              <div className="text-[10px] text-[#8EC8BA] font-semibold truncate capitalize">
                {adminRole.toLowerCase()}
              </div>
            </div>
          )}

          <button
            onClick={triggerSignOut}
            title="Sign out"
            className="p-1.5 text-white/60 hover:text-rose-300 hover:bg-white/10 rounded-lg transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
