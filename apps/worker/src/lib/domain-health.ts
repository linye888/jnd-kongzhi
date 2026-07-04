export type DomainHealthState = "healthy" | "unhealthy" | "inactive";

export interface DomainHealthResult {
  ok: boolean;
  status: DomainHealthState;
  statusCode?: number;
  message: string;
  checkedAt: string;
}

const CHECK_TIMEOUT_MS = 8000;

export async function checkDomainHealth(
  hostname: string,
  domainStatus: string,
): Promise<DomainHealthResult> {
  const checkedAt = new Date().toISOString();

  if (domainStatus === "inactive") {
    return { ok: false, status: "inactive", message: "域名已停用", checkedAt };
  }

  try {
    const response = await fetch(`https://${hostname}/`, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
      headers: {
        "User-Agent": "LP-Admin-HealthCheck/1.0",
        Accept: "text/html",
      },
    });

    const statusCode = response.status;

    if (statusCode === 200) {
      const snippet = (await response.text()).slice(0, 500);
      if (snippet.includes("Domain not configured")) {
        return {
          ok: false,
          status: "unhealthy",
          statusCode,
          message: "DNS 可能已通，但后台未匹配该 Host",
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

    if (statusCode === 403) {
      return {
        ok: false,
        status: "unhealthy",
        statusCode,
        message: "403 禁止访问，检查 Worker 是否已绑定",
        checkedAt,
      };
    }

    if (statusCode === 404) {
      return {
        ok: false,
        status: "unhealthy",
        statusCode,
        message: "404 未找到，检查后台是否已添加",
        checkedAt,
      };
    }

    return {
      ok: false,
      status: "unhealthy",
      statusCode,
      message: `HTTP ${statusCode}`,
      checkedAt,
    };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "连接超时（DNS 或 SSL 可能未就绪）"
        : error instanceof Error
          ? error.message
          : "连接失败";
    return { ok: false, status: "unhealthy", message, checkedAt };
  }
}

export async function checkDomainsHealth(
  rows: Array<{ id: number; hostname: string; status: string }>,
): Promise<Array<{ id: number; hostname: string; health: DomainHealthResult }>> {
  const results = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      hostname: row.hostname,
      health: await checkDomainHealth(row.hostname, row.status),
    })),
  );
  return results;
}
