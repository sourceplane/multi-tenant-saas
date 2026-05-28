import type { Env } from "../env.js";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createIdentityRepository } from "@saas/db/identity";
import { createAuthService } from "../services/auth.js";
import { successResponse, errorResponse, extractBearerToken } from "../http.js";

export async function handleResolveBearer(request: Request, env: Env, requestId: string): Promise<Response> {
  const token = extractBearerToken(request);
  if (!token) {
    return errorResponse("unauthenticated", "Missing or invalid Authorization header", 401, requestId);
  }

  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  const executor = createSqlExecutor(env.SOURCEPLANE_DB);
  try {
    const repo = createIdentityRepository(executor);
    const auth = createAuthService({ repo, now: () => new Date() });
    const result = await auth.resolveBearer(token);

    if ("error" in result) {
      return errorResponse(result.error, result.message, 401, requestId);
    }

    return successResponse(
      {
        actor: {
          actorType: result.actorType,
          actorId: result.actorId,
          ...(result.orgId !== undefined && { orgId: result.orgId }),
          ...(result.projectId !== undefined && { projectId: result.projectId }),
          ...(result.displayName !== undefined && { displayName: result.displayName }),
          ...(result.email !== undefined && { email: result.email }),
        },
        ...(result.session && {
          session: {
            id: result.session.id,
            expiresAt: result.session.expiresAt.toISOString(),
            createdAt: result.session.createdAt.toISOString(),
          },
        }),
        ...(result.user && { user: result.user }),
      },
      requestId,
      200,
    );
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    await executor.dispose();
  }
}
