import type { Env } from "../env.js";
import type { BillingRepository } from "@saas/db/billing";
import type { EventsRepository } from "@saas/db/events";
import { createSqlExecutor } from "@saas/db/hyperdrive";
import { createBillingRepository } from "@saas/db/billing";
import { createEventsRepository } from "@saas/db/events";
import { errorResponse, successResponse, methodNotAllowed, notFound, validationError } from "../http.js";
import { parseOrgPublicId, generateUuid } from "../ids.js";
import { DEFAULT_PLAN_CODE, getPlanDefinition, isKnownPlanCode } from "../plan-catalog.js";
import { assignPlanWithRepos, type ProviderLink } from "./assign-plan.js";
import { createDefaultBillingProviderRegistry } from "../billing-provider/registry.js";
import type { BillingProvider, NormalizedEvent } from "../billing-provider/types.js";

/**
 * Provider-webhook intake (BP1).
 *
 * Public path: `POST /v1/billing/webhooks/<provider>`. Trust comes from the
 * adapter's signature verification (fail-closed), NOT from an actor identity —
 * so this route deliberately requires no `x-actor-*` headers. (BP2 adds the
 * api-edge raw-body passthrough that forwards the bytes + signature headers
 * here.)
 *
 * Flow: verify → dedupe (`billing.provider_webhook_events`) inside the same
 * transaction as the state change → reuse `assign-plan` materialization /
 * invoice mirror → emit existing events (best-effort). Materialization is
 * synchronous-and-durable: we only 200 after the durable write commits, so a
 * provider retry can never be lost (a failed apply rolls back the dedupe row
 * and the retry re-runs). This stays well within Polar's 10s ack budget.
 */

type WebhookRepo = Pick<
  BillingRepository,
  | "createPlan"
  | "getPlanByCode"
  | "upsertBillingCustomer"
  | "getBillingCustomer"
  | "getActiveSubscription"
  | "createSubscription"
  | "updateSubscription"
  | "upsertEntitlement"
  | "upsertInvoice"
  | "recordProviderWebhookEvent"
>;
type EventsSlice = Pick<EventsRepository, "appendEventWithAudit">;

const SYSTEM_ACTOR = { id: "system", type: "system" };

export type ApplyResult =
  | { kind: "duplicate" }
  | { kind: "ignored"; reason: string }
  | { kind: "applied"; action: string }
  | { kind: "repo_error" };

// ── Config helpers ─────────────────────────────────────────────────────

/**
 * Parse `POLAR_PRODUCT_MAP` (JSON `{ planCode: productId }`) into a reverse
 * lookup `productId → planCode`, keeping only known catalog plan codes. Invalid
 * JSON yields an empty map (checkout for an unmapped product is then ignored).
 */
export function parseProductMap(raw: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  if (!raw) return out;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!parsed || typeof parsed !== "object") return out;
  for (const [planCode, productId] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof productId === "string" && productId.length > 0 && isKnownPlanCode(planCode)) {
      out.set(productId, planCode);
    }
  }
  return out;
}

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Accept only plain https display URLs; reject anything that could embed a secret. */
function safeHostedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return null;
    // No query/fragment → cannot smuggle a bearer token or session secret.
    if (u.search || u.hash) return null;
    return u.toString();
  } catch {
    return null;
  }
}

// ── Materialization core (testable with fakes; no executor/transaction) ──

export async function applyNormalizedEvent(
  repo: WebhookRepo,
  events: EventsSlice | null,
  event: NormalizedEvent,
  opts: {
    now: Date;
    genId: () => string;
    requestId: string;
    productMap: Map<string, string>;
  },
): Promise<ApplyResult> {
  const { now, genId, requestId, productMap } = opts;

  // 1. Idempotent intake: dedupe by opaque provider event id, inside the caller's
  //    transaction. A redelivery short-circuits before any state change.
  const recorded = await repo.recordProviderWebhookEvent({
    id: genId(),
    provider: event.provider,
    eventId: event.providerEventId,
    eventType: event.type,
  });
  if (!recorded.ok) return { kind: "repo_error" };
  if (recorded.value.duplicate) return { kind: "duplicate" };

  // 2. Dispatch on the normalized type.
  switch (event.type) {
    case "subscription.activated":
    case "subscription.updated":
    case "subscription.canceled":
      return applySubscriptionEvent(repo, events, event, { now, genId, requestId, productMap });
    case "invoice.recorded":
    case "invoice.paid":
      return applyInvoiceEvent(repo, events, event, { now, genId, requestId });
    case "ignored":
      return { kind: "ignored", reason: `unhandled:${event.providerType}` };
    default:
      // payment.failed (dunning is BP4) and any future normalized type.
      return { kind: "ignored", reason: `unsupported:${event.type}` };
  }
}

