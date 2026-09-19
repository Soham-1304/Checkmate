import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  FileText,
  ExternalLink,
  Loader2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { api, token, BASE } from '../api/client';

export const ReportsPage: React.FC<{ onSelectInspection?: (backendId: string) => void }> = ({
  onSelectInspection,
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = resultFilter !== 'ALL' ? `?result=${resultFilter}&limit=100` : '?limit=100';
    api<any>(`/repository/search${q}`)
      .then((res) => {
        setItems(res?.items ?? []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [resultFilter]);

  const handleDownloadCsv = async () => {
    setDownloadingCsv(true);
    try {
      const authToken = token();
      const res = await fetch(`${BASE}/repository/export/csv`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed (${res.status})`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doca_inspections_repository_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || 'Could not export CSV');
    } finally {
      setDownloadingCsv(false);
    }
  };

  const handleOpenPdf = (e: React.MouseEvent, inspectionId: string) => {
    e.stopPropagation();
    window.open(`${BASE}/inspections/${inspectionId}/report/pdf`, '_blank', 'noopener');
  };

  const filtered = items.filter((i) => {
    const s = search.toLowerCase();
    return (
      !s ||
      (i.commodity || '').toLowerCase().includes(s) ||
      (i.brand || '').toLowerCase().includes(s) ||
      (i.manufacturer || '').toLowerCase().includes(s) ||
      (i.barcode || '').includes(s) ||
      (i.inspection_id || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-[#017374] tracking-wider uppercase mb-1">
            REPORTS & COMPLIANCE ARCHIVE
          </div>
          <h1 className="text-3xl font-black text-[#12312b] tracking-tight leading-tight">
            Statutory Inspection Reports & Records
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Search, preview generated Legal Metrology inspection certificates, and export complete audit datasets
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          disabled={downloadingCsv}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#017374] hover:bg-[#015758] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          {downloadingCsv ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Export Full CSV Repository</span>
        </button>
      </div>

      {/* Filter and Search controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by commodity, brand, barcode or manufacturer..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/20"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-600">Result:</span>
          {['ALL', 'PASS', 'FAIL', 'REVIEW'].map((res) => (
            <button
              key={res}
              onClick={() => setResultFilter(res)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                resultFilter === res
                  ? 'bg-[#017374] text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {res === 'ALL' ? 'All' : res}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-3xl border border-[#8EC8BA]/40 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#017374] animate-spin mx-auto" />
            <div className="text-xs text-slate-500 font-medium">Fetching repository reports...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">No inspection reports found</div>
            <p className="text-xs text-slate-400">Try changing your search query or result filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#E5F0EC]/40 border-b border-slate-200/80">
                <tr>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Inspection ID</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Product & Brand</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Manufacturer</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Officer</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Date</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700">Verdict</th>
                  <th className="px-6 py-3.5 font-bold text-slate-700 text-right">PDF Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filtered.map((r) => {
                  const isPass = r.compliance_result === 'PASS';
                  const isFail = r.compliance_result === 'FAIL';
                  return (
                    <tr
                      key={r.inspection_id}
                      onClick={() => onSelectInspection?.(r.inspection_id)}
                      className="hover:bg-[#E5F0EC]/30 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-[#017374] group-hover:underline">
                        {r.inspection_id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{r.brand} {r.commodity}</div>
                        {r.barcode && <div className="text-[10px] text-slate-400 font-mono">Barcode: {r.barcode}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{r.manufacturer || '—'}</td>
                      <td className="px-6 py-4 text-slate-600">{r.officer_name || 'Officer'}</td>
                      <td className="px-6 py-4 text-slate-400">{(r.created_at || '').slice(0, 10)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isPass
                              ? 'bg-emerald-100 text-[#017374]'
                              : isFail
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPass && <CheckCircle2 className="w-3 h-3" />}
                          {isFail && <XCircle className="w-3 h-3" />}
                          {!isPass && !isFail && <AlertTriangle className="w-3 h-3" />}
                          {r.compliance_result || 'PENDING'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={(e) => handleOpenPdf(e, r.inspection_id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-[#017374] hover:bg-[#E5F0EC] transition-all text-xs font-bold"
                            title="View PDF Certificate in browser"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <a
                            href={`${BASE}/inspections/${r.inspection_id}/report/download`}
                            download
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#017374] hover:border-[#017374] transition-all text-xs font-semibold"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
