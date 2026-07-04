import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { auditLogs, users } from "@lp-admin/db";
import type { Env } from "../env";
import { hashPassword, signToken, verifyPassword } from "../lib/auth";
import { getDb, jsonResponse, errorResponse, nowIso } from "../lib/utils";

const app = new Hono<{ Bindings: Env }>();

app.post("/login", async (c) => {
  const body = await c.req.json<{ email: string; password: string }>();
  const db = getDb(c.env);
  const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
  if (!user || user.status !== "active") return errorResponse("Invalid credentials", 401);
  const valid = await verifyPassword(body.password, user.passwordHash);
  if (!valid) return errorResponse("Invalid credentials", 401);

  const token = await signToken({ id: user.id, email: user.email, name: user.name, role: user.role }, c.env.JWT_SECRET);
  return jsonResponse({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, createdAt: user.createdAt },
  });
});

app.get("/me", async (c) => {
  const header = c.req.header("Authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return errorResponse("Unauthorized", 401);
  const { verifyToken } = await import("../lib/auth");
  const authUser = await verifyToken(token, c.env.JWT_SECRET);
  if (!authUser) return errorResponse("Invalid token", 401);
  return jsonResponse(authUser);
});

app.post("/bootstrap", async (c) => {
  const db = getDb(c.env);
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) return errorResponse("Already bootstrapped", 400);

  const email = c.env.ADMIN_DEFAULT_EMAIL ?? "admin@example.com";
  const password = c.env.ADMIN_DEFAULT_PASSWORD ?? "admin123456";
  const ts = nowIso();
  const passwordHash = await hashPassword(password);
  const [created] = await db
    .insert(users)
    .values({ email, name: "Admin", passwordHash, role: "admin", status: "active", createdAt: ts, updatedAt: ts })
    .returning();

  await db.insert(auditLogs).values({
    userId: created.id,
    action: "bootstrap",
    entityType: "user",
    entityId: created.id,
    details: "Initial admin user created",
    createdAt: ts,
  });

  return jsonResponse({ email, password });
});

app.post("/seed", async (c) => {
  const { runSeed } = await import("../lib/seed");
  const result = await runSeed(c.env);
  return jsonResponse(result);
});

export default app;
