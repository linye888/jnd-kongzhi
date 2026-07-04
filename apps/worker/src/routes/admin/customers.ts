import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { auditLogs, customers } from "@lp-admin/db";
import type { Env } from "../../env";
import { authMiddleware } from "../../middleware/auth";
import { getDb, jsonResponse, errorResponse, nowIso } from "../../lib/utils";

const app = new Hono<{ Bindings: Env }>();
app.use("*", authMiddleware);

app.get("/", async (c) => {
  const db = getDb(c.env);
  const rows = await db.select().from(customers).orderBy(customers.id);
  return jsonResponse(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json<{ name: string; notes?: string }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const [row] = await db.insert(customers).values({ name: body.name, notes: body.notes ?? null, createdAt: ts, updatedAt: ts }).returning();
  await db.insert(auditLogs).values({ userId: c.get("user").id, action: "create", entityType: "customer", entityId: row.id, details: row.name, createdAt: ts });
  return jsonResponse(row, 201);
});

app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ name: string; notes?: string }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const [row] = await db.update(customers).set({ name: body.name, notes: body.notes ?? null, updatedAt: ts }).where(eq(customers.id, id)).returning();
  if (!row) return errorResponse("Not found", 404);
  return jsonResponse(row);
});

app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  await db.delete(customers).where(eq(customers.id, id));
  return jsonResponse({ deleted: true });
});

export default app;
