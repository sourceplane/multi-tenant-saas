import { createHyperdriveAdapter } from "@saas/db/hyperdrive";
import type { HealthStatus } from "@saas/contracts/health";
import type { Env } from "./env";
import { resolveRequestId, notFound } from "./http";
import { handlePreflight, applyCorsHeaders } from "./cors";
import { isAuthRoute, handleAuthRoute } from "./auth-facade";
import { isOrgRoute, handleOrgRoute } from "./org-facade";
import { isProjectRoute, handleProjectRoute } from "./project-facade";
import { isAuditRoute, handleAuditRoute } from "./audit-facade";
import { isConfigRoute, handleConfigRoute } from "./config-facade";
import { isWebhooksRoute, handleWebhooksRoute } from "./webhooks-facade";
import { isMeteringRoute, handleMeteringRoute } from "./metering-facade";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const preflight = handlePreflight(request, env);
    if (preflight) return preflight;

    const url = new URL(request.url);
    const requestId = resolveRequestId(request);

    let response: Response;

    if (url.pathname === "/health") {
      response = await handleHealth(env);
    } else if (isAuthRoute(url.pathname)) {
      response = await handleAuthRoute(request, env, requestId, url.pathname);
    } else if (isAuditRoute(url.pathname)) {
      response = await handleAuditRoute(request, env, requestId, url.pathname);
    } else if (isConfigRoute(url.pathname)) {
      response = await handleConfigRoute(request, env, requestId, url.pathname);
    } else if (isWebhooksRoute(url.pathname)) {
      response = await handleWebhooksRoute(request, env, requestId, url.pathname);
    } else if (isMeteringRoute(url.pathname)) {
      response = await handleMeteringRoute(request, env, requestId, url.pathname);
    } else if (isProjectRoute(url.pathname)) {
      response = await handleProjectRoute(request, env, requestId, url.pathname);
    } else if (isOrgRoute(url.pathname)) {
      response = await handleOrgRoute(request, env, requestId, url.pathname);
    } else {
      response = notFound(requestId, url.pathname);
    }

    return applyCorsHeaders(response, request, env);
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
