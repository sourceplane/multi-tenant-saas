import type { Env } from "./env.js";
import { errorResponse } from "./http.js";
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

  if (!env.IDENTITY_WORKER) {
    return errorResponse("internal_error", "Authentication service unavailable", 503, requestId);
  }

  if (!env.EVENTS_WORKER) {
    return errorResponse("internal_error", "Events service unavailable", 503, requestId);
  }

  const sessionResult = await resolveActor(request, env, requestId);
  if ("error" in sessionResult) {
    return sessionResult.error;
  }

  const headers = new Headers();
  headers.set("x-request-id", requestId);
  headers.set("x-actor-subject-id", sessionResult.subjectId);
  headers.set("x-actor-subject-type", sessionResult.subjectType);
  headers.set("x-actor-email", sessionResult.email);
  if (sessionResult.orgId) {
    headers.set("x-actor-org-id", sessionResult.orgId);
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
    return new Response(downstream.body, {
      status: downstream.status,
      headers: downstream.headers,
    });
  } catch {
    return errorResponse("internal_error", "Events service unavailable", 503, requestId);
  }
}
