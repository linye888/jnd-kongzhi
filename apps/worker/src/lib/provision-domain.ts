import type { Env } from "../env";
import { createCustomHostname, mapSslStatus } from "./cf";
import { bindPlatformWorkerDomain, buildDomainSetupGuide, getDomainKind } from "./domain-setup";
import { getDeployTarget, getServerIp } from "./platform-config";

export interface ProvisionDomainResult {
  sslStatus: "pending" | "active" | "failed" | "unknown";
  cfCustomHostnameId: string | null;
  setup: ReturnType<typeof buildDomainSetupGuide>;
  warnings: string[];
}

export async function provisionDomain(env: Env, hostname: string): Promise<ProvisionDomainResult> {
  const setup = buildDomainSetupGuide(env, hostname);
  const warnings: string[] = [];
  let sslStatus: ProvisionDomainResult["sslStatus"] = "unknown";
  let cfCustomHostnameId: string | null = null;

  if (getDeployTarget(env) === "self-hosted") {
    const ip = getServerIp(env) ?? "服务器 IP";
    warnings.push(`Ubuntu 自托管：请将 ${hostname} 的 DNS A 记录指向 ${ip}，并用 Certbot 配置 HTTPS。`);
    return { sslStatus, cfCustomHostnameId, setup, warnings };
  }

  if (setup.kind === "platform_subdomain") {
    const bind = await bindPlatformWorkerDomain(env, hostname);
    if (bind.ok) {
      sslStatus = "active";
      if (bind.message) warnings.push(bind.message);
    } else {
      warnings.push(bind.message ?? "Worker 绑定失败，请稍后在 Cloudflare 控制台手动绑定");
    }
    return { sslStatus, cfCustomHostnameId, setup, warnings };
  }

  sslStatus = "unknown";
  warnings.push("方案 A：请客户在自己的 Cloudflare 完成 CNAME 解析，证书由客户账号自动签发。");
  return { sslStatus, cfCustomHostnameId, setup, warnings };
}

/** 方案 B 备用：尝试 for SaaS Custom Hostname */
export async function provisionDomainSaas(env: Env, hostname: string): Promise<ProvisionDomainResult> {
  const setup = buildDomainSetupGuide(env, hostname);
  const warnings: string[] = [];
  const cf = await createCustomHostname(env, hostname);
  if (cf.warning) warnings.push(cf.warning);
  return {
    sslStatus: mapSslStatus(cf.result?.ssl.status),
    cfCustomHostnameId: cf.result?.id ?? null,
    setup,
    warnings,
  };
}

export { getDomainKind };
