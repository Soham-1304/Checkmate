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
import { ReviewModal } from './components/ReviewModal';
import { NewInspectionModal } from './components/NewInspectionModal';
import { SearchModal } from './components/SearchModal';
import { AIAnalysisItem } from './types';
import { InspectionDetailRow } from './data/inspectionsData';
import { CompanyRegistryRow } from './data/companiesData';
import { mapRepoRow, fetchRepoRows } from './api/useLiveData';
import { ReviewDecisionValue } from './components/ReviewModal';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState('companies'); // Open Companies page directly
  const [collapsed, setCollapsed] = useState(false);
  const [selectedInspectionDetail, setSelectedInspectionDetail] = useState<InspectionDetailRow | null>(null);
  const [reviewItem, setReviewItem] = useState<AIAnalysisItem | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isNewInspectionOpen, setIsNewInspectionOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'warning' } | null>(null);

  const showToast = (text: string, type: 'success' | 'warning' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleReviewItem = async (item: AIAnalysisItem) => {
    setReviewItem(item);
    setIsReviewOpen(true);
    // Land the admin on the inspection record while the report modal opens
    setCurrentTab('inspections');
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
        prev && prev.id === id
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
    showToast(`New inspection for "${data.productName}" added to AI verification queue!`, 'success');
  };

  const handleAddCompany = () => {
    showToast('Add Company form opened for Legal Metrology registry onboarding.', 'success');
  };

  const handleAddOfficer = () => {
    showToast('Add Officer form opened for District 4 field officer onboarding.', 'success');
  };

  const handleSelectCompany = (company: CompanyRegistryRow) => {
    showToast(`Loaded ${company.name} profile & compliance audit history.`, 'success');
  };

  return (
    <div className="min-h-screen bg-[#edf3f1] text-slate-800 flex font-sans antialiased selection:bg-[#017374] selection:text-white">
      {/* Sidebar Navigation (No Products in Registry) */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedInspectionDetail(null);
        }}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        inspectionBadgeCount={12}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <Header
          currentTab={currentTab}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenNewInspection={() => setIsNewInspectionOpen(true)}
          onAddCompany={handleAddCompany}
          onAddOfficer={handleAddOfficer}
          notificationCount={3}
        />

        {/* Dashboard / Inspections / Companies Content Container */}
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
                <HighRiskCompaniesCard onViewAll={() => setCurrentTab('companies')} />
                <TopViolationsCard onViewAnalytics={() => setCurrentTab('analytics')} />
                <OfficerWorkloadCard onManageOfficers={() => setCurrentTab('officers')} />
              </div>

              {/* 5. Bottom Row 4: Recent Inspections Table */}
              <RecentInspectionsTable onViewAll={() => setCurrentTab('inspections')} />
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
          ) : (
            /* Sub-page placeholder views */
            <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs min-h-[500px] flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#017374]/10 text-[#017374] flex items-center justify-center font-bold text-xl">
                {currentTab.toUpperCase().slice(0, 2)}
              </div>
              <h2 className="text-xl font-bold text-slate-800 capitalize">
                {currentTab.replace('-', ' ')} Module
              </h2>
              <p className="text-xs text-slate-500 max-w-md">
                Live registry and analytical data for Legal Metrology & Packaged Commodity inspections in Maharashtra D4 jurisdiction.
              </p>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="bg-[#017374] hover:bg-[#015758] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                Back to Dashboard
              </button>
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

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectInspection={async (id) => {
          const rows = await fetchRepoRows();
          const match = rows.find((r) => r.inspection_id === id);
          if (match) {
            setSelectedInspectionDetail(mapRepoRow(match));
            setCurrentTab('inspections');
          } else {
            showToast(`Inspection ${id.slice(0, 8)} not found in the registry.`, 'warning');
          }
        }}
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
