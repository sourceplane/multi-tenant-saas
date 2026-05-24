import type { Env } from "../env.js";
import type { ActorContext } from "../router.js";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createMembershipRepository } from "@saas/db/membership";
import { createOrganizationService } from "../services/organization.js";
import { successResponse, errorResponse, validationError } from "../http.js";

const NAME_MIN = 1;
const NAME_MAX = 100;
const SLUG_MIN = 2;
const SLUG_MAX = 63;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

interface CreateOrgBody {
  name?: unknown;
  slug?: unknown;
}

function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX);
}

export async function handleCreateOrganization(
  request: Request,
  env: Env,
  requestId: string,
  actor: ActorContext,
): Promise<Response> {
  let body: CreateOrgBody;
  try {
    body = (await request.json()) as CreateOrgBody;
  } catch {
    return errorResponse("bad_request", "Invalid JSON body", 400, requestId);
  }

  const fields: Record<string, string[]> = {};

  if (typeof body.name !== "string" || body.name.length < NAME_MIN || body.name.length > NAME_MAX) {
    fields.name = [`Must be between ${NAME_MIN} and ${NAME_MAX} characters`];
  }

  let slug: string;
  if (body.slug !== undefined) {
    if (typeof body.slug !== "string" || body.slug.length < SLUG_MIN || body.slug.length > SLUG_MAX) {
      fields.slug = [`Must be between ${SLUG_MIN} and ${SLUG_MAX} characters`];
    } else if (!SLUG_RE.test(body.slug.toLowerCase())) {
      fields.slug = ["Must contain only lowercase letters, numbers, and hyphens, and start/end with alphanumeric"];
    }
    slug = body.slug as string;
  } else if (typeof body.name === "string") {
    slug = generateSlugFromName(body.name);
    if (slug.length < SLUG_MIN) {
      slug = `org-${slug || crypto.randomUUID().slice(0, 8)}`;
    }
  } else {
    slug = "";
  }

  if (Object.keys(fields).length > 0) {
    return validationError(requestId, fields);
  }

  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Database not configured", 503, requestId);
  }

  const executor = createSqlExecutor(env.SOURCEPLANE_DB);
  try {
    const repo = createMembershipRepository(executor);
    const service = createOrganizationService({ repo, now: () => new Date() });
    const result = await service.createOrganization(actor, {
      name: body.name as string,
      slug,
      slugLower: slug.toLowerCase(),
    });

    if (!result.ok) {
      return errorResponse(result.code, result.message, result.status, requestId);
    }

    return successResponse(result.value, requestId, 201);
  } catch {
    return errorResponse("internal_error", "An unexpected error occurred", 500, requestId);
  } finally {
    await executor.dispose();
  }
}
