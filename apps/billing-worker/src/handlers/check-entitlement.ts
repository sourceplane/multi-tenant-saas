import type { Env } from "../env.js";
import type {
  CheckBillingEntitlementRequest,
  CheckBillingEntitlementResponse,
} from "@saas/contracts/billing";
import type { BillingRepository } from "@saas/db/billing";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createBillingRepository } from "@saas/db/billing";
import { errorResponse, successResponse, validationError } from "../http.js";
import { parseOrgPublicId } from "../ids.js";

// Entitlement keys are stable machine identifiers like "feature.custom_domains"
// or "limit.projects". Constrain to a conservative character set so the route
// cannot be abused to smuggle arbitrary strings into downstream logs/queries.
const ENTITLEMENT_KEY_RE = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/;
const ENTITLEMENT_KEY_MAX = 128;

interface ParsedRequest {
  publicOrgId: string;
  orgId: string;
  entitlementKey: string;
}

export function parseCheckEntitlementBody(
  body: unknown,
): ParsedRequest | { error: string } {
  if (!body || typeof body !== "object") {
    return { error: "request body must be a JSON object" };
  }
  const obj = body as Record<string, unknown>;
  const rawOrgId = obj.orgId;
  const rawKey = obj.entitlementKey;
  if (typeof rawOrgId !== "string" || rawOrgId.length === 0) {
    return { error: "orgId is required" };
  }
  if (typeof rawKey !== "string" || rawKey.length === 0) {
    return { error: "entitlementKey is required" };
  }
  if (rawKey.length > ENTITLEMENT_KEY_MAX) {
    return { error: "entitlementKey is too long" };
  }
  if (!ENTITLEMENT_KEY_RE.test(rawKey)) {
    return { error: "entitlementKey is malformed" };
  }
  const orgId = parseOrgPublicId(rawOrgId);
  if (!orgId) {
    return { error: "orgId is malformed" };
  }
  return { publicOrgId: rawOrgId, orgId, entitlementKey: rawKey };
}

export type DecideEntitlementOutcome =
  | { kind: "decision"; body: CheckBillingEntitlementResponse }
  | { kind: "repo_error" };

/**
 * Pure decision logic over a billing repository. Exposed for unit-testing.
 *
 * - Found + enabled → allowed decision with safe entitlement details.
 * - Found + disabled → denied with reason 'disabled'.
 * - Missing (not_found) → denied with reason 'not_configured' (fail-closed,
 *   but as a domain-negative success, NOT an internal error).
 * - Any other repo error → repo_error sentinel for caller to surface as 5xx.
 */
export async function decideEntitlement(
  repo: Pick<BillingRepository, "getEntitlement">,
  parsed: ParsedRequest,
): Promise<DecideEntitlementOutcome> {
  const result = await repo.getEntitlement(parsed.orgId, parsed.entitlementKey);

  if (!result.ok) {
    if (result.error.kind === "not_found") {
      return {
        kind: "decision",
        body: {
          allowed: false,
          orgId: parsed.publicOrgId,
          entitlementKey: parsed.entitlementKey,
          reason: "not_configured",
        },
      };
    }
    return { kind: "repo_error" };
  }

  const entitlement = result.value;
  if (!entitlement.enabled) {
    return {
      kind: "decision",
      body: {
        allowed: false,
        orgId: parsed.publicOrgId,
        entitlementKey: parsed.entitlementKey,
        reason: "disabled",
      },
    };
  }

  return {
    kind: "decision",
    body: {
      allowed: true,
      orgId: parsed.publicOrgId,
      entitlementKey: parsed.entitlementKey,
      valueType: entitlement.valueType,
      limitValue: entitlement.limitValue,
      source: entitlement.source,
      subscriptionId: entitlement.subscriptionId,
    },
  };
}

export interface CheckEntitlementDeps {
  repoFactory?: (env: Env) => Pick<BillingRepository, "getEntitlement">;
}

function defaultRepoFactory(
  env: Env,
): Pick<BillingRepository, "getEntitlement"> {
  const executor = createSqlExecutor(env.SOURCEPLANE_DB!);
  return createBillingRepository(executor);
}

export async function handleCheckEntitlement(
  request: Request,
  env: Env,
  requestId: string,
  deps: CheckEntitlementDeps = {},
): Promise<Response> {
  if (request.method !== "POST") {
    return errorResponse("method_not_allowed", "Method not allowed", 405, requestId);
  }

  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Service misconfigured", 503, requestId);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return validationError(requestId, "request body is not valid JSON");
  }

  const parsed = parseCheckEntitlementBody(payload);
  if ("error" in parsed) {
    return validationError(requestId, parsed.error);
  }

  const repo = (deps.repoFactory ?? defaultRepoFactory)(env);
  const outcome = await decideEntitlement(repo, parsed);

  if (outcome.kind === "repo_error") {
    return errorResponse("internal_error", "Failed to check entitlement", 503, requestId);
  }
  return successResponse(outcome.body, requestId);
}

// Re-export the request type so the router/tests can reference the canonical
// contract shape without reaching across packages directly.
export type { CheckBillingEntitlementRequest };
