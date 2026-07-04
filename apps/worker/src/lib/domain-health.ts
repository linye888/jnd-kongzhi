import type { Env } from "../env";
import { resolveDomain } from "./domains";
import { handleLandingRequest } from "../routes/landing";

export type DomainHealthState = "healthy" | "unhealthy" | "inactive";

export interface DomainHealthResult {
  ok: boolean;
  status: DomainHealthState;
  statusCode?: number;
  message: string;
  checkedAt: string;
}

const noopCtx = { waitUntil: () => undefined } as ExecutionContext;

export async function checkDomainHealth(
  env: Env,
  hostname: string,
  domainStatus: string,
): Promise<DomainHealthResult> {
  const checkedAt = new Date().toISOString();

  if (domainStatus === "inactive") {
    return { ok: false, status: "inactive", message: "域名已停用", checkedAt };
  }

  const resolved = await resolveDomain(env, hostname);
  if (!resolved) {
    return {
      ok: false,
      status: "unhealthy",
      message: "后台未配置或未启用",
      checkedAt,
    };
  }

  try {
    const response = await handleLandingRequest(
      new Request(`https://${hostname}/`, { method: "GET" }),
      env,
      noopCtx,
    );

    if (!response) {
      return {
        ok: false,
        status: "unhealthy",
        message: "Worker 未处理该请求",
        checkedAt,
      };
    }

    const statusCode = response.status;
    if (statusCode === 200) {
      const snippet = (await response.text()).slice(0, 500);
      if (snippet.includes("Domain not configured")) {
        return {
          ok: false,
          status: "unhealthy",
          statusCode,
          message: "Host 未匹配到落地页",
          checkedAt,
        };
      }
      if (/<html/i.test(snippet) || /<!doctype/i.test(snippet)) {
        return { ok: true, status: "healthy", statusCode, message: "落地页正常", checkedAt };
      }
      return {
        ok: false,
        status: "unhealthy",
        statusCode,
        message: "响应内容异常",
        checkedAt,
      };
    }

    return {
      ok: false,
      status: "unhealthy",
      statusCode,
      message: statusCode === 403 ? "403 禁止访问，检查 Worker 绑定" : `HTTP ${statusCode}`,
      checkedAt,
    };
  } catch (error) {
    return {
      ok: false,
      status: "unhealthy",
      message: error instanceof Error ? error.message : "检测失败",
      checkedAt,
    };
  }
}

export async function checkDomainsHealth(
  env: Env,
  rows: Array<{ id: number; hostname: string; status: string }>,
): Promise<Array<{ id: number; hostname: string; health: DomainHealthResult }>> {
  const results = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      hostname: row.hostname,
      health: await checkDomainHealth(env, row.hostname, row.status),
    })),
  );
  return results;
}
