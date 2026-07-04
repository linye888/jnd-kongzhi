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

  const url = `${API_BASE}${path}`;
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    const hint = API_BASE
      ? `无法连接 API（${API_BASE}），请确认 Worker 自定义域可用且非 workers.dev`
      : "未配置 VITE_API_BASE，请在构建时设置 API 地址（如 https://minishort.sbs）";
    throw new Error(hint);
  }

  let payload: { success?: boolean; data?: T; error?: string };
  try {
    payload = await response.json();
  } catch {
    throw new Error(`API 返回异常（HTTP ${response.status}），请检查 ${API_BASE || "API 地址"} 是否正确`);
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
  return `${API_BASE}/api/admin/landing-pages/${landingPageId}/preview`;
}
