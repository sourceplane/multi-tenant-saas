import type { Env } from "./env.js";
import { errorResponse } from "./http.js";
import { enforceRateLimit, mergeRateLimitHeaders } from "./rate-limit.js";
import { resolveActor } from "./resolve-actor.js";

const ORG_AUDIT_RE = /^\/v1\/organizations\/[^/]+\/audit$/;

const FORWARDED_HEADERS = [
  "content-type",
  "x-request-id",
  "traceparent",
  "idempotency-key",
];

export function isAuditRoute(pathname: string): boolean {
  return ORG_AUDIT_RE.test(pathname);
}

export async function handleAuditRoute(
  request: Request,
  env: Env,
  requestId: string,
  pathname: string,
): Promise<Response> {
  if (request.method !== "GET") {
    return errorResponse("unsupported", "Method not allowed", 405, requestId);
  }

  const rateDecision = await enforceRateLimit(request, requestId, env, "audit");
  if (rateDecision.kind === "denied") {
    return rateDecision.response;
  }
  const rateHeaders = rateDecision.headers;

  if (!env.IDENTITY_WORKER) {
    return mergeRateLimitHeaders(
      errorResponse("internal_error", "Authentication service unavailable", 503, requestId),
      rateHeaders,
    );
  }

  if (!env.EVENTS_WORKER) {
    return mergeRateLimitHeaders(
      errorResponse("internal_error", "Events service unavailable", 503, requestId),
      rateHeaders,
    );
  }

  const sessionResult = await resolveActor(request, env, requestId);
  if ("error" in sessionResult) {
    return mergeRateLimitHeaders(sessionResult.error, rateHeaders);
  }

  const headers = new Headers();
  headers.set("x-request-id", requestId);
  headers.set("x-actor-subject-id", sessionResult.subjectId);
  headers.set("x-actor-subject-type", sessionResult.subjectType);
  headers.set("x-actor-email", sessionResult.email);
  if (sessionResult.orgId) {
  }
  for (const name of FORWARDED_HEADERS) {
    if (name === "x-request-id") continue;
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const url = new URL(request.url);
  const target = new URL(pathname + url.search, "https://events.internal");

  try {
    const downstream = await env.EVENTS_WORKER.fetch(target.toString(), {
      method: "GET",
      headers,
    });
    return mergeRateLimitHeaders(
      new Response(downstream.body, {
        status: downstream.status,
        headers: downstream.headers,
      }),
      rateHeaders,
    );
  } catch {
    return mergeRateLimitHeaders(
      errorResponse("internal_error", "Events service unavailable", 503, requestId),
      rateHeaders,
    );
  }
}
