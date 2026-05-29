import type { CheckBillingEntitlementResponse } from "@saas/contracts/billing";

/**
 * Internal caller identity presented to billing-worker on the
 * service-binding-only entitlement-check route. This is a non-secret
 * provenance contract: only Workers explicitly bound to billing-worker
 * over a Cloudflare service binding can present this header, so it
 * cannot be reached from public traffic.
 *
 * Keep this value stable and in sync with billing-worker's allow-list
 * (apps/billing-worker/src/router.ts: ALLOWED_INTERNAL_CALLERS).
 */
export const INTERNAL_CALLER = "membership-worker";

const INTERNAL_CALLER_HEADER = "x-internal-caller";

export type BillingEntitlementResult =
  | { kind: "decision"; decision: CheckBillingEntitlementResponse }
  | { kind: "service_error" };

/**
 * Calls billing-worker's private entitlement-check seam over a service
 * binding. Fails closed: any network exception, non-OK HTTP status, or
 * malformed JSON envelope surfaces as `service_error`. Successful HTTP
 * 200 responses with a valid envelope are returned verbatim as a
 * `decision` (which may itself be allowed or denied).
 *
 * The caller decides how to interpret a denial (e.g. quantity vs. boolean)
 * — this client deliberately does not bake in policy.
 */
export async function checkBillingEntitlement(
  billingWorker: Fetcher,
  orgPublicId: string,
  entitlementKey: string,
  requestId: string,
): Promise<BillingEntitlementResult> {
  let response: Response;
  try {
    response = await billingWorker.fetch(
      "http://billing-worker/v1/internal/billing/entitlements/check",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": requestId,
          [INTERNAL_CALLER_HEADER]: INTERNAL_CALLER,
        },
        body: JSON.stringify({ orgId: orgPublicId, entitlementKey }),
      },
    );
  } catch {
    return { kind: "service_error" };
  }

  if (!response.ok) {
    return { kind: "service_error" };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return { kind: "service_error" };
  }

  if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
    return { kind: "service_error" };
  }

  const data = (parsed as { data: unknown }).data;
  if (!data || typeof data !== "object") {
    return { kind: "service_error" };
  }

  const obj = data as Record<string, unknown>;
  if (typeof obj.allowed !== "boolean") {
    return { kind: "service_error" };
  }
  if (typeof obj.orgId !== "string" || typeof obj.entitlementKey !== "string") {
    return { kind: "service_error" };
  }

  return {
    kind: "decision",
    decision: data as CheckBillingEntitlementResponse,
  };
}

export type MembersEntitlementGate =
  | { kind: "allow" }
  | { kind: "deny"; reason: string; message: string }
  | { kind: "service_error" };

/**
 * Pure decision logic that interprets a billing entitlement response for
 * the `limit.members` quantity gate against the current billable-member
 * count (active members + pending invitations). Exposed for unit-testing.
 *
 * Semantics (per Task 0080 / specs/components/11-billing.md):
 * - allowed:false  → deny (reason = billing's reason: disabled | not_configured)
 * - allowed:true + valueType !== "quantity" → deny (malformed_limit)
 * - allowed:true + valueType "quantity" + limitValue null → allow (unlimited)
 * - allowed:true + valueType "quantity" + numeric limitValue:
 *     - billableCount  < limitValue → allow
 *     - billableCount >= limitValue → deny (limit_reached)
 *
 * The function fails closed on any unexpected shape.
 */
export function decideMembersLimit(
  decision: CheckBillingEntitlementResponse,
  billableCount: number,
): MembersEntitlementGate {
  if (!decision.allowed) {
    return {
      kind: "deny",
      reason: decision.reason,
      message:
        decision.reason === "disabled"
          ? "Inviting members is disabled by your current plan"
          : "Inviting members is not available for this organization",
    };
  }
  if (decision.valueType !== "quantity") {
    return {
      kind: "deny",
      reason: "malformed_limit",
      message: "Inviting members is not permitted by your current plan",
    };
  }
  if (decision.limitValue === null) {
    return { kind: "allow" };
  }
  if (
    typeof decision.limitValue !== "number" ||
    !Number.isFinite(decision.limitValue) ||
    decision.limitValue < 0
  ) {
    return {
      kind: "deny",
      reason: "malformed_limit",
      message: "Inviting members is not permitted by your current plan",
    };
  }
  if (!Number.isFinite(billableCount) || billableCount < 0) {
    return { kind: "service_error" };
  }
  if (billableCount < decision.limitValue) {
    return { kind: "allow" };
  }
  return {
    kind: "deny",
    reason: "limit_reached",
    message: "Your plan's member limit has been reached",
  };
}
