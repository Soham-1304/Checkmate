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
  ShieldCheck,
} from 'lucide-react';

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

  return (
    <aside
      className={`bg-[#017374] text-white flex flex-col justify-between transition-all duration-300 select-none z-30 shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      } min-h-screen sticky top-0 shadow-xl border-r border-[#015758]`}
    >
      {/* Top Header / Logo */}
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-6 pt-7 pb-6">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
            <ShieldCheck className="w-6 h-6 text-[#8EC8BA]" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-xl font-bold tracking-tight text-white font-sans leading-tight">
                ComplyAI
              </div>
              <div className="text-[10px] text-[#8EC8BA]/80 font-medium">Legal Metrology</div>
            </div>
          )}
        </div>

        {/* Navigation Sections */}
        <div className="px-3 space-y-6 pt-2 overflow-y-auto max-h-[calc(100vh-170px)]">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <div className="px-3 text-[11px] font-semibold text-[#8EC8BA]/80 uppercase tracking-wider mb-2">
                  {section.title}
                </div>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSelectTab(item.id)}
                      title={collapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-white/20 text-white shadow-sm font-semibold backdrop-blur-sm'
                          : 'text-white/80 hover:bg-white/10 hover:text-white'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[#8EC8BA]' : 'text-white/70'}`} />
                      {!collapsed && (
                        <div className="flex items-center justify-between flex-1 truncate">
                          <span className="truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[#E37820] text-white leading-none shadow-sm">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Area */}
      <div className="p-3 border-t border-white/10 space-y-2 bg-[#015758]/50">
        {/* Collapse Button */}
        <button
          onClick={onToggleCollapse}
          className={`flex items-center gap-2 text-xs font-medium text-white/70 hover:text-white hover:bg-white/10 w-full py-2 px-3 rounded-lg transition-all ${
            collapsed ? 'justify-center' : ''
          }`}
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

        {/* User Card */}
        <div
          className={`flex items-center gap-3 p-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/10 ${
            collapsed ? 'justify-center p-2' : ''
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-[#015758] border-2 border-[#8EC8BA]/60 flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0">
            RV
          </div>
          {!collapsed && (
            <div className="truncate">
              <div className="text-xs font-bold text-white truncate">Rajesh Verma</div>
              <div className="text-[11px] text-[#8EC8BA] truncate">Sr. Inspector - D4</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
