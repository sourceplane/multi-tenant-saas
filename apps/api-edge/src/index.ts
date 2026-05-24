import { createHyperdriveAdapter } from "@saas/db/hyperdrive";
import type { HealthStatus } from "@saas/contracts/health";
import type { Env } from "./env";
import { resolveRequestId, notFound } from "./http";
import { isAuthRoute, handleAuthRoute } from "./auth-facade";
import { isOrgRoute, handleOrgRoute } from "./org-facade";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const requestId = resolveRequestId(request);

    if (url.pathname === "/health") {
      return handleHealth(env);
    }

    if (isAuthRoute(url.pathname)) {
      return handleAuthRoute(request, env, requestId, url.pathname);
    }

    if (isOrgRoute(url.pathname)) {
      return handleOrgRoute(request, env, requestId, url.pathname);
    }

    return notFound(requestId, url.pathname);
  },
} satisfies ExportedHandler<Env>;

async function handleHealth(env: Env): Promise<Response> {
  const db = await checkDatabase(env);
  const identity = checkIdentityBinding(env);
  const membership = checkMembershipBinding(env);

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
      checks: { database: db, identity, membership },
    },
    { status: code },
  );
}

function checkIdentityBinding(env: Env): { configured: boolean } {
  return { configured: !!env.IDENTITY_WORKER };
}

function checkMembershipBinding(env: Env): { configured: boolean } {
  return { configured: !!env.MEMBERSHIP_WORKER };
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
