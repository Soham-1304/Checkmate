import React, { useState } from 'react';
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
} from 'lucide-react';
import { CompaniesIllustration } from './CompaniesIllustration';
import { COMPANIES_REGISTRY_DATA, CompanyRegistryRow } from '../data/companiesData';

interface CompaniesPageProps {
  onAddCompany: () => void;
  onSelectCompany?: (company: CompanyRegistryRow) => void;
}

export const CompaniesPage: React.FC<CompaniesPageProps> = ({
  onAddCompany,
  onSelectCompany,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredCompanies = COMPANIES_REGISTRY_DATA.filter((item) => {
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.licenseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.officer.name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk = selectedRisk === 'All' || item.risk === selectedRisk;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesLocation = selectedLocation === 'All' || item.state === selectedLocation;

    return matchesQuery && matchesRisk && matchesCategory && matchesLocation;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCompanies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCompanies.map((c) => c.id));
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

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedRisk('All');
    setSelectedCategory('All');
    setSelectedLocation('All');
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Header Banner */}
      <div className="relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Column: Title + 5 KPI Cards */}
          <div className="flex-1 space-y-5">
            <div>
              <div className="text-xs font-bold text-[#017374] tracking-wider uppercase mb-1">
                COMPANIES
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#12312b] tracking-tight leading-tight">
                Know who’s on the radar.
              </h1>
              <p className="text-xs text-slate-500 mt-2 font-medium">
                Monitor registered businesses, compliance health and enforcement activity.
              </p>
            </div>

            {/* 5 Metric Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              {/* 1. Registered Companies */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-[#E5F0EC] text-[#017374] flex items-center justify-center mb-1.5">
                  <Building2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="text-2xl font-black text-slate-900">128</div>
                <div className="text-[11px] text-slate-400 font-medium leading-tight">Registered Companies</div>
              </div>

              {/* 2. Active */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#017374] flex items-center justify-center mb-1.5">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="text-2xl font-black text-slate-900">91</div>
                <div className="text-[11px] text-slate-400 font-medium leading-tight">Active</div>
              </div>

              {/* 3. Needs Attention */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-[#fefce8] text-[#FEB519] flex items-center justify-center mb-1.5">
                  <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="text-2xl font-black text-slate-900">24</div>
                <div className="text-[11px] text-slate-400 font-medium leading-tight">Needs Attention</div>
              </div>

              {/* 4. High Risk */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-[#fff7ed] text-[#E37820] flex items-center justify-center mb-1.5">
                  <AlertOctagon className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="text-2xl font-black text-slate-900">9</div>
                <div className="text-[11px] text-slate-400 font-medium leading-tight">High Risk</div>
              </div>

              {/* 5. Under Enforcement */}
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/70 shadow-2xs">
                <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5">
                  <Gavel className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="text-2xl font-black text-slate-900">4</div>
                <div className="text-[11px] text-slate-400 font-medium leading-tight">Under Enforcement</div>
              </div>
            </div>
          </div>

          {/* Right Column: Illustration */}
          <div className="w-full lg:w-[380px] flex items-center justify-center lg:justify-end shrink-0">
            <CompaniesIllustration className="w-full max-w-[340px]" />
          </div>
        </div>
      </div>

      {/* 2. Filters & Search Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {/* Search Bar */}
        <div className="flex-1 min-w-[280px]">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company, license, GSTIN or location..."
              className="w-full pl-9 pr-8 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#017374] shadow-2xs"
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

        {/* Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Risk Level */}
          <button className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200/80 rounded-xl font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <span className="text-slate-400 font-normal">Risk Level</span>
            <span className="font-semibold text-slate-800">{selectedRisk}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Category */}
          <button className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200/80 rounded-xl font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <span className="text-slate-400 font-normal">Category</span>
            <span className="font-semibold text-slate-800">{selectedCategory}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Location */}
          <button className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200/80 rounded-xl font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <span className="text-slate-400 font-normal">Location</span>
            <span className="font-semibold text-slate-800">{selectedLocation}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Compliance */}
          <button className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200/80 rounded-xl font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <span className="text-slate-400 font-normal">Compliance</span>
            <span className="font-semibold text-slate-800">All</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Officer */}
          <button className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200/80 rounded-xl font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <span className="text-slate-400 font-normal">Officer</span>
            <span className="font-semibold text-slate-800">All</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Last Inspection */}
          <button className="flex items-center gap-2 bg-white px-3 py-2 border border-slate-200/80 rounded-xl font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
            <span className="text-slate-400 font-normal">Last Inspection</span>
            <span className="font-semibold text-slate-800">All</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* More Filters */}
          <button className="flex items-center gap-1.5 bg-white px-3 py-2 border border-slate-200/80 rounded-xl font-semibold text-slate-700 shadow-2xs hover:bg-slate-50">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>More Filters</span>
          </button>

          {/* Clear All */}
          {(searchQuery || selectedRisk !== 'All' || selectedCategory !== 'All' || selectedLocation !== 'All') && (
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-slate-500 hover:text-[#017374] px-2 py-1 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* 3. Company Registry Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Top Header: Title & Pagination */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-slate-900">Company Registry</h2>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-400">Showing 1-{filteredCompanies.length} of 128</span>
            {/* Pagination */}
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />
              </button>
              <button className="w-7 h-7 rounded-lg bg-[#017374] text-white font-bold flex items-center justify-center shadow-xs">
                1
              </button>
              <button className="w-7 h-7 rounded-lg hover:bg-slate-50 font-medium text-slate-600 flex items-center justify-center">
                2
              </button>
              <button className="w-7 h-7 rounded-lg hover:bg-slate-50 font-medium text-slate-600 flex items-center justify-center">
                3
              </button>
              <button className="w-7 h-7 rounded-lg hover:bg-slate-50 font-medium text-slate-600 flex items-center justify-center">
                4
              </button>
              <button className="w-7 h-7 rounded-lg hover:bg-slate-50 font-medium text-slate-600 flex items-center justify-center">
                5
              </button>
              <button className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50">
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
                <th className="py-3 px-6 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredCompanies.length && filteredCompanies.length > 0}
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
              {filteredCompanies.map((row) => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
