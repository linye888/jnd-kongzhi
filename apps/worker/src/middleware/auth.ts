import { createMiddleware } from "hono/factory";
import type { Env } from "../env";
import { verifyToken } from "../lib/auth";
import { errorResponse } from "../lib/utils";

export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return errorResponse("Unauthorized", 401);

  const user = await verifyToken(token, c.env.JWT_SECRET);
  if (!user) return errorResponse("Invalid token", 401);

  c.set("user", user);
  await next();
});
