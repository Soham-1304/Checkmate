import React, { useState, useMemo } from 'react';
import {
  Building2,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Gavel,
  Search,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  X,
  RotateCcw,
} from 'lucide-react';
import { CompaniesIllustration } from './CompaniesIllustration';
import { COMPANIES_REGISTRY_DATA, CompanyRegistryRow } from '../data/companiesData';
import { useLiveCompanies } from '../api/useLiveData';

interface CompaniesPageProps {
  onAddCompany: () => void;
  onSelectCompany?: (company: CompanyRegistryRow) => void;
}

const PAGE_SIZE = 10;

export const CompaniesPage: React.FC<CompaniesPageProps> = ({
  onAddCompany,
  onSelectCompany,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedCompliance, setSelectedCompliance] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: liveCompanies } = useLiveCompanies(COMPANIES_REGISTRY_DATA);

  // Dynamic filter options based on available data
  const categories = useMemo(() => {
    const set = new Set(liveCompanies.map((c) => c.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [liveCompanies]);

  const locations = useMemo(() => {
    const set = new Set(liveCompanies.map((c) => c.state).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [liveCompanies]);

  const filteredCompanies = useMemo(() => {
    return liveCompanies.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.licenseNo.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.state.toLowerCase().includes(q) ||
        item.officer.name.toLowerCase().includes(q);

      const matchesRisk = selectedRisk === 'All' || item.risk === selectedRisk;
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesLocation = selectedLocation === 'All' || item.state === selectedLocation;

      const matchesCompliance =
        selectedCompliance === 'All'
          ? true
          : selectedCompliance === 'High'
          ? item.compliance >= 80
          : selectedCompliance === 'Moderate'
          ? item.compliance >= 50 && item.compliance < 80
          : item.compliance < 50;

      const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;

      return matchesQuery && matchesRisk && matchesCategory && matchesLocation && matchesCompliance && matchesStatus;
    });
  }, [liveCompanies, searchQuery, selectedRisk, selectedCategory, selectedLocation, selectedCompliance, selectedStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredCompanies.length / PAGE_SIZE) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedCompanies = useMemo(() => {
    const start = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredCompanies.slice(start, start + PAGE_SIZE);
  }, [filteredCompanies, safeCurrentPage]);

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedRisk !== 'All' ||
    selectedCategory !== 'All' ||
    selectedLocation !== 'All' ||
    selectedCompliance !== 'All' ||
    selectedStatus !== 'All';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRisk('All');
    setSelectedCategory('All');
    setSelectedLocation('All');
    setSelectedCompliance('All');
    setSelectedStatus('All');
    setCurrentPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedCompanies.length && paginatedCompanies.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(paginatedCompanies.map((c) => c.id));
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

  const exportCSV = () => {
    const headers = ['Company', 'License', 'Category', 'State', 'Compliance', 'Inspections', 'Violations', 'Risk', 'Officer', 'Status'];
    const rows = filteredCompanies.map((c) => [
      `"${c.name}"`,
      `"${c.licenseNo}"`,
      `"${c.category}"`,
      `"${c.state}"`,
      `${c.compliance}%`,
      c.inspections,
      c.violations,
      c.risk,
      `"${c.officer.name}"`,
      c.status,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'doca_companies_registry.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // KPIs
  const activeCount = liveCompanies.filter((c) => c.status === 'Active').length;
  const needsAttentionCount = liveCompanies.filter((c) => c.risk === 'High' || c.risk === 'Critical').length;
  const highRiskCount = liveCompanies.filter((c) => c.risk === 'Critical').length;
  const underEnforcementCount = liveCompanies.filter((c) => c.status === 'Under Rev.').length;

  return (
    <div className="space-y-6 font-sans pb-10">
      {/* 1. Hero Header Banner */}
      <div className="relative bg-white rounded-3xl border border-slate-200/80 shadow-xs p-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#E5F0EC]/60 via-white to-white pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column */}
          <div className="flex-1 space-y-5">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-[#E5F0EC] text-[#017374] text-[10px] font-bold px-3 py-1 rounded-full mb-2 tracking-wide uppercase">
                <Building2 className="w-3 h-3" />
                National Legal Metrology Registry
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                Know who’s on the radar.
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 font-medium">
                Monitor registered manufacturers, packers, importers, compliance health, and enforcement activity.
              </p>
            </div>

            {/* 5 Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                <div className="w-7 h-7 rounded-lg bg-[#E5F0EC] text-[#017374] flex items-center justify-center mb-1.5 font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-800">{liveCompanies.length}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Registered Companies</div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-800">{activeCount}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Active Compliance</div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-800">{needsAttentionCount}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Needs Attention</div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center mb-1.5 font-bold">
                  <AlertOctagon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-800">{highRiskCount}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">High Risk</div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs hover:shadow-xs transition">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5 font-bold">
                  <Gavel className="w-4 h-4" />
                </div>
                <div className="text-2xl font-black text-slate-800">{underEnforcementCount}</div>
                <div className="text-[10px] text-slate-400 font-semibold mt-0.5">Under Enforcement</div>
              </div>
            </div>
          </div>

          <div className="lg:w-[260px] xl:w-[290px] shrink-0">
            <CompaniesIllustration className="w-full h-[180px] lg:h-[200px]" />
          </div>
        </div>
      </div>

      {/* 2. Interactive Filters & Search Row */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="flex-1 min-w-[260px]">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search company name, license, GSTIN, category, state..."
                className="w-full pl-9 pr-8 py-2.5 bg-[#edf3f1] border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#017374] focus:bg-white shadow-2xs transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions: Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition shadow-2xs"
            title="Download CSV report of current filtered companies"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Real Interactive Filter Selects */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px] mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Risk Level Filter */}
          <div className="flex items-center gap-1.5 bg-[#edf3f1] px-2.5 py-1.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 font-medium text-[11px]">Risk:</span>
            <select
              value={selectedRisk}
              onChange={(e) => {
                setSelectedRisk(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer text-xs"
            >
              <option value="All">All Risks</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-[#edf3f1] px-2.5 py-1.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 font-medium text-[11px]">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer text-xs"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-1.5 bg-[#edf3f1] px-2.5 py-1.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 font-medium text-[11px]">Location:</span>
            <select
              value={selectedLocation}
              onChange={(e) => {
                setSelectedLocation(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer text-xs"
            >
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc === 'All' ? 'All States' : loc}
                </option>
              ))}
            </select>
          </div>

          {/* Compliance Filter */}
          <div className="flex items-center gap-1.5 bg-[#edf3f1] px-2.5 py-1.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 font-medium text-[11px]">Compliance:</span>
            <select
              value={selectedCompliance}
              onChange={(e) => {
                setSelectedCompliance(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer text-xs"
            >
              <option value="All">All Levels</option>
              <option value="High">High (≥80%)</option>
              <option value="Moderate">Moderate (50-79%)</option>
              <option value="Low">At Risk (&lt;50%)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-[#edf3f1] px-2.5 py-1.5 rounded-xl border border-slate-200/80">
            <span className="text-slate-500 font-medium text-[11px]">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer text-xs"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Under Rev.">Under Rev.</option>
            </select>
          </div>

          {/* Clear All Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs font-bold text-[#E37820] hover:text-[#c96414] px-2 py-1 rounded-lg hover:bg-amber-50 transition"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}

          <span className="text-[11px] text-slate-400 font-medium ml-auto">
            Showing <strong className="text-slate-700">{filteredCompanies.length}</strong> of {liveCompanies.length} companies
          </span>
        </div>
      </div>

      {/* 3. Company Registry Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Top Header: Title & Real Pagination */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-[#edf3f1]/30">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900">Company Registry</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-[#017374]/10 text-[#017374] text-[10px] font-bold">
              Page {safeCurrentPage} of {totalPages}
            </span>
          </div>

          {/* Working Pagination */}
          <div className="flex items-center gap-2">
            <button
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white disabled:opacity-40 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 1)
              .map((p, idx, arr) => (
                <React.Fragment key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="text-slate-300 text-xs px-1">…</span>
                  )}
                  <button
                    onClick={() => setCurrentPage(p)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition flex items-center justify-center ${
                      safeCurrentPage === p
                        ? 'bg-[#017374] text-white shadow-xs'
                        : 'hover:bg-white text-slate-600 border border-slate-200/60'
                    }`}
                  >
                    {p}
                  </button>
                </React.Fragment>
              ))}

            <button
              disabled={safeCurrentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-white disabled:opacity-40 transition"
              title="Next Page"
            >
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[11px] font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider bg-slate-50/50">
                <th className="py-3 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedCompanies.length && paginatedCompanies.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-[#017374] focus:ring-[#017374] border-slate-300 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 font-bold">Company</th>
                <th className="py-3 px-4 font-bold">Category</th>
                <th className="py-3 px-4 font-bold">Compliance</th>
                <th className="py-3 px-4 font-bold text-center">Inspections</th>
                <th className="py-3 px-4 font-bold text-center">Violations</th>
                <th className="py-3 px-4 font-bold">Risk</th>
                <th className="py-3 px-4 font-bold">Officer</th>
                <th className="py-3 px-6 font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {paginatedCompanies.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-400 text-xs">
                    No companies match your filters. Try clearing or relaxing some filters.
                  </td>
                </tr>
              ) : (
                paginatedCompanies.map((row) => {
                  const isSelected = selectedIds.includes(row.id);

                  return (
                    <tr
                      key={row.id}
                      onClick={() => onSelectCompany && onSelectCompany(row)}
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

                      {/* Company Avatar + Name + License */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs"
                            style={{ backgroundColor: row.avatarBg }}
                          >
                            {row.avatarText}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 group-hover:text-[#017374] transition-colors">
                              {row.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">{row.licenseNo}</div>
                          </div>
                        </div>
                      </td>

                      {/* Category & State */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{row.category}</div>
                        <div className="text-[11px] text-slate-400">{row.state}</div>
                      </td>

                      {/* Compliance % with Bar */}
                      <td className="py-3.5 px-4">
                        <div className="w-28 space-y-1">
                          <span className="font-bold text-slate-900 text-xs">{row.compliance}%</span>
                          <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${row.compliance}%`,
                                backgroundColor: row.complianceBarColor,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Inspections Count */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {row.inspections}
                      </td>

                      {/* Violations Count */}
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                        {row.violations}
                      </td>

                      {/* Risk Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.risk === 'Low'
                              ? 'bg-emerald-100/70 text-[#017374]'
                              : row.risk === 'Medium'
                              ? 'bg-[#FEB519]/25 text-[#9a6206]'
                              : row.risk === 'High'
                              ? 'bg-[#E37820]/15 text-[#E37820]'
                              : 'bg-rose-100/80 text-rose-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              row.risk === 'Low'
                                ? 'bg-[#017374]'
                                : row.risk === 'Medium'
                                ? 'bg-[#FEB519]'
                                : row.risk === 'High'
                                ? 'bg-[#E37820]'
                                : 'bg-rose-600'
                            }`}
                          />
                          {row.risk}
                        </span>
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

                      {/* Status */}
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.status === 'Active'
                              ? 'bg-emerald-50 text-[#017374] border border-emerald-100'
                              : 'bg-[#FEB519]/20 text-[#9a6206] border border-[#FEB519]/30'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
