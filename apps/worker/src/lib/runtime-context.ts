function noopWaitUntil(promise: Promise<unknown>) {
  void promise.catch((err) => console.error("[waitUntil]", err));
}

const fallbackCtx = { waitUntil: noopWaitUntil };

/** Cloudflare Workers 有 executionCtx；Node.js 上访问会抛错，需兼容处理 */
export function getExecutionContext(c: { executionCtx: ExecutionContext }): Pick<ExecutionContext, "waitUntil"> {
  try {
    return c.executionCtx;
  } catch {
    return fallbackCtx;
  }
}
