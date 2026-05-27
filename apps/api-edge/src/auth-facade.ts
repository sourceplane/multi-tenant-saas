import type { Env } from "./env";
import { errorResponse } from "./http";

const AUTH_ROUTES: Record<string, string> = {
  "/v1/auth/login/start": "POST",
  "/v1/auth/login/complete": "POST",
  "/v1/auth/session": "GET",
  "/v1/auth/logout": "POST",
  "/v1/auth/security-events": "GET",
};

const FORWARDED_HEADERS = [
  "authorization",
  "content-type",
  "x-request-id",
  "traceparent",
  "idempotency-key",
];

export function isAuthRoute(pathname: string): boolean {
  return pathname in AUTH_ROUTES;
}

export async function handleAuthRoute(
  request: Request,
  env: Env,
  requestId: string,
  pathname: string,
): Promise<Response> {
  const expectedMethod = AUTH_ROUTES[pathname];
  if (!expectedMethod) {
    return errorResponse("not_found", `Route not found: ${pathname}`, 404, requestId);
  }

  if (request.method !== expectedMethod) {
    return errorResponse("unsupported", "Method not allowed", 405, requestId);
  }

  if (!env.IDENTITY_WORKER) {
    return errorResponse(
      "internal_error",
      "Authentication service unavailable",
      503,
      requestId,
    );
  }

  const headers = new Headers();
  headers.set("x-request-id", requestId);
  for (const name of FORWARDED_HEADERS) {
    if (name === "x-request-id") continue;
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const url = new URL(request.url);
  const target = new URL(pathname + url.search, "https://identity.internal");

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method === "POST") {
    init.body = request.body;
  }

  try {
    const downstream = await env.IDENTITY_WORKER.fetch(target.toString(), init);
    return new Response(downstream.body, {
      status: downstream.status,
      headers: downstream.headers,
    });
  } catch {
    return errorResponse(
      "internal_error",
      "Authentication service unavailable",
      503,
      requestId,
    );
  }
}
