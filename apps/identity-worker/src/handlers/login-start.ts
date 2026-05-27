import type { Env } from "../env.js";
import type { LoginStartResponse } from "@saas/contracts/auth";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createIdentityRepository } from "@saas/db/identity";
import { createAuthService } from "../services/auth.js";
import { successResponse, errorResponse, validationError } from "../http.js";
import { extractRequestContext } from "../request-context.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function handleLoginStart(request: Request, env: Env, requestId: string): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("bad_request", "Invalid JSON body", 400, requestId);
  }

  if (!body || typeof body !== "object" || !("email" in body)) {
    return validationError(requestId, { email: ["Email is required"] });
  }

  const { email } = body as { email: unknown };
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return validationError(requestId, { email: ["A valid email address is required"] });
  }

  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  const executor = createSqlExecutor(env.SOURCEPLANE_DB);
  try {
    const repo = createIdentityRepository(executor);
    const ctx = extractRequestContext(request, requestId);
    const auth = createAuthService({ repo, now: () => new Date(), ctx });
    const result = await auth.startLogin(email);

    if ("error" in result) {
      return errorResponse(result.error, result.message, 500, requestId);
    }

    const isDebug = env.DEBUG_DELIVERY === "true";
    const response: LoginStartResponse = {
      challengeId: result.challengeId,
      expiresAt: result.expiresAt.toISOString(),
      delivery: {
        mode: isDebug ? "local_debug" : "email",
        emailHint: result.emailHint,
        ...(isDebug ? { code: result.rawCode } : {}),
      },
    };

    return successResponse(response, requestId, 200);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    await executor.dispose();
  }
}
