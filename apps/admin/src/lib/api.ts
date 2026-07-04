const FALLBACK_API_BASE = "https://minishort.sbs";
const CONFIGURED_API_BASE = import.meta.env.VITE_API_BASE ?? "";

function apiBaseCandidates(): string[] {
  const bases = [CONFIGURED_API_BASE, FALLBACK_API_BASE].filter(Boolean);
  return [...new Set(bases)];
}

export function getApiBase() {
  return CONFIGURED_API_BASE || FALLBACK_API_BASE;
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

  let lastError: Error | null = null;
  for (const base of apiBaseCandidates()) {
    try {
      const data = await requestOnce<T>(base, path, { ...init, headers });
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (apiBaseCandidates().length === 1) break;
    }
  }
  throw lastError ?? new Error("无法连接 API");
}

async function requestOnce<T>(base: string, path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, init);
  } catch {
    throw new Error(`无法连接 API（${base}）`);
  }

  let payload: { success?: boolean; data?: T; error?: string };
  try {
    payload = await response.json();
  } catch {
    throw new Error(`API 返回异常（HTTP ${response.status}，${base}）`);
  }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? `请求失败（HTTP ${response.status}）`);
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
  return `${getApiBase()}/api/admin/landing-pages/${landingPageId}/preview`;
}
