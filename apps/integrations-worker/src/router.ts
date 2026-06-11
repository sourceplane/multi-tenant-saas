import type { Env } from "./env.js";
import { handleHealth } from "./handlers/health.js";
import { handleGithubSetupCallback } from "./handlers/setup.js";
import { handleGithubWebhookIngest } from "./handlers/ingest.js";
import { handleListDeliveries, handleReplayDelivery } from "./handlers/deliveries.js";
import {
  handleConnectIntegration,
  handleGetIntegration,
  handleListIntegrations,
  handleRevokeIntegration,
} from "./handlers/connections.js";
import {
  generateRequestId,
  parseConnectionPublicId,
  parseInboundDeliveryPublicId,
  parseOrgPublicId,
} from "./ids.js";
import { asUuid } from "@saas/db/ids";
import { errorResponse, methodNotAllowed, notFound } from "./http.js";

const REQUEST_ID_RE = /^[\w-]{1,128}$/;

export interface ActorContext {
  subjectId: string;
  subjectType: string;
}

function resolveRequestId(request: Request): string {
  const header = request.headers.get("x-request-id");
  if (header && REQUEST_ID_RE.test(header)) return header;
  return generateRequestId();
}

function resolveActor(request: Request): ActorContext | null {
  const subjectId = request.headers.get("x-actor-subject-id");
  const subjectType = request.headers.get("x-actor-subject-type");
  if (!subjectId || !subjectType) return null;
  return { subjectId, subjectType };
}

const ORG_INTEGRATIONS_RE = /^\/v1\/organizations\/([^/]+)\/integrations$/;
const ORG_INTEGRATIONS_CONNECT_RE = /^\/v1\/organizations\/([^/]+)\/integrations\/github\/connect$/;
const ORG_INTEGRATION_RE = /^\/v1\/organizations\/([^/]+)\/integrations\/([^/]+)$/;
const ORG_DELIVERIES_RE = /^\/v1\/organizations\/([^/]+)\/integrations\/([^/]+)\/deliveries$/;
const ORG_DELIVERY_REPLAY_RE =
  /^\/v1\/organizations\/([^/]+)\/integrations\/([^/]+)\/deliveries\/([^/]+)\/replay$/;
const GITHUB_SETUP_PATH = "/ingress/github/setup";
const GITHUB_WEBHOOK_PATH = "/ingress/github/webhook";

export async function route(request: Request, env: Env): Promise<Response> {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Health check — no auth required
  if (pathname === "/health") {
    return handleHealth(env, requestId);
  }

  // Install-callback ingress (design §4/§5): authenticated by signed state,
  // not by a bearer token — reached only via api-edge's allowlisted forward.
  if (pathname === GITHUB_SETUP_PATH) {
    if (request.method !== "GET") return methodNotAllowed(requestId);
    return handleGithubSetupCallback(request, env, requestId);
  }

  // Inbound webhook ingress: authenticated by HMAC over the raw body, never
  // by a bearer token (design §5). Verify-insert-ack; the cron drain does
  // the rest.
  if (pathname === GITHUB_WEBHOOK_PATH) {
    if (request.method !== "POST") return methodNotAllowed(requestId);
    return handleGithubWebhookIngest(request, env, requestId);
  }

  // Everything below is the authenticated org surface.
  if (!env.PLATFORM_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }
  if (!env.MEMBERSHIP_WORKER || !env.POLICY_WORKER) {
    return errorResponse("internal_error", "Authorization services not configured", 503, requestId);
  }

  const actor = resolveActor(request);
  if (!actor) {
    return errorResponse("unauthenticated", "Authentication required", 401, requestId);
  }

  let m: RegExpMatchArray | null;

  m = pathname.match(ORG_INTEGRATIONS_CONNECT_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    if (!orgId) return notFound(requestId, pathname);
    if (request.method !== "POST") return methodNotAllowed(requestId);
    if (!env.BILLING_WORKER) {
      return errorResponse("internal_error", "Entitlement service not configured", 503, requestId);
    }
    return handleConnectIntegration(request, env, requestId, actor, orgId);
  }

  m = pathname.match(ORG_INTEGRATIONS_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    if (!orgId) return notFound(requestId, pathname);
    if (request.method !== "GET") return methodNotAllowed(requestId);
    return handleListIntegrations(request, env, requestId, actor, orgId);
  }

  m = pathname.match(ORG_DELIVERIES_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    const connectionUuid = parseConnectionPublicId(m[2]!);
    if (!orgId || !connectionUuid) return notFound(requestId, pathname);
    if (request.method !== "GET") return methodNotAllowed(requestId);
    return handleListDeliveries(request, env, requestId, actor, orgId, asUuid(connectionUuid));
  }

  m = pathname.match(ORG_DELIVERY_REPLAY_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    const connectionUuid = parseConnectionPublicId(m[2]!);
    const deliveryUuid = parseInboundDeliveryPublicId(m[3]!);
    if (!orgId || !connectionUuid || !deliveryUuid) return notFound(requestId, pathname);
    if (request.method !== "POST") return methodNotAllowed(requestId);
    return handleReplayDelivery(
      env,
      requestId,
      actor,
      orgId,
      asUuid(connectionUuid),
      asUuid(deliveryUuid),
    );
  }

  m = pathname.match(ORG_INTEGRATION_RE);
  if (m) {
    const orgId = parseOrgPublicId(m[1]!);
    const connectionUuid = parseConnectionPublicId(m[2]!);
    if (!orgId || !connectionUuid) return notFound(requestId, pathname);
    switch (request.method) {
      case "GET":
        return handleGetIntegration(env, requestId, actor, orgId, asUuid(connectionUuid));
      case "DELETE":
        return handleRevokeIntegration(env, requestId, actor, orgId, asUuid(connectionUuid));
      default:
        return methodNotAllowed(requestId);
    }
  }

  return notFound(requestId, pathname);
}