async function applySubscriptionEvent(
  repo: WebhookRepo,
  events: EventsSlice | null,
  event: Extract<NormalizedEvent, { type: `subscription.${string}` }>,
  opts: { now: Date; genId: () => string; requestId: string; productMap: Map<string, string> },
): Promise<ApplyResult> {
  const { now, genId, requestId, productMap } = opts;

  // Cancellation (Polar `revoked`) downgrades to the default plan per the
  // parent-epic policy. Otherwise resolve the purchased plan from the product map.
  const planCode =
    event.type === "subscription.canceled"
      ? DEFAULT_PLAN_CODE
      : (event.productId ? productMap.get(event.productId) : undefined);
  if (!planCode) return { kind: "ignored", reason: "unmapped_product" };

  const def = getPlanDefinition(planCode);
  if (!def) return { kind: "ignored", reason: "unknown_plan" };

  if (!event.orgId) return { kind: "ignored", reason: "unresolved_org" };
  const orgId = parseOrgPublicId(event.orgId);
  if (!orgId) return { kind: "ignored", reason: "malformed_org" };

  const parsed = { publicOrgId: event.orgId, orgId, planCode };

  // On downgrade the new (free) subscription is not provider-managed, so it
  // carries no provider subscription id — but we keep the customer's provider
  // linkage so a future checkout reuses the same Polar customer.
  const provider: ProviderLink =
    event.type === "subscription.canceled"
      ? { id: event.provider, customerId: event.providerCustomerId }
      : {
          id: event.provider,
          customerId: event.providerCustomerId,
          subscriptionId: event.providerSubscriptionId,
          currentPeriodStart: toDate(event.currentPeriodStart),
          currentPeriodEnd: toDate(event.currentPeriodEnd),
        };

  const out = await assignPlanWithRepos(repo, events, parsed, def, {
    now,
    genId,
    actor: SYSTEM_ACTOR,
    requestId,
    provider,
  });
  if (out.kind === "repo_error") return { kind: "repo_error" };

  // Same-plan renewal: assign is idempotent and won't touch the period, so push
  // the new billing window onto the existing subscription explicitly.
  if (event.type === "subscription.updated" && !out.created) {
    const start = toDate(event.currentPeriodStart);
    const end = toDate(event.currentPeriodEnd);
    if (start || end) {
      const upd = await repo.updateSubscription(orgId, out.subscriptionId, {
        status: "active",
        ...(start ? { currentPeriodStart: start } : {}),
        ...(end ? { currentPeriodEnd: end } : {}),
      });
      if (!upd.ok && upd.error.kind === "internal") return { kind: "repo_error" };
    }
  }

  return {
    kind: "applied",
    action:
      event.type === "subscription.canceled"
        ? "subscription_canceled"
        : out.created
          ? "subscription_activated"
          : "subscription_updated",
  };
}

async function applyInvoiceEvent(
  repo: WebhookRepo,
  events: EventsSlice | null,
  event: Extract<NormalizedEvent, { type: `invoice.${string}` }>,
  opts: { now: Date; genId: () => string; requestId: string },
): Promise<ApplyResult> {
  const { now, genId, requestId } = opts;

  if (!event.providerInvoiceId) return { kind: "ignored", reason: "no_invoice_id" };
  if (!event.orgId) return { kind: "ignored", reason: "unresolved_org" };
  const orgId = parseOrgPublicId(event.orgId);
  if (!orgId) return { kind: "ignored", reason: "malformed_org" };

  // Ensure a billing customer (invoice rows require one). Create with provider
  // linkage if the customer does not exist yet (invoice before subscription).
  const custRes = await repo.getBillingCustomer(orgId);
  let customerId: string;
  if (custRes.ok) {
    customerId = custRes.value.id;
  } else if (custRes.error.kind === "not_found") {
    const created = await repo.upsertBillingCustomer({
      id: genId(),
      orgId,
      status: "active",
      provider: event.provider,
      providerCustomerId: event.providerCustomerId,
    });
    if (!created.ok) return { kind: "repo_error" };
    customerId = created.value.id;
  } else {
    return { kind: "repo_error" };
  }

  // Link the invoice to our subscription when the provider subscription matches.
  let subscriptionId: string | null = null;
  if (event.providerSubscriptionId) {
    const active = await repo.getActiveSubscription(orgId);
    if (active.ok && active.value.providerSubscriptionId === event.providerSubscriptionId) {
      subscriptionId = active.value.id;
    }
  }

  const paid = event.type === "invoice.paid";
  // Row id is derived from the provider invoice id so order.created and
  // order.paid for the SAME order upsert one row (open → paid).
  const invRes = await repo.upsertInvoice({
    id: `inv_${event.providerInvoiceId}`,
    orgId,
    billingCustomerId: customerId,
    subscriptionId,
    status: paid ? "paid" : "open",
    amountDueCents: event.amountDueCents,
    amountPaidCents: event.amountPaidCents,
    currency: event.currency,
    issuedAt: now,
    paidAt: paid ? now : null,
    provider: event.provider,
    providerInvoiceId: event.providerInvoiceId,
    hostedUrl: safeHostedUrl(event.hostedUrl),
  });
  if (!invRes.ok) return { kind: "repo_error" };

  // Best-effort event emission (never fails intake).
  if (events) {
    try {
      await events.appendEventWithAudit({
        event: {
          id: genId(),
          type: paid ? "invoice.paid" : "invoice.generated",
          version: 1,
          source: "billing-worker",
          occurredAt: now,
          actorType: SYSTEM_ACTOR.type,
          actorId: SYSTEM_ACTOR.id,
          orgId,
          subjectKind: "invoice",
          subjectId: invRes.value.id,
          requestId,
          payload: { orgId: event.orgId, providerInvoiceId: event.providerInvoiceId, status: paid ? "paid" : "open" },
        },
        audit: {
          id: genId(),
          category: "billing",
          description: `Invoice ${paid ? "paid" : "recorded"} from provider webhook`,
        },
      });
    } catch {
      // best-effort
    }
  }

  return { kind: "applied", action: paid ? "invoice_paid" : "invoice_recorded" };
}

