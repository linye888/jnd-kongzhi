const CONFIGURED_API_BASE = import.meta.env.VITE_API_BASE ?? "";
const IS_SELF_HOSTED = import.meta.env.VITE_DEPLOY_TARGET === "self-hosted";
/** 仅 Cloudflare 版构建使用；Ubuntu 独立版不连接 CF 站 */
const CF_FALLBACK_API_BASE = "https://minishort.sbs";

function apiBaseCandidates(): string[] {
  if (IS_SELF_HOSTED) {
    return CONFIGURED_API_BASE ? [CONFIGURED_API_BASE] : [window.location.origin];
  }
  const bases = [CONFIGURED_API_BASE, CF_FALLBACK_API_BASE].filter(Boolean);
  return [...new Set(bases)];
}

export function getApiBase() {
  if (IS_SELF_HOSTED) return CONFIGURED_API_BASE || window.location.origin;
  return CONFIGURED_API_BASE || CF_FALLBACK_API_BASE;
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
  const bases = apiBaseCandidates();
  for (const base of bases) {
    try {
      const data = await requestOnce<T>(base, path, { ...init, headers });
      return data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (bases.length === 1) break;
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
