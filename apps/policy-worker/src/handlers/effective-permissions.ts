import type { EffectivePermissionsRequest } from "@saas/contracts/policy";
import { listEffectivePermissions } from "@saas/policy-engine";
import { successResponse, errorResponse, validationError } from "../http.js";

export async function handleEffectivePermissions(
  request: Request,
  requestId: string,
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("bad_request", "Invalid JSON body", 400, requestId);
  }

  const validation = validateEffectivePermissionsBody(body);
  if (validation) {
    return validationError(requestId, validation);
  }

  const input = body as EffectivePermissionsRequest;
  const result = listEffectivePermissions(input);

  return successResponse(result, requestId);
}

function validateEffectivePermissionsBody(body: unknown): Record<string, string[]> | null {
  if (!body || typeof body !== "object") {
    return { body: ["must be an object"] };
  }

  const errors: Record<string, string[]> = {};
  const b = body as Record<string, unknown>;

  if (!b.subject || typeof b.subject !== "object") {
    errors.subject = ["must be an object with type and id"];
  } else {
    const s = b.subject as Record<string, unknown>;
    if (!s.type || typeof s.type !== "string") {
      errors["subject.type"] = ["must be a string"];
    }
    if (!s.id || typeof s.id !== "string") {
      errors["subject.id"] = ["must be a string"];
    }
  }

  if (!b.resource || typeof b.resource !== "object") {
    errors.resource = ["must be an object with kind and orgId"];
  } else {
    const r = b.resource as Record<string, unknown>;
    if (!r.kind || typeof r.kind !== "string") {
      errors["resource.kind"] = ["must be a string"];
    }
    if (!r.orgId || typeof r.orgId !== "string") {
      errors["resource.orgId"] = ["must be a string"];
    }
  }

  if (!b.context || typeof b.context !== "object") {
    errors.context = ["must be an object with memberships array"];
  } else {
    const c = b.context as Record<string, unknown>;
    if (!Array.isArray(c.memberships)) {
      errors["context.memberships"] = ["must be an array"];
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}
