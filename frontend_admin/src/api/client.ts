const BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const token = () =>
  localStorage.getItem('doca_admin_token') ||
  (import.meta as any).env?.VITE_ADMIN_TOKEN ||
  '';

export async function ensureAdminToken(): Promise<string> {
  const existing = token();
  if (existing) return existing;
  try {
    const res = await fetch(`${BASE}/auth/login/json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@doca.gov.in', password: 'Admin@12345' }),
    });
    if (res.ok) {
      const data = await res.json();
      localStorage.setItem('doca_admin_token', data.access_token);
      localStorage.setItem('doca_admin_name', data.name || 'DOCA Enforcement Admin');
      localStorage.setItem('doca_admin_role', data.role || 'ADMIN');
      return data.access_token;
    }
  } catch {}
  return '';
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let authToken = token();
  if (!authToken && !path.includes('/auth/login')) {
    authToken = await ensureAdminToken();
  }

  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

export const isLiveConfigured = () => true;

export interface AssignmentPayload {
  commodity_id: string;
  assigned_to: string;
  due_date?: string;
  notes?: string;
}

export async function createAssignmentApi(payload: AssignmentPayload) {
  return api<any>('/assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAssignmentsApi(officer_id?: string) {
  const q = officer_id ? `?officer_id=${officer_id}` : '';
  return api<any[]>(`/assignments${q}`);
}

export async function fetchCommoditiesApi() {
  const data = await api<any>('/commodities');
  return Array.isArray(data) ? data : data.commodities ?? [];
}

export async function fetchUsersApi() {
  const data = await api<any>('/users');
  return Array.isArray(data) ? data : data.users ?? [];
}
