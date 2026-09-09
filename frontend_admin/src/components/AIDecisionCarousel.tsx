import React from 'react';
import { Sparkles, Info, ArrowRight } from 'lucide-react';
import { AIAnalysisItem } from '../types';
import { AI_ANALYSIS_ITEMS } from '../data/mockData';
import { useLiveAIDecisions } from '../api/useLiveData';
import { ProductMockup } from './ProductMockup';

interface AIDecisionCarouselProps {
  onReviewItem: (item: AIAnalysisItem) => void;
}

export const AIDecisionCarousel: React.FC<AIDecisionCarouselProps> = ({ onReviewItem }) => {
  const { data: liveAIItems } = useLiveAIDecisions(AI_ANALYSIS_ITEMS);

  return (
    <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center font-bold text-sm border border-[#8EC8BA]/40">
            <span className="font-bold text-xs tracking-tighter text-[#017374]">AI</span>
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800">AI found it. You decide.</h2>
            <p className="text-xs text-slate-500">7 analyses are ready for your final decision.</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
          <span>AI recommends. Admin approves.</span>
          <button title="System AI Protocol Info" className="text-slate-400 hover:text-[#017374] transition-colors">
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid of 4 AI Analysis Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
        {liveAIItems.map((item) => {
          const mockupType = (['amul', 'britannia', 'mdh', 'parleg', 'maggi', 'fortune', 'haldirams', 'tatatea'] as const)
            .find((t) => item.productName.toLowerCase().replace(/[^a-z]/g, '').includes(t.replace('parleg', 'parle').replace('tatatea', 'tata'))) ?? 'haldirams';
          const isNonCompliant = item.status === 'Non-Compliant';
          const isCompliant = item.status === 'Compliant';
          const isReviewNeeded = item.status === 'Review Needed';

          return (
            <div
              key={item.id}
              className="bg-[#f8faf9] rounded-2xl p-4 border border-slate-200/80 shadow-2xs hover:shadow-card-hover transition-all flex flex-col justify-between relative group"
            >
              {/* Top Row: Code + Priority badge */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-400">{item.code}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    item.priority === 'High'
                      ? 'bg-[#E37820]/15 text-[#E37820]'
                      : 'bg-[#FEB519]/25 text-[#9a6206]'
                  }`}
                >
                  {item.priority}
                </span>
              </div>

              {/* Product Info with Realistic SVG Mockup */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-14 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                  <ProductMockup type={mockupType} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-[#017374] transition-colors">
                    {item.productName}
                  </h3>

                  {/* Status badge + Confidence */}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        isNonCompliant
                          ? 'bg-rose-100/70 text-rose-700'
                          : isCompliant
                          ? 'bg-emerald-100/70 text-[#017374]'
                          : 'bg-amber-100/70 text-amber-700'
                      }`}
                    >
                      {item.status}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.confidence}% confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="text-[11px] text-slate-500 mb-3.5">
                <span className="text-slate-400">Reason: </span>
                <span className="font-medium text-slate-700">{item.reason}</span>
              </div>

              {/* Action Button */}
              <button
                onClick={() => onReviewItem(item)}
                className="w-full flex items-center justify-center gap-1.5 bg-[#E37820] hover:bg-[#c96414] active:scale-[0.99] text-white text-xs font-bold py-2 rounded-xl transition-all shadow-xs"
              >
                <span>Review</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
