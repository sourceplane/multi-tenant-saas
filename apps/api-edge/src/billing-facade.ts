import type { Env } from "./env.js";
import { errorResponse } from "./http.js";
import { resolveActor } from "./resolve-actor.js";

const ORG_BILLING_PLANS_RE = /^\/v1\/organizations\/[^/]+\/billing\/plans$/;
const ORG_BILLING_CUSTOMER_RE = /^\/v1\/organizations\/[^/]+\/billing\/customer$/;
const ORG_BILLING_SUMMARY_RE = /^\/v1\/organizations\/[^/]+\/billing\/summary$/;
const ORG_BILLING_INVOICES_RE = /^\/v1\/organizations\/[^/]+\/billing\/invoices$/;
const ORG_BILLING_ENTITLEMENTS_RE = /^\/v1\/organizations\/[^/]+\/billing\/entitlements$/;

const FORWARDED_HEADERS = [
  "content-type",
  "x-request-id",
  "traceparent",
  "idempotency-key",
];

export function isBillingRoute(pathname: string): boolean {
  return (
    ORG_BILLING_PLANS_RE.test(pathname) ||
    ORG_BILLING_CUSTOMER_RE.test(pathname) ||
    ORG_BILLING_SUMMARY_RE.test(pathname) ||
    ORG_BILLING_INVOICES_RE.test(pathname) ||
    ORG_BILLING_ENTITLEMENTS_RE.test(pathname)
  );
}

export async function handleBillingRoute(
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

  if (!env.BILLING_WORKER) {
    return errorResponse("internal_error", "Billing service unavailable", 503, requestId);
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
  const target = new URL(pathname + url.search, "https://billing.internal");

  try {
    const downstream = await env.BILLING_WORKER.fetch(target.toString(), {
      method: "GET",
      headers,
    });
    return new Response(downstream.body, {
      status: downstream.status,
      headers: downstream.headers,
    });
  } catch {
    return errorResponse("internal_error", "Billing service unavailable", 503, requestId);
  }
}
