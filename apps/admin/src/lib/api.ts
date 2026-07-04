const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export function getApiBase() {
  return API_BASE;
}

export function getToken(): string | null {
  return localStorage.getItem("lp_admin_token");
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem("lp_admin_token", token);
  else localStorage.removeItem("lp_admin_token");
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  let payload: { success?: boolean; data?: T; error?: string };
  try {
    payload = await response.json();
  } catch {
    throw new Error(`无法连接 API（${response.status}），请检查网络或 VITE_API_BASE 配置`);
  }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? `Request failed (${response.status})`);
  }
  return payload.data as T;
}

export function formatRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

export function defaultRange(days = 7) {
  const to = new Date().toISOString().slice(0, 10);
  const from = new Date(Date.now() - (days - 1) * 86400000).toISOString().slice(0, 10);
  return { from, to };
}

export function previewUrl(landingPageId: number) {
  return `${API_BASE}/api/admin/landing-pages/${landingPageId}/preview`;
}
