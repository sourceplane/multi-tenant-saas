import type { Env } from "./env.js";
import { handleHealth } from "./handlers/health.js";
import { handleListPlans } from "./handlers/list-plans.js";
import { handleGetBillingCustomer } from "./handlers/get-customer.js";
import { handleGetBillingSummary } from "./handlers/get-summary.js";
import { handleListInvoices } from "./handlers/list-invoices.js";
import { handleListEntitlements } from "./handlers/list-entitlements.js";
import { errorResponse, notFound, methodNotAllowed } from "./http.js";
import { generateRequestId, parseOrgPublicId } from "./ids.js";

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

// ── Route patterns ──────────────────────────────────────────
const PLANS_RE = /^\/v1\/organizations\/([^/]+)\/billing\/plans$/;
const CUSTOMER_RE = /^\/v1\/organizations\/([^/]+)\/billing\/customer$/;
const SUMMARY_RE = /^\/v1\/organizations\/([^/]+)\/billing\/summary$/;
const INVOICES_RE = /^\/v1\/organizations\/([^/]+)\/billing\/invoices$/;
const ENTITLEMENTS_RE = /^\/v1\/organizations\/([^/]+)\/billing\/entitlements$/;

type RouteKind = "plans" | "customer" | "summary" | "invoices" | "entitlements";

interface MatchedRoute {
  kind: RouteKind;
  orgId: string;
}

function matchRoute(pathname: string): MatchedRoute | null {
  const patterns: Array<[RegExp, RouteKind]> = [
    [PLANS_RE, "plans"],
    [CUSTOMER_RE, "customer"],
    [SUMMARY_RE, "summary"],
    [INVOICES_RE, "invoices"],
    [ENTITLEMENTS_RE, "entitlements"],
  ];
  for (const [re, kind] of patterns) {
    const m = pathname.match(re);
    if (m) {
      const orgId = parseOrgPublicId(m[1]!);
      if (!orgId) return null;
      return { kind, orgId };
    }
  }
  return null;
}

export async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const requestId = resolveRequestId(request);

  try {
    if (url.pathname === "/health" && request.method === "GET") {
      return handleHealth(env, requestId);
    }

    const matched = matchRoute(url.pathname);
    if (!matched) {
      return notFound(requestId, url.pathname);
    }

    if (request.method !== "GET") {
      return methodNotAllowed(requestId);
    }

    const actor = resolveActor(request);
    if (!actor) {
      return errorResponse("unauthenticated", "Authentication required", 401, requestId);
    }

    switch (matched.kind) {
      case "plans":
        return handleListPlans(request, env, requestId, actor, matched.orgId);
      case "customer":
        return handleGetBillingCustomer(request, env, requestId, actor, matched.orgId);
      case "summary":
        return handleGetBillingSummary(request, env, requestId, actor, matched.orgId);
      case "invoices":
        return handleListInvoices(request, env, requestId, actor, matched.orgId);
      case "entitlements":
        return handleListEntitlements(request, env, requestId, actor, matched.orgId);
    }
  } catch {
    return errorResponse("internal_error", "Internal error", 500, requestId);
  }
}
