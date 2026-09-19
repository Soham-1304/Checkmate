export const BASE =
  (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';

export const token = () =>
  localStorage.getItem('doca_admin_token') ||
  (import.meta as any).env?.VITE_ADMIN_TOKEN ||
  '';

/** Returns true only if a real auth token exists in localStorage. */
export const isLiveConfigured = () => !!localStorage.getItem('doca_admin_token');

export async function ensureAdminToken(): Promise<string> {
  const existing = token();
  if (existing) return existing;
  // No auto-login — redirect to LoginGate instead.
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
