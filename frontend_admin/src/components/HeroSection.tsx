import React from 'react';
import {
  ClipboardCheck,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ArrowUp,
} from 'lucide-react';
import { InspectorIllustration } from './InspectorIllustration';
import { useLiveCompliance } from '../api/useLiveData';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export const HeroSection: React.FC = () => {
  const { data: c, live } = useLiveCompliance({ pass: 0, fail: 0, review: 0, passRate: 0 });
  const total = c.pass + c.fail + c.review;
  const adminName = (localStorage.getItem('doca_admin_name') || '').split(' ')[0];
  return (
    <div className="relative pt-2 pb-1">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left Column: Greeting + Metrics */}
        <div className="flex-1 space-y-6">
          {/* Greeting text */}
          <div>
            <div className="text-xs font-semibold text-[#017374] tracking-wide mb-1">
              {greeting()}{adminName ? `, ${adminName}.` : '.'} {live ? '' : '(offline preview)'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#12312b] tracking-tight leading-tight">
              Here's what needs<br />your attention.
            </h1>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 font-medium">
              <span className="text-slate-600 font-medium">
                District 4 • Maharashtra
              </span>
              <span className="flex items-center gap-1.5 text-[#017374] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
                System Live
              </span>
            </div>
          </div>

          {/* 4 Metric Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* 1. Inspections */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#E5F0EC] text-[#017374] flex items-center justify-center">
                  <ClipboardCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800 tracking-tight">{live ? total : '—'}</div>
                <div className="text-[11px] font-medium text-slate-400 mb-1">Inspections</div>
                <div className="flex items-center gap-0.5 text-[11px] font-semibold text-[#10b981]">
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                  <span>in live window</span>
                </div>
              </div>
            </div>

            {/* 2. Compliance */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#E5F0EC] text-[#017374] flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800 tracking-tight">{live ? `${c.passRate}%` : '—'}</div>
                <div className="text-[11px] font-medium text-slate-400 mb-1">Compliance</div>
                <div className="flex items-center gap-0.5 text-[11px] font-semibold text-[#10b981]">
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                  <span>{c.pass} passed verdicts</span>
                </div>
              </div>
            </div>

            {/* 3. Violations */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#fff7ed] text-[#E37820] flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800 tracking-tight">{live ? c.fail : '—'}</div>
                <div className="text-[11px] font-medium text-slate-400 mb-1">Violations</div>
                <div className="flex items-center gap-0.5 text-[11px] font-semibold text-[#E37820]">
                  <ArrowUp className="w-3 h-3 stroke-[2.5]" />
                  <span>failed verdicts</span>
                </div>
              </div>
            </div>

            {/* 4. AI Decisions */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/70 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-[#fefce8] text-[#FEB519] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-800 tracking-tight">{live ? c.review : '—'}</div>
                <div className="text-[11px] font-medium text-slate-400 mb-1">AI Decisions</div>
                <div className="text-[11px] font-semibold text-[#E37820]">
                  {c.fail} high priority
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Inspector Illustration */}
        <div className="w-full lg:w-[420px] flex items-center justify-center lg:justify-end shrink-0">
          <InspectorIllustration className="w-full max-w-[360px]" />
        </div>
      </div>
    </div>
  );
};
