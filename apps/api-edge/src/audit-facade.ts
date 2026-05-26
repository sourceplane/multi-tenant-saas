import type { Env } from "./env.js";
import { errorResponse } from "./http.js";

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

  const sessionResult = await resolveSession(request, env, requestId);
  if ("error" in sessionResult) {
    return sessionResult.error;
  }

  const headers = new Headers();
  headers.set("x-request-id", requestId);
  headers.set("x-actor-subject-id", sessionResult.subjectId);
  headers.set("x-actor-subject-type", sessionResult.subjectType);
  headers.set("x-actor-email", sessionResult.email);
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

interface SessionSuccess {
  subjectId: string;
  subjectType: string;
  email: string;
}

interface SessionFailure {
  error: Response;
}

async function resolveSession(
  request: Request,
  env: Env,
  requestId: string,
): Promise<SessionSuccess | SessionFailure> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return {
      error: errorResponse("unauthenticated", "Missing or invalid Authorization header", 401, requestId),
    };
  }

  const sessionHeaders = new Headers();
  sessionHeaders.set("authorization", authorization);
  sessionHeaders.set("x-request-id", requestId);

  const target = new URL("/v1/auth/session", "https://identity.internal");

  try {
    const response = await env.IDENTITY_WORKER!.fetch(target.toString(), {
      method: "GET",
      headers: sessionHeaders,
    });

    if (!response.ok) {
      return {
        error: errorResponse("unauthenticated", "Authentication failed", 401, requestId),
      };
    }

    const json = (await response.json()) as { data?: { user?: { id?: string; email?: string } } };
    const userId = json?.data?.user?.id;
    const userEmail = json?.data?.user?.email;
    if (!userId || !userEmail) {
      return {
        error: errorResponse("unauthenticated", "Authentication failed", 401, requestId),
      };
    }

    return { subjectId: userId, subjectType: "user", email: userEmail };
  } catch {
    return {
      error: errorResponse("internal_error", "Authentication service unavailable", 503, requestId),
    };
  }
}
