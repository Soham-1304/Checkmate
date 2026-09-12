import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { ComplianceDonutCard } from './components/ComplianceDonutCard';
import { InspectionTrendCard } from './components/InspectionTrendCard';
import { AIDecisionCarousel } from './components/AIDecisionCarousel';
import { HighRiskCompaniesCard } from './components/HighRiskCompaniesCard';
import { TopViolationsCard } from './components/TopViolationsCard';
import { OfficerWorkloadCard } from './components/OfficerWorkloadCard';
import { RecentInspectionsTable } from './components/RecentInspectionsTable';
import { InspectionsPage } from './components/InspectionsPage';
import { InspectionDetailView } from './components/InspectionDetailView';
import { CompaniesPage } from './components/CompaniesPage';
import { OfficersPage } from './components/OfficersPage';
import { ViolationsPage } from './components/ViolationsPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { ReportsPage } from './components/ReportsPage';
import { AuditLogPage } from './components/AuditLogPage';
import { SettingsPage } from './components/SettingsPage';
import { ReviewModal } from './components/ReviewModal';
import { NewInspectionModal } from './components/NewInspectionModal';
import { SearchModal } from './components/SearchModal';
import { AddCompanyModal } from './components/AddCompanyModal';
import { AddOfficerModal } from './components/AddOfficerModal';
import { AIAnalysisItem, InspectionDetailRow, CompanyRegistryRow } from './types';
import { mapRepoRow, fetchRepoRows, useLiveInspections } from './api/useLiveData';
import { ReviewDecisionValue } from './components/ReviewModal';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState(
    () => localStorage.getItem('checkmate_admin_tab') || 'dashboard',
  );
  const changeTab = (tab: string) => {
    localStorage.setItem('checkmate_admin_tab', tab);
    setCurrentTab(tab);
  };
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('checkmate_sidebar_collapsed') === 'true',
  );
  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('checkmate_sidebar_collapsed', String(next));
      return next;
    });
  };
  const [selectedInspectionDetail, setSelectedInspectionDetail] = useState<InspectionDetailRow | null>(null);
  const [reviewItem, setReviewItem] = useState<AIAnalysisItem | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isNewInspectionOpen, setIsNewInspectionOpen] = useState(false);
  const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
  const [isAddOfficerOpen, setIsAddOfficerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  const { data: liveInspectionsList } = useLiveInspections();
  const pendingCount = liveInspectionsList.filter((i) => i.status === 'Pending' || i.status === 'AI Review').length;

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleOpenInspectionById = async (backendId: string) => {
    try {
      const rows = await fetchRepoRows();
      const match = rows.find((r) => r.inspection_id === backendId);
      if (match) {
        setSelectedInspectionDetail(mapRepoRow(match));
      } else {
        const found = liveInspectionsList.find((i) => i.backendId === backendId || i.shortId === backendId);
        if (found) {
          setSelectedInspectionDetail({
            id: found.shortId,
            backendId: found.backendId,
            product: { name: found.productName, category: found.category, mockupType: found.mockupType as any },
            company: { name: found.brandName, industry: '' },
            officer: { name: found.officerName, initials: found.officerInitials },
            dateTime: found.dateTime,
            compliance: found.compliance,
            aiFinding: { confidence: found.aiConfidence, description: found.aiDescription },
            status: found.status,
          });
        }
      }
      changeTab('inspections');
    } catch {
      showToast('Could not load inspection record.', 'warning');
    }
  };

  const handleReviewItem = async (item: AIAnalysisItem) => {
    setReviewItem(item);
    setIsReviewOpen(true);
    changeTab('inspections');
    try {
      const rows = await fetchRepoRows();
      const match = rows.find((r) => r.inspection_id === item.id);
      if (match) setSelectedInspectionDetail(mapRepoRow(match));
    } catch {
      /* modal still works — detail view is best-effort */
    }
  };

  const recordDecision = async (id: string, decision: ReviewDecisionValue, okMsg: string) => {
    try {
      const { api } = await import('./api/client');
      await api(`/inspections/${id}/review`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
        headers: { 'Content-Type': 'application/json' },
      });
      showToast(okMsg, 'success');
      setSelectedInspectionDetail((prev) =>
        prev && (prev.id === id || prev.backendId === id)
          ? {
              ...prev,
              status:
                decision === 'APPROVED_COMPLIANT'
                  ? 'Approved'
                  : decision === 'RETURNED_FOR_REVIEW'
                  ? 'Re-inspection'
                  : 'Rejected',
            }
          : prev,
      );
    } catch {
      showToast('Decision could not be recorded. Check your session and retry.', 'warning');
      throw new Error('review failed');
    }
  };

  const handleDecision = async (itemId: string, decision: ReviewDecisionValue) => {
    if (decision === 'APPROVED_COMPLIANT') {
      await recordDecision(itemId, decision, 'Approved as compliant. Clearance recorded in the registry.');
    } else if (decision === 'APPROVED_NON_COMPLIANT') {
      await recordDecision(itemId, decision, 'Recorded non-compliant. Violation notice issued to the manufacturer.');
    } else {
      await recordDecision(itemId, decision, 'Returned for re-inspection. Field officer notified.');
    }
  };

  const handleOpenDetailView = (inspection: InspectionDetailRow) => {
    setSelectedInspectionDetail(inspection);
  };

  const handleApproveInspection = (id: string) => {
    recordDecision(id, 'APPROVED_COMPLIANT', 'Approved as compliant. Clearance record updated.');
  };

  const handleReinspectionRequest = (id: string) => {
    recordDecision(id, 'RETURNED_FOR_REVIEW', 'Re-inspection request assigned to the field officer.');
  };

  const handleRejectInspection = (id: string) => {
    recordDecision(id, 'APPROVED_NON_COMPLIANT', 'Notice of violation recorded for this inspection.');
  };

  const handleNewInspectionSubmit = (data: any) => {
    showToast(`Inspection ${data.shortId || ''} created and evaluated!`, 'success');
    if (data.id) {
      handleOpenInspectionById(data.id);
    }
  };

  const handleAddCompany = () => {
    setIsAddCompanyOpen(true);
  };

  const handleAddOfficer = () => {
    setIsAddOfficerOpen(true);
  };

  const handleSelectCompany = (company: CompanyRegistryRow) => {
    showToast(`Loaded ${company.name} profile & compliance audit history.`, 'success');
  };

  return (
    <div className="h-screen bg-[#edf3f1] text-slate-800 flex font-sans antialiased selection:bg-[#017374] selection:text-white overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          changeTab(tab);
          setSelectedInspectionDetail(null);
        }}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        inspectionBadgeCount={pendingCount || undefined}
      />

      {/* Main Content Area (scrolls independently) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Navbar */}
        <Header
          currentTab={currentTab}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNewInspection={() => setIsNewInspectionOpen(true)}
          onAddCompany={handleAddCompany}
          onAddOfficer={handleAddOfficer}
          notificationCount={pendingCount}
        />

        {/* Dynamic Main View */}
        <main className="flex-1 px-8 py-4 space-y-6 max-w-[1540px] w-full">
          {selectedInspectionDetail ? (
            /* Detailed AI Packaging Inspection View */
            <InspectionDetailView
              inspection={selectedInspectionDetail}
              onBack={() => setSelectedInspectionDetail(null)}
              onApprove={handleApproveInspection}
              onRequestReinspection={handleReinspectionRequest}
              onReject={handleRejectInspection}
            />
          ) : currentTab === 'dashboard' ? (
            <>
              {/* 1. Hero Section Banner */}
              <HeroSection />

              {/* 2. Middle Row 1: Charts (Compliance Donut + Inspection Trend) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5">
                  <ComplianceDonutCard />
                </div>
                <div className="lg:col-span-7">
                  <InspectionTrendCard />
                </div>
              </div>

              {/* 3. Middle Row 2: AI Decision Carousel */}
              <AIDecisionCarousel onReviewItem={handleReviewItem} />

              {/* 4. Bottom Row 3: 3 Column Highlights */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <HighRiskCompaniesCard onViewAll={() => changeTab('companies')} />
                <TopViolationsCard onViewAnalytics={() => changeTab('violations')} />
                <OfficerWorkloadCard onManageOfficers={() => changeTab('officers')} />
              </div>

              {/* 5. Bottom Row 4: Recent Inspections Table */}
              <RecentInspectionsTable
                onViewAll={() => changeTab('inspections')}
                onSelectInspection={(backendId) => handleOpenInspectionById(backendId)}
              />
            </>
          ) : currentTab === 'inspections' ? (
            /* Full Inspections List Table */
            <InspectionsPage
              onOpenNewInspection={() => setIsNewInspectionOpen(true)}
              onViewInspection={handleOpenDetailView}
            />
          ) : currentTab === 'companies' ? (
            /* Companies Registry Page */
            <CompaniesPage
              onAddCompany={handleAddCompany}
              onSelectCompany={handleSelectCompany}
            />
          ) : currentTab === 'officers' ? (
            /* Officers Registry Page */
            <OfficersPage onAddOfficer={handleAddOfficer} />
          ) : currentTab === 'violations' ? (
            /* Statutory Violations Page */
            <ViolationsPage />
          ) : currentTab === 'analytics' ? (
            /* Analytics Page */
            <AnalyticsPage />
          ) : currentTab === 'reports' ? (
            /* Reports & PDF/CSV Archive */
            <ReportsPage onSelectInspection={(backendId) => handleOpenInspectionById(backendId)} />
          ) : currentTab === 'audit-log' ? (
            /* Immutable Audit Log */
            <AuditLogPage />
          ) : currentTab === 'settings' ? (
            /* System Settings & Rule Sets */
            <SettingsPage />
          ) : (
            <div className="py-20 text-center text-xs text-slate-500">
              Module loading...
            </div>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <ReviewModal
        isOpen={isReviewOpen}
        item={reviewItem}
        onClose={() => setIsReviewOpen(false)}
        onDecision={handleDecision}
      />

      <NewInspectionModal
        isOpen={isNewInspectionOpen}
        onClose={() => setIsNewInspectionOpen(false)}
        onSubmitInspection={handleNewInspectionSubmit}
      />

      <AddCompanyModal
        isOpen={isAddCompanyOpen}
        onClose={() => setIsAddCompanyOpen(false)}
        onSuccess={(msg) => showToast(msg, 'success')}
      />

      <AddOfficerModal
        isOpen={isAddOfficerOpen}
        onClose={() => setIsAddOfficerOpen(false)}
        onSuccess={(msg) => showToast(msg, 'success')}
      />

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectInspection={(id) => handleOpenInspectionById(id)}
        onSelectCompany={() => changeTab('companies')}
      />

      {/* Action Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce flex items-center gap-3 bg-[#017374] text-white px-5 py-3.5 rounded-2xl shadow-xl border border-[#8EC8BA]/50 text-xs font-medium">
          {toastMessage.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-[#8EC8BA] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#FEB519] shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}

export default App;
