import React, { useState } from 'react';
import {
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Search,
  Calendar,
  Shield,
  Building2,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
  ArrowUp,
} from 'lucide-react';
import { InspectorIllustration } from './InspectorIllustration';
import { ProductMockup } from './ProductMockup';
import { InspectionDetailRow } from '../types';
import { useLiveInspections } from '../api/useLiveData';

interface InspectionsPageProps {
  onOpenNewInspection: () => void;
  onViewInspection: (inspection: InspectionDetailRow) => void;
}

export const InspectionsPage: React.FC<InspectionsPageProps> = ({
  onOpenNewInspection,
  onViewInspection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedCompliance, setSelectedCompliance] = useState('All');
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  // Live seeded inspections only — no mock rows
  const { data: liveRows, live, loading } = useLiveInspections();
  const liveInspections: InspectionDetailRow[] = liveRows.map((r) => ({
    id: r.shortId,
    backendId: r.backendId,
    isHighPriority: r.isHighPriority,
    product: {
      name: r.productName,
      category: r.category,
      mockupType: r.mockupType as InspectionDetailRow['product']['mockupType'],
    },
    company: { name: r.brandName, industry: '' },
    officer: { name: r.officerName, initials: r.officerInitials },
    dateTime: r.dateTime,
    compliance: r.compliance,
    aiFinding: { confidence: r.aiConfidence, description: r.aiDescription },
    status: r.status,
  }));

  const stats = React.useMemo(() => {
    const total = liveInspections.length;
    const count = (c: string) => liveInspections.filter((i) => i.compliance === c).length;
    const compliant = count('Compliant');
    const minor = count('Minor');
    const major = count('Major');
    const critical = count('Critical');
    const aiReview = liveInspections.filter((i) => i.status === 'AI Review').length;
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return { total, compliant, minor, major, critical, aiReview, pct };
  }, [liveInspections]);

  const companyOptions = React.useMemo(() => {
    const set = new Set(liveInspections.map((i) => i.company.name).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [liveInspections]);

  // Filter inspections
  const filteredInspections = liveInspections.filter((item) => {
    const matchesQuery =
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.officer.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'All' || item.status === selectedStatus;

    const matchesCompliance =
      selectedCompliance === 'All' || item.compliance === selectedCompliance;

    const matchesCompany =
      selectedCompany === 'All' || item.company.name === selectedCompany;

    return matchesQuery && matchesStatus && matchesCompliance && matchesCompany;
  });

  const PAGE_SIZE = 8;
  const totalPages = Math.max(1, Math.ceil(filteredInspections.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pageRows = filteredInspections.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInspections.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInspections.map((i) => i.id));
    }
  };

  const toggleSelectRow = (id: string, e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Header Banner */}
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Title + 6 Metric Cards + Segmented Bar */}
          <div className="flex-1 space-y-5">
            <div>
              <div className="text-xs font-bold text-[#017374] tracking-wider uppercase mb-1">
                INSPECTIONS
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#12312b] tracking-tight leading-tight">
                Every inspection<br />brings us closer to safer markets.
              </h1>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Track, review and take action on all inspections — from field visit to final decision.
              </p>
            </div>

            {/* 6 Metric Cards Row */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {/* 1. Total Inspections */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#E5F0EC] text-[#017374] flex items-center justify-center mb-1.5">
                  <ClipboardCheck className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="text-xl font-black text-slate-800">{stats.total}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-none mb-1">Total Inspections</div>
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#017374]">
                  <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" />
                  <span>{stats.pct(stats.total)}% of window</span>
                </div>
              </div>

              {/* 2. Compliant */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#E5F0EC] text-[#017374] flex items-center justify-center mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="text-xl font-black text-slate-800">{stats.compliant}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-none mb-1">Compliant</div>
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#017374]">
                  <span>{stats.pct(stats.compliant)}% of total</span>
                </div>
              </div>

              {/* 3. Minor */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#fefce8] text-[#FEB519] flex items-center justify-center mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="text-xl font-black text-slate-800">{stats.minor}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-none mb-1">Minor</div>
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#FEB519]">
                  <span>{stats.pct(stats.minor)}% of total</span>
                </div>
              </div>

              {/* 4. Major */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#fff7ed] text-[#E37820] flex items-center justify-center mb-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="text-xl font-black text-slate-800">{stats.major}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-none mb-1">Major</div>
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#E37820]">
                  <span>{stats.pct(stats.major)}% of total</span>
                </div>
              </div>

              {/* 5. Critical */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-1.5">
                  <AlertOctagon className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="text-xl font-black text-slate-800">{stats.critical}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-none mb-1">Critical</div>
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600">
                  <span>{stats.pct(stats.critical)}% of total</span>
                </div>
              </div>

              {/* 6. AI Review */}
              <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-6 h-6 rounded-lg bg-[#fff7ed] text-[#E37820] flex items-center justify-center mb-1.5">
                  <Sparkles className="w-3.5 h-3.5 stroke-[2.2]" />
                </div>
                <div className="text-xl font-black text-slate-800">{stats.aiReview}</div>
                <div className="text-[10px] text-slate-400 font-medium leading-none mb-1">AI Review</div>
                <div className="flex items-center gap-0.5 text-[10px] font-bold text-[#E37820]">
                  <ArrowUp className="w-2.5 h-2.5 stroke-[2.5]" />
                  <span>{stats.aiReview} pending</span>
                </div>
              </div>
            </div>

            {/* Segmented Multi-Color Progress Bar */}
            <div className="w-full h-2 rounded-full overflow-hidden flex shadow-2xs">
              <div className="h-full bg-[#017374]" style={{ width: `${stats.pct(stats.compliant)}%` }} title={`Compliant ${stats.pct(stats.compliant)}%`} />
              <div className="h-full bg-[#FEB519]" style={{ width: `${stats.pct(stats.minor)}%` }} title={`Minor ${stats.pct(stats.minor)}%`} />
              <div className="h-full bg-[#E37820]" style={{ width: `${stats.pct(stats.major)}%` }} title={`Major ${stats.pct(stats.major)}%`} />
              <div className="h-full bg-[#ef4444]" style={{ width: `${stats.pct(stats.critical)}%` }} title={`Critical ${stats.pct(stats.critical)}%`} />
            </div>
          </div>

          {/* Right Column: Illustration */}
          <div className="w-full lg:w-[380px] flex items-center justify-center lg:justify-end shrink-0">
            <InspectorIllustration className="w-full max-w-[340px]" />
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Search Box */}
        <div className="flex-1 min-w-[280px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by inspection ID, product, company or officer..."
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#017374] shadow-2xs"
            />
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Date Range */}
          <button className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200/80 rounded-xl font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-normal">Date Range</span>
            <span className="font-semibold text-slate-800">Last 6 months</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Status */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <span className="w-2 h-2 rounded-full bg-[#017374]" />
            <span className="text-slate-400 font-normal">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer text-xs pr-1"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="AI Review">AI Review</option>
              <option value="Re-inspection">Re-inspection</option>
            </select>
          </div>

          {/* Compliance */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-normal">Compliance:</span>
            <select
              value={selectedCompliance}
              onChange={(e) => {
                setSelectedCompliance(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer text-xs pr-1"
            >
              <option value="All">All Compliance</option>
              <option value="Compliant">Compliant</option>
              <option value="Minor">Minor</option>
              <option value="Major">Major</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Company */}
          <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 border border-slate-200/80 rounded-xl text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400 font-normal">Company:</span>
            <select
              value={selectedCompany}
              onChange={(e) => {
                setSelectedCompany(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent font-semibold text-slate-800 outline-none cursor-pointer text-xs pr-1 max-w-[140px] truncate"
            >
              {companyOptions.map((c) => (
                <option key={c} value={c}>{c === 'All' ? 'All Companies' : c}</option>
              ))}
            </select>
          </div>

          {/* Clear All */}
          {(searchQuery || selectedStatus !== 'All' || selectedCompliance !== 'All' || selectedCompany !== 'All') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('All');
                setSelectedCompliance('All');
                setSelectedCompany('All');
                setCurrentPage(1);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-[#017374] px-2 py-1 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* 3. Inspections Main Table Card */}
      {!live && (
        <div className="bg-[#FEB519]/15 border border-[#FEB519]/40 text-[#9a6206] text-xs font-semibold px-5 py-3 rounded-2xl">
          Backend not connected — set your admin token (localStorage key
          <span className="font-mono"> doca_admin_token</span>) and reload to see seeded inspections.
        </div>
      )}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Top Status / Pagination Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredInspections.length && filteredInspections.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded text-[#017374] focus:ring-[#017374] border-slate-300 cursor-pointer"
            />
            <span className="font-medium">{selectedIds.length} selected</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400">Showing {pageRows.length} of {filteredInspections.length} (total {stats.total})</span>
            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded-lg font-medium flex items-center justify-center ${
                    safePage === i + 1
                      ? 'bg-[#017374] text-white font-bold shadow-xs'
                      : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-6 w-10"></th>
                <th className="py-3 px-4 font-bold">INSPECTION</th>
                <th className="py-3 px-4 font-bold">PRODUCT</th>
                <th className="py-3 px-4 font-bold">COMPANY</th>
                <th className="py-3 px-4 font-bold">OFFICER</th>
                <th className="py-3 px-4 font-bold">DATE & TIME</th>
                <th className="py-3 px-4 font-bold">COMPLIANCE</th>
                <th className="py-3 px-4 font-bold">AI FINDING</th>
                <th className="py-3 px-4 font-bold">STATUS</th>
                <th className="py-3 px-6 text-right font-bold">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-20 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-[#017374] border-t-transparent animate-spin" />
                      <span className="text-xs font-semibold text-slate-600">Loading live inspections from Legal Metrology Registry…</span>
                    </div>
                  </td>
                </tr>
              ) : pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-400 text-xs">
                    No inspections match your search criteria.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const isSelected = selectedIds.includes(row.id);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => onViewInspection(row)}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-[#E5F0EC]/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectRow(row.id, e)}
                          className="w-4 h-4 rounded text-[#017374] focus:ring-[#017374] border-slate-300"
                        />
                      </td>

                      {/* Inspection ID + High Priority Badge */}
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="font-bold text-slate-900 group-hover:text-[#017374] transition-colors">{row.id}</div>
                        {row.isHighPriority && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-[#E37820] mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E37820]" />
                            <span>High Priority</span>
                          </div>
                        )}
                      </td>

                      {/* Product Mockup + Name + Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-10 rounded-md bg-white border border-slate-100 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                            <ProductMockup type={row.product.mockupType} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 line-clamp-1 group-hover:text-[#017374] transition-colors">
                              {row.product.name}
                            </div>
                            <div className="text-[11px] text-slate-400">{row.product.category}</div>
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{row.company.name}</div>
                        <div className="text-[11px] text-slate-400">{row.company.industry}</div>
                      </td>

                      {/* Officer */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#017374] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {row.officer.initials}
                          </div>
                          <span className="text-slate-700 font-medium">{row.officer.name}</span>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {row.dateTime}
                      </td>

                      {/* Compliance Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.compliance === 'Compliant'
                              ? 'bg-emerald-100/70 text-[#017374]'
                              : row.compliance === 'Minor'
                              ? 'bg-[#FEB519]/25 text-[#9a6206]'
                              : row.compliance === 'Major'
                              ? 'bg-[#E37820]/15 text-[#E37820]'
                              : 'bg-rose-100/80 text-rose-700'
                          }`}
                        >
                          {row.compliance === 'Compliant' && <span className="w-1.5 h-1.5 rounded-full bg-[#017374]" />}
                          {row.compliance === 'Minor' && <span>▲</span>}
                          {row.compliance === 'Major' && <span>▲</span>}
                          {row.compliance === 'Critical' && <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />}
                          <span>{row.compliance}</span>
                        </span>
                      </td>

                      {/* AI Finding */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100/80 text-[#017374]">
                            AI • {row.aiFinding.confidence}%
                          </span>
                          <span className="text-[11px] text-slate-500 truncate max-w-[140px]" title={row.aiFinding.description}>
                            {row.aiFinding.description}
                          </span>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.status === 'Approved'
                              ? 'bg-emerald-50 text-[#017374] border border-emerald-100'
                              : row.status === 'Pending'
                              ? 'bg-slate-100 text-slate-600 border border-slate-200'
                              : row.status === 'Rejected'
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : row.status === 'AI Review'
                              ? 'bg-[#FEB519]/20 text-[#9a6206] border border-[#FEB519]/30'
                              : 'bg-teal-50 text-teal-700 border border-teal-100'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.status === 'Approved'
                                ? 'bg-[#017374]'
                                : row.status === 'Pending'
                                ? 'bg-slate-400'
                                : row.status === 'Rejected'
                                ? 'bg-rose-500'
                                : row.status === 'AI Review'
                                ? 'bg-[#FEB519]'
                                : 'bg-teal-600'
                            }`}
                          />
                          {row.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewInspection(row);
                          }}
                          className="text-xs font-bold text-[#017374] hover:text-[#015758] transition-colors"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Bottom Assign Inspection Banner */}
      <div className="bg-[#E5F0EC] p-5 rounded-2xl border border-[#8EC8BA]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white text-[#017374] flex items-center justify-center shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Need to assign an inspection?</h4>
            <p className="text-[11px] text-slate-500">Create a new inspection or assign it to an officer.</p>
          </div>
        </div>

        <button
          onClick={onOpenNewInspection}
          className="flex items-center gap-1.5 bg-[#E37820] hover:bg-[#c96414] active:scale-[0.98] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm self-start sm:self-auto transition-all"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>New Inspection</span>
        </button>
      </div>
    </div>
  );
};
