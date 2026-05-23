import { createHyperdriveAdapter } from "@saas/db/hyperdrive";
import type { HealthStatus } from "@saas/contracts/health";
import type { Env } from "./env";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return handleHealth(env);
    }

    return Response.json(
      {
        error: "not_found",
        message: "Resource not found",
        path: url.pathname,
      },
      { status: 404 },
    );
  },
} satisfies ExportedHandler<Env>;

async function handleHealth(env: Env): Promise<Response> {
  const db = await checkDatabase(env);

  const status: HealthStatus = !db.configured
    ? "ok"
    : db.reachable
      ? "ok"
      : "degraded";

  const code = status === "ok" ? 200 : 503;

  return Response.json(
    {
      status,
      service: "api-edge",
      environment: env.ENVIRONMENT ?? "local",
      timestamp: new Date().toISOString(),
      checks: { database: db },
    },
    { status: code },
  );
}

async function checkDatabase(
  env: Env,
): Promise<{ configured: boolean; reachable: boolean }> {
  if (!env.SOURCEPLANE_DB) {
    return { configured: false, reachable: false };
  }

  const adapter = createHyperdriveAdapter(env.SOURCEPLANE_DB);
  try {
    return await adapter.ping();
  } finally {
    await adapter.dispose();
  }
}
