import React, { useState } from 'react';
import { Loader2, LogOut, AlertTriangle } from 'lucide-react';
import { isLiveConfigured } from '../api/client';

const BASE = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export function triggerSignOut() {
  localStorage.removeItem('doca_admin_token');
  localStorage.removeItem('doca_admin_name');
  localStorage.removeItem('doca_admin_role');
  window.dispatchEvent(new CustomEvent('doca-signout'));
}

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authed, setAuthed] = useState(isLiveConfigured());
  const [email, setEmail] = useState('admin@doca.gov.in');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${BASE}/auth/login/json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((data as any)?.detail ?? `Login failed (${res.status})`);
        return;
      }
      localStorage.setItem('doca_admin_token', (data as any).access_token);
      localStorage.setItem('doca_admin_name', (data as any).name ?? '');
      localStorage.setItem('doca_admin_role', (data as any).role ?? '');
      setAuthed(true);
    } catch {
      setError('Cannot reach the backend. Is it running on :8000?');
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    localStorage.removeItem('doca_admin_token');
    localStorage.removeItem('doca_admin_name');
    localStorage.removeItem('doca_admin_role');
    setAuthed(false);
    setPassword('');
  };

  React.useEffect(() => {
    const handleSignOut = () => signOut();
    window.addEventListener('doca-signout', handleSignOut);
    return () => window.removeEventListener('doca-signout', handleSignOut);
  }, []);

  if (authed) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#edf3f1] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl border border-[#8EC8BA]/40 shadow-xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center overflow-hidden">
              <img src="/logo-mark.png" alt="Checkmate" className="w-9 h-9 object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-black text-[#12312b] leading-tight">Checkmate Admin</h1>
              <p className="text-[11px] text-slate-500 font-medium">AI Compliance & Inspection</p>
            </div>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Official Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
                placeholder="admin@doca.gov.in"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#017374] bg-[#E5F0EC]/30"
                placeholder="••••••••••"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#017374] hover:bg-[#015758] text-white text-sm font-bold transition-all shadow-sm disabled:opacity-50"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Sign in to Registry
            </button>
          </form>

          <p className="mt-5 text-[10px] text-slate-400 text-center leading-relaxed">
            Seeded demo accounts — admin@doca.gov.in / Admin@12345<br />
            officer@doca.gov.in / Officer@12345
          </p>
        </div>
      </div>
    </div>
  );
};
