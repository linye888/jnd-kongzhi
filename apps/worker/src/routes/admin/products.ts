import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { products } from "@lp-admin/db";
import type { Env } from "../../env";
import { authMiddleware } from "../../middleware/auth";
import { getDb, jsonResponse, errorResponse, nowIso } from "../../lib/utils";

const app = new Hono<{ Bindings: Env }>();
app.use("*", authMiddleware);

app.get("/", async (c) => {
  const customerId = c.req.query("customerId");
  const db = getDb(c.env);
  const rows = customerId
    ? await db.select().from(products).where(eq(products.customerId, Number(customerId)))
    : await db.select().from(products);
  return jsonResponse(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json<{ customerId: number; name: string }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const [row] = await db.insert(products).values({ customerId: body.customerId, name: body.name, createdAt: ts, updatedAt: ts }).returning();
  return jsonResponse(row, 201);
});

app.put("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ name: string }>();
  const db = getDb(c.env);
  const ts = nowIso();
  const [row] = await db.update(products).set({ name: body.name, updatedAt: ts }).where(eq(products.id, id)).returning();
  if (!row) return errorResponse("Not found", 404);
  return jsonResponse(row);
});

app.delete("/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const db = getDb(c.env);
  await db.delete(products).where(eq(products.id, id));
  return jsonResponse({ deleted: true });
});

export default app;
