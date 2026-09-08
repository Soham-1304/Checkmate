import React, { useState, useEffect } from 'react';
import { Search, X, Building2, Package, ShieldCheck, ArrowRight } from 'lucide-react';
import { RECENT_INSPECTIONS, HIGH_RISK_COMPANIES } from '../data/mockData';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInspection?: (id: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectInspection,
}) => {
  const [query, setQuery] = useState('');

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

  if (!isOpen) return null;

  const filteredInspections = RECENT_INSPECTIONS.filter(
    (i) =>
      i.product.toLowerCase().includes(query.toLowerCase()) ||
      i.company.toLowerCase().includes(query.toLowerCase()) ||
      i.id.toLowerCase().includes(query.toLowerCase())
  );

  const filteredCompanies = HIGH_RISK_COMPANIES.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-[#8EC8BA]/50 overflow-hidden">
        {/* Search Input */}
        <div className="p-4 border-b border-[#8EC8BA]/30 flex items-center gap-3">
          <Search className="w-5 h-5 text-[#017374]" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search companies, products, inspection IDs..."
            className="w-full text-sm outline-none text-slate-800 placeholder-slate-400"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-[#E5F0EC]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-3 space-y-4">
          {/* Inspections */}
          <div>
            <div className="text-[11px] font-bold text-[#017374] px-3 uppercase tracking-wider mb-1">
              Inspections
            </div>
            <div className="space-y-1">
              {filteredInspections.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (onSelectInspection) onSelectInspection(item.id);
                    onClose();
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#E5F0EC]/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#017374]/10 text-[#017374] flex items-center justify-center">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{item.product}</div>
                      <div className="text-[11px] text-slate-400">
                        {item.id} • {item.company}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-[#017374]" />
                </div>
              ))}
            </div>
          </div>

          {/* Companies */}
          <div>
            <div className="text-[11px] font-bold text-[#017374] px-3 uppercase tracking-wider mb-1">
              Companies
            </div>
            <div className="space-y-1">
              {filteredCompanies.slice(0, 3).map((comp) => (
                <div
                  key={comp.name}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#E5F0EC]/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-[#8EC8BA]/25 text-[#017374] flex items-center justify-center">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">{comp.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Compliance: {comp.compliance}% • {comp.violations} violations
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      comp.risk === 'High'
                        ? 'bg-[#E37820]/15 text-[#E37820]'
                        : 'bg-[#FEB519]/25 text-[#9a6206]'
                    }`}
                  >
                    {comp.risk}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#E5F0EC]/50 border-t border-[#8EC8BA]/30 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Press ESC to exit</span>
          <span className="flex items-center gap-1 font-semibold text-[#017374]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#017374]" />
            ComplyAI Search Engine
          </span>
        </div>
      </div>
    </div>
  );
};
