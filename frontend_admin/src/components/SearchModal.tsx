import React, { useState, useEffect } from 'react';
import { Search, X, Building2, Package, ArrowRight, Loader2, Barcode } from 'lucide-react';
import { api } from '../api/client';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInspection?: (backendId: string) => void;
  onSelectCompany?: (name: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectInspection,
  onSelectCompany,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [inspections, setInspections] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setInspections([]);
      setCompanies([]);
      return;
    }

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const q = query.trim().toLowerCase();
        const [repoRes, entRes] = await Promise.all([
          api<any>('/repository/search?limit=50').catch(() => ({ items: [] })),
          api<any[]>('/entities').catch(() => []),
        ]);

        const items = repoRes?.items ?? [];
        const entities = Array.isArray(entRes) ? entRes : [];

        if (!q) {
          setInspections(items.slice(0, 5));
          setCompanies(entities.slice(0, 4));
        } else {
          setInspections(
            items.filter(
              (i: any) =>
                (i.commodity || '').toLowerCase().includes(q) ||
                (i.brand || '').toLowerCase().includes(q) ||
                (i.manufacturer || '').toLowerCase().includes(q) ||
                (i.barcode || '').includes(q) ||
                (i.inspection_id || '').toLowerCase().includes(q)
            ).slice(0, 8)
          );
          setCompanies(
            entities.filter(
              (e: any) =>
                (e.legal_name || '').toLowerCase().includes(q) ||
                (e.gstin || '').toLowerCase().includes(q) ||
                (e.state || '').toLowerCase().includes(q)
            ).slice(0, 6)
          );
        }
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(t);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#8EC8BA]/50 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input */}
        <div className="p-4 border-b border-[#8EC8BA]/30 flex items-center gap-3">
          {loading ? (
            <Loader2 className="w-5 h-5 text-[#017374] animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-[#017374]" />
          )}
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search verified inspections, barcodes, or companies..."
            className="w-full text-sm outline-none text-slate-800 placeholder-slate-400 bg-transparent"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-[#E5F0EC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="overflow-y-auto p-3 space-y-4">
          {/* Inspections */}
          <div>
            <div className="text-[11px] font-bold text-[#017374] px-3 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Inspections & Commodities</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {inspections.length} matches
              </span>
            </div>
            {inspections.length === 0 ? (
              <div className="text-xs text-slate-400 px-3 py-2 italic">
                {query ? 'No matching inspections found' : 'Type to search inspections…'}
              </div>
            ) : (
              <div className="space-y-1">
                {inspections.map((item) => (
                  <div
                    key={item.inspection_id}
                    onClick={() => {
                      if (onSelectInspection) onSelectInspection(item.inspection_id);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#E5F0EC]/60 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#017374]/10 text-[#017374] flex items-center justify-center shrink-0">
                        <Package className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate group-hover:text-[#017374]">
                          {item.brand} {item.commodity}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                          <span>{item.inspection_id.slice(0, 8).toUpperCase()}</span>
                          <span>•</span>
                          <span>{item.manufacturer || 'Manufacturer'}</span>
                          {item.barcode && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <Barcode className="w-3 h-3" /> {item.barcode}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#017374] shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Companies */}
          <div>
            <div className="text-[11px] font-bold text-[#E37820] px-3 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Registered Companies</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {companies.length} matches
              </span>
            </div>
            {companies.length === 0 ? (
              <div className="text-xs text-slate-400 px-3 py-2 italic">
                {query ? 'No matching companies found' : 'Type to search entities…'}
              </div>
            ) : (
              <div className="space-y-1">
                {companies.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (onSelectCompany) onSelectCompany(c.legal_name);
                      onClose();
                    }}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50/70 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#E37820]/10 text-[#E37820] flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 truncate group-hover:text-[#E37820]">
                          {c.legal_name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {c.type} • {c.state || 'India'} {c.gstin ? `• ${c.gstin}` : ''}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#E37820] shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#E5F0EC]/30 border-t border-[#8EC8BA]/30 flex items-center justify-between text-[11px] text-slate-400">
          <span>Search backed by live Legal Metrology Registry</span>
          <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-500 font-mono">
            ESC to close
          </kbd>
        </div>
      </div>
    </div>
  );
};
