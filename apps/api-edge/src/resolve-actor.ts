import type { Env } from "./env";
import { errorResponse } from "./http";

export interface ActorInfo {
  subjectId: string;
  subjectType: string;
  email: string;
  orgId?: string;
}

export interface ActorFailure {
  error: Response;
}

/**
 * Resolves bearer token to actor context via IDENTITY_WORKER /v1/auth/resolve.
 * Supports both user sessions (sps_ses_ tokens) and API keys (service_principal).
 */
export async function resolveActor(
  request: Request,
  env: Env,
  requestId: string,
): Promise<ActorInfo | ActorFailure> {
  const authorization = request.headers.get("authorization");
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return {
      error: errorResponse("unauthenticated", "Missing or invalid Authorization header", 401, requestId),
    };
  }

  if (!env.IDENTITY_WORKER) {
    return {
      error: errorResponse("internal_error", "Authentication service unavailable", 503, requestId),
    };
  }

  const headers = new Headers();
  headers.set("authorization", authorization);
  headers.set("x-request-id", requestId);

  const target = new URL("/v1/auth/resolve", "https://identity.internal");

  try {
    const response = await env.IDENTITY_WORKER.fetch(target.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      return {
        error: errorResponse("unauthenticated", "Authentication failed", 401, requestId),
      };
    }

    const json = (await response.json()) as {
      data?: {
        actor?: {
          actorType?: string;
          actorId?: string;
          email?: string;
          orgId?: string;
        };
        user?: { id?: string; email?: string };
      };
    };

    const actor = json?.data?.actor;
    if (!actor?.actorType || !actor?.actorId) {
      return {
        error: errorResponse("unauthenticated", "Authentication failed", 401, requestId),
      };
    }

    // For user actors, prefer user-level email; for service_principal, use actor email or empty
    const email = json?.data?.user?.email ?? actor.email ?? "";

    return {
      subjectId: actor.actorId,
      subjectType: actor.actorType,
      email,
      ...(actor.orgId && { orgId: actor.orgId }),
    };
  } catch {
    return {
      error: errorResponse("internal_error", "Authentication service unavailable", 503, requestId),
    };
  }
}
