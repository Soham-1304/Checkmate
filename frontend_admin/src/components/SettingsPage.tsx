import React, { useState, useEffect } from 'react';
import { Settings, Scale, Server, User, ShieldCheck, Check, Loader2, RefreshCw } from 'lucide-react';
import { api, token, BASE } from '../api/client';

export const SettingsPage: React.FC = () => {
  const [ruleSets, setRuleSets] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const BASE_URL = BASE;

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api<any[]>('/rule-sets').catch(() => []),
      api<any>('/auth/me').catch(() => null),
    ])
      .then(([rs, me]) => {
        setRuleSets(Array.isArray(rs) ? rs : []);
        setCurrentUser(me);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestConnection = async () => {
    setStatusMessage('Testing connection to backend API...');
    try {
      const res = await fetch(`${BASE_URL}/dashboard/violations`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.ok) {
        setStatusMessage('Connection Verified: FastAPI backend is live and responding (HTTP 200).');
      } else {
        setStatusMessage(`Connection Warning: Backend responded with status ${res.status}.`);
      }
    } catch {
      setStatusMessage('Connection Failed: Could not reach backend server at ' + BASE_URL);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <div className="text-xs font-bold text-[#017374] tracking-wider uppercase mb-1">
          SYSTEM & REGULATORY SPECIFICATIONS
        </div>
        <h1 className="text-3xl font-black text-[#12312b] tracking-tight leading-tight">
          System Settings & Statutory Rule Sets
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configured Legal Metrology rules, API communication layer, and administrative authentication state
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Backend & Environment Card */}
        <div className="bg-white p-6 rounded-3xl border border-[#8EC8BA]/40 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Backend Engine Connectivity</h3>
              <p className="text-xs text-slate-500">FastAPI REST & RapidOCR Neural Services</p>
            </div>
          </div>

          <div className="p-4 bg-[#E5F0EC]/40 rounded-2xl border border-[#8EC8BA]/30 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">API Endpoint Base:</span>
              <span className="font-mono font-bold text-slate-800">{BASE_URL}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Authentication:</span>
              <span className="font-bold text-[#017374]">JWT Bearer (HS256)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">OCR Engine:</span>
              <span className="font-bold text-slate-800">RapidOCR / ONNX Server-Side</span>
            </div>
          </div>

          {statusMessage && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium">
              {statusMessage}
            </div>
          )}

          <div className="pt-2 flex gap-3">
            <button
              onClick={handleTestConnection}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#017374] hover:bg-[#015758] text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Test API Ping</span>
            </button>
          </div>
        </div>

        {/* Administrator Profile Card */}
        <div className="bg-white p-6 rounded-3xl border border-[#8EC8BA]/40 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E37820]/10 text-[#E37820] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">Authenticated Administrator</h3>
              <p className="text-xs text-slate-500">Registry enforcement authority permissions</p>
            </div>
          </div>

          <div className="p-4 bg-amber-50/40 rounded-2xl border border-amber-200/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Admin Name:</span>
              <span className="font-bold text-slate-800">{currentUser?.name || 'DoCA Enforcement Admin'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Official Email:</span>
              <span className="font-mono font-bold text-slate-800">{currentUser?.email || 'admin@doca.gov.in'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Access Role:</span>
              <span className="font-bold text-[#E37820]">{currentUser?.role || 'ADMIN'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Jurisdiction:</span>
              <span className="font-bold text-slate-800">District 4 • Maharashtra, India</span>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-400">
            Enforcement capabilities: full review, violation notice issuance, commodity assignment, and entity clearance.
          </div>
        </div>
      </div>

      {/* Statutory Rule Sets Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#8EC8BA]/40 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#017374]/10 text-[#017374] flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Configured Legal Metrology Rule Sets</h3>
            <p className="text-xs text-slate-500">Standard rules evaluating mandatory declarations, font size and quantities</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-400">Loading statutory rule sets...</div>
        ) : ruleSets.length === 0 ? (
          <div className="p-4 bg-[#E5F0EC]/30 rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="font-bold text-slate-800">The Legal Metrology (Packaged Commodities) Rules, 2011</div>
            <p className="text-slate-600">
              Active statutory rules: Rule 6 (Mandatory Declarations on Retail Packages), Rule 7 (Principal Display Panel Font Size & Numeral Standards), and Second Schedule (Prescribed Standard Quantities).
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ruleSets.map((rs: any) => (
              <div key={rs.id} className="p-4 bg-[#E5F0EC]/30 rounded-2xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">{rs.name}</span>
                  <span className="text-[10px] font-bold text-[#017374] bg-[#E5F0EC] px-2 py-0.5 rounded-full">
                    Active Statutory Standard
                  </span>
                </div>
                <p className="text-xs text-slate-500">{rs.description || 'Legal Metrology statutory compliance rule set'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
