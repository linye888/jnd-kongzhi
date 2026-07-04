import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { users } from "@lp-admin/db";
import type { Env } from "../../env";
import { authMiddleware } from "../../middleware/auth";
import { hashPassword } from "../../lib/auth";
import { getDb, jsonResponse, errorResponse, nowIso } from "../../lib/utils";

const app = new Hono<{ Bindings: Env }>();
app.use("*", authMiddleware);

app.get("/", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status, createdAt: users.createdAt }).from(users);
  return jsonResponse(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json<{ email: string; name: string; password: string; role?: string }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const passwordHash = await hashPassword(body.password);
  const [row] = await db
    .insert(users)
    .values({ email: body.email, name: body.name, passwordHash, role: body.role ?? "operator", status: "active", createdAt: ts, updatedAt: ts })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status, createdAt: users.createdAt });
  return jsonResponse(row, 201);
});

app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ name?: string; role?: string; status?: string; password?: string }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const update: Record<string, unknown> = { updatedAt: ts };
  if (body.name) update.name = body.name;
  if (body.role) update.role = body.role;
  if (body.status) update.status = body.status;
  if (body.password) update.passwordHash = await hashPassword(body.password);
  const [row] = await db.update(users).set(update).where(eq(users.id, id)).returning({ id: users.id, email: users.email, name: users.name, role: users.role, status: users.status, createdAt: users.createdAt });
  if (!row) return errorResponse("Not found", 404);
  return jsonResponse(row);
});

export default app;