// ── HTTP handler (verify + transaction wrapper) ─────────────────────────

function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export interface WebhookDeps {
  /** Inject a provider adapter (tests). Defaults to the env-resolved registry. */
  provider?: BillingProvider;
  repoFactory?: (env: Env) => WebhookRepo;
  eventsFactory?: (env: Env) => EventsSlice;
  now?: () => Date;
  generateId?: () => string;
}

export async function handleProviderWebhook(
  request: Request,
  env: Env,
  requestId: string,
  providerId: string,
  deps: WebhookDeps = {},
): Promise<Response> {
  if (request.method !== "POST") return methodNotAllowed(requestId);
  // BP1 ships the Polar adapter only.
  if (providerId !== "polar") return notFound(requestId, `webhooks/${providerId}`);

  const provider =
    deps.provider ??
    (() => {
      const res = createDefaultBillingProviderRegistry(env).resolve(env);
      return res.ok ? res.provider : null;
    })();
  if (!provider) {
    return errorResponse("internal_error", "Billing provider not configured", 503, requestId);
  }

  const rawBody = await request.text();
  const verified = await provider.verifyWebhook(rawBody, headersToRecord(request.headers));
  if (!verified.ok) {
    if (verified.reason === "malformed") {
      return validationError(requestId, "Malformed webhook payload");
    }
    return errorResponse("unauthorized", "Invalid webhook signature", 403, requestId);
  }
  const event = verified.event;

  const now = deps.now ? deps.now() : new Date();
  const genId = deps.generateId ?? generateUuid;
  const productMap = parseProductMap(env.POLAR_PRODUCT_MAP);

  // Injected-deps path (unit tests): no executor/transaction.
  if (deps.repoFactory) {
    const repo = deps.repoFactory(env);
    const events = deps.eventsFactory ? deps.eventsFactory(env) : null;
    const result = await applyNormalizedEvent(repo, events, event, { now, genId, requestId, productMap });
    return finalizeWebhook(result, requestId);
  }

  if (!env.SOURCEPLANE_DB) {
    return errorResponse("internal_error", "Service misconfigured", 503, requestId);
  }

  const executor = createSqlExecutor(env.SOURCEPLANE_DB);
  try {
    if ("transaction" in executor) {
      const result = await executor.transaction(async (txExec) => {
        const repo = createBillingRepository(txExec);
        const events = createEventsRepository(txExec);
        return applyNormalizedEvent(repo, events, event, { now, genId, requestId, productMap });
      });
      return finalizeWebhook(result, requestId);
    }
    const repo = createBillingRepository(executor);
    const events = createEventsRepository(executor);
    const result = await applyNormalizedEvent(repo, events, event, { now, genId, requestId, productMap });
    return finalizeWebhook(result, requestId);
  } catch {
    // Durable write failed — return 503 so the provider retries (the dedupe row
    // rolled back with the transaction).
    return errorResponse("internal_error", "Failed to process webhook", 503, requestId);
  } finally {
    if ("dispose" in executor && typeof executor.dispose === "function") {
      await executor.dispose();
    }
  }
}

function finalizeWebhook(result: ApplyResult, requestId: string): Response {
  if (result.kind === "repo_error") {
    return errorResponse("internal_error", "Failed to process webhook", 503, requestId);
  }
  // applied | duplicate | ignored all ACK 200 so the provider stops retrying.
  return successResponse({ status: result.kind, ...("action" in result ? { action: result.action } : {}) }, requestId);
}
