import type { Env } from "../env.js";
import type { IdentityRepository } from "@saas/db/identity";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createIdentityRepository } from "@saas/db/identity";
import { createAuthService } from "../services/auth.js";
import { successResponse, errorResponse, extractBearerToken, validationError } from "../http.js";
import { parseSessionToken } from "../ids.js";

const MAX_DISPLAY_NAME_LENGTH = 120;
const ALLOWED_FIELDS = new Set(["displayName"]);

export interface HandleProfileDeps {
  repo?: IdentityRepository;
}

export async function handleProfile(
  request: Request,
  env: Env,
  requestId: string,
  deps?: HandleProfileDeps,
): Promise<Response> {
  const token = extractBearerToken(request);
  if (!token) {
    return errorResponse("unauthenticated", "Missing or invalid Authorization header", 401, requestId);
  }

  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  const executor = deps?.repo ? null : createSqlExecutor(env.SOURCEPLANE_DB);
  try {
    const repo = deps?.repo ?? createIdentityRepository(executor!);
    const auth = createAuthService({
      repo,
      now: () => new Date(),
      ctx: { requestId, ip: request.headers.get("cf-connecting-ip"), userAgent: request.headers.get("user-agent") },
    });

    if (request.method === "GET") {
      const result = await auth.getProfile(token);
      if ("error" in result) {
        return errorResponse(result.error, result.message, 401, requestId);
      }
      return successResponse({ user: result.user }, requestId, 200);
    }

    // PATCH
    // Reject API-key/service-principal tokens
    if (!parseSessionToken(token)) {
      return errorResponse("forbidden", "API keys cannot update user profiles", 403, requestId);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return validationError(requestId, { body: ["Must be a valid JSON object"] });
    }

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return validationError(requestId, { body: ["Must be a JSON object"] });
    }

    const bodyObj = body as Record<string, unknown>;

    // Check for unsupported fields
    const unsupportedFields = Object.keys(bodyObj).filter((k) => !ALLOWED_FIELDS.has(k));
    if (unsupportedFields.length > 0) {
      const fields: Record<string, string[]> = {};
      for (const f of unsupportedFields) {
        fields[f] = ["Unsupported field"];
      }
      return validationError(requestId, fields);
    }

    // Validate displayName is present
    if (!("displayName" in bodyObj)) {
      return validationError(requestId, { displayName: ["Required"] });
    }

    const rawDisplayName = bodyObj.displayName;
    if (rawDisplayName !== null && typeof rawDisplayName !== "string") {
      return validationError(requestId, { displayName: ["Must be a string or null"] });
    }

    let displayName: string | null = null;
    if (typeof rawDisplayName === "string") {
      const trimmed = rawDisplayName.trim();
      if (trimmed === "") {
        displayName = null;
      } else if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
        return validationError(requestId, { displayName: [`Must be at most ${MAX_DISPLAY_NAME_LENGTH} characters`] });
      } else {
        displayName = trimmed;
      }
    }

    const result = await auth.updateProfile(token, { displayName });
    if ("error" in result) {
      if (result.error === "unauthenticated") {
        return errorResponse(result.error, result.message, 401, requestId);
      }
      if (result.error === "forbidden") {
        return errorResponse(result.error, result.message, 403, requestId);
      }
      if (result.error === "validation_failed") {
        return validationError(requestId, (result.details as Record<string, string[]>) ?? {});
      }
      return errorResponse("internal_error", result.message, 500, requestId);
    }

    return successResponse({ user: result.user }, requestId, 200);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    if (executor) await executor.dispose();
  }
}
