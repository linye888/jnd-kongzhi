import { Hono } from "hono";
import type { Env } from "../../env";
import { authMiddleware } from "../../middleware/auth";
import { listLandingTemplateOptions } from "../../lib/landing-page-factory";
import { jsonResponse } from "../../lib/utils";

const app = new Hono<{ Bindings: Env }>();
app.use("*", authMiddleware);

app.get("/", async (c) => jsonResponse(listLandingTemplateOptions()));

export default app;
