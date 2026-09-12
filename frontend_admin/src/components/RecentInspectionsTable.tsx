import React from 'react';
import { Clock, ArrowRight, Package } from 'lucide-react';
import { useLiveRecent } from '../api/useLiveData';

interface RecentInspectionsTableProps {
  onViewAll?: () => void;
  onSelectInspection?: (backendId: string, shortId: string) => void;
}

export const RecentInspectionsTable: React.FC<RecentInspectionsTableProps> = ({
  onViewAll,
  onSelectInspection,
}) => {
  const { data: rows, live } = useLiveRecent([]);
  return (
    <div className="bg-white rounded-3xl p-6 border border-[#8EC8BA]/40 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#017374]/10 text-[#017374] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 leading-tight">On the radar</h2>
            <p className="text-[11px] text-slate-500">Live inspection activity from enforcement field</p>
          </div>
        </div>
        {live && (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#017374] bg-[#E5F0EC] px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            Live Sync
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {rows.length === 0 ? (
          <div className="py-10 text-center space-y-2">
            <Package className="w-8 h-8 text-slate-300 mx-auto" />
            <div className="text-xs font-semibold text-slate-600">No inspections on the radar yet</div>
            <p className="text-[11px] text-slate-400">
              New inspections submitted by field officers or started by admin will appear here in real-time.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[11px] font-semibold text-slate-400 border-b border-slate-100 pb-3">
                <th className="pb-3 font-semibold">ID</th>
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">Company</th>
                <th className="pb-3 font-semibold">Officer</th>
                <th className="pb-3 font-semibold">Date</th>
                <th className="pb-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-medium">
              {rows.map((row) => {
                const isPending = row.status === 'Pending';
                const isApproved = row.status === 'Approved';
                const isRejected = row.status === 'Rejected';

                return (
                  <tr
                    key={row.backendId || row.id}
                    onClick={() => onSelectInspection?.(row.backendId || row.id, row.id)}
                    className="hover:bg-[#E5F0EC]/60 cursor-pointer transition-colors group"
                  >
                    <td className="py-3 font-semibold text-[#017374] group-hover:underline">
                      {row.id}
                    </td>
                    <td className="py-3 font-bold text-slate-800">{row.product}</td>
                    <td className="py-3 text-slate-500">{row.company}</td>
                    <td className="py-3 text-slate-600">{row.officer}</td>
                    <td className="py-3 text-slate-400">{row.date}</td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          isPending
                            ? 'bg-[#FEB519]/20 text-[#9a6206]'
                            : isApproved
                            ? 'bg-[#017374]/15 text-[#017374]'
                            : isRejected
                            ? 'bg-[#dc2626]/15 text-[#dc2626]'
                            : 'bg-[#E37820]/15 text-[#E37820]'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isPending
                              ? 'bg-[#FEB519]'
                              : isApproved
                              ? 'bg-[#017374]'
                              : isRejected
                              ? 'bg-[#dc2626]'
                              : 'bg-[#E37820]'
                          }`}
                        />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Link */}
      <div className="pt-2 flex justify-end">
        <button
          onClick={onViewAll}
          className="flex items-center gap-1 text-xs font-bold text-[#017374] hover:text-[#015758] transition-colors"
        >
          <span>View all inspections</span>
          <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
