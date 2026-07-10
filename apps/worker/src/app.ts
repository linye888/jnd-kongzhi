import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import authRoutes from "./routes/auth";
import customerRoutes from "./routes/admin/customers";
import productRoutes from "./routes/admin/products";
import landingPageRoutes from "./routes/admin/landing-pages";
import templateRoutes from "./routes/admin/templates";
import domainRoutes from "./routes/admin/domains";
import statsRoutes from "./routes/admin/stats";
import userRoutes from "./routes/admin/users";
import eventRoutes from "./routes/events";
import { handleLandingRequest } from "./routes/landing";
import { getExecutionContext } from "./lib/runtime-context";

export function createApp(beforeLanding?: (app: Hono<{ Bindings: Env }>) => void) {
  const app = new Hono<{ Bindings: Env }>();

  app.use(
    "*",
    cors({
      origin: "*",
      allowHeaders: ["Content-Type", "Authorization"],
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.route("/api/auth", authRoutes);
  app.route("/api/admin/customers", customerRoutes);
  app.route("/api/admin/products", productRoutes);
  app.route("/api/admin/landing-pages", landingPageRoutes);
  app.route("/api/admin/templates", templateRoutes);
  app.route("/api/admin/domains", domainRoutes);
  app.route("/api/admin/stats", statsRoutes);
  app.route("/api/admin/users", userRoutes);
  app.route("/api/event", eventRoutes);

  app.get("/health", (c) => c.json({ ok: true }));

  beforeLanding?.(app);

  app.all("*", async (c) => {
    const ctx = getExecutionContext(c);
    const landing = await handleLandingRequest(c.req.raw, c.env, ctx);
    if (landing) return landing;
    return c.notFound();
  });

  return app;
}
