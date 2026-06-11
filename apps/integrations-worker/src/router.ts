import type { Env } from "./env.js";
import { handleHealth } from "./handlers/health.js";
import { generateRequestId } from "./ids.js";
import { notFound } from "./http.js";

const REQUEST_ID_RE = /^[\w-]{1,128}$/;

function resolveRequestId(request: Request): string {
  const header = request.headers.get("x-request-id");
  if (header && REQUEST_ID_RE.test(header)) return header;
  return generateRequestId();
}

/**
 * IG0: the worker is deliberately dormant — /health is the only route.
 * Connect flow, ingress, repo links, delivery log, and the token broker
 * land in IG1–IG4 (specs/epics/saas-integrations/implementation-plan.md).
 */
export function route(request: Request, env: Env): Promise<Response> | Response {
  const requestId = resolveRequestId(request);
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Health check — no auth required
  if (pathname === "/health") {
    return handleHealth(env, requestId);
  }

  return notFound(requestId, pathname);
}
