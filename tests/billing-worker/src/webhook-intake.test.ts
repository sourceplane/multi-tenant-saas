import {
  applyNormalizedEvent,
  parseProductMap,
  handleProviderWebhook,
  type ApplyResult,
} from "@billing-worker/handlers/webhook";
import { route } from "@billing-worker/router";
import type { Env } from "@billing-worker/env";
import type { NormalizedEvent } from "@billing-worker/billing-provider/types";
import type {
  BillingRepository,
  BillingResult,
  BillingCustomer,
  Subscription,
  Entitlement,
  Invoice,
  Plan,
} from "@saas/db/billing";
import { PLAN_CATALOG } from "@billing-worker/plan-catalog";

const ORG_PUBLIC = "org_2f65ddde1f5b4e938c0b80e030e31229";
const PRODUCT_MAP = new Map([
  ["prod_pro", "pro"],
  ["prod_business", "business"],
]);

// ── Stateful fake repository ───────────────────────────────────────────

interface FakeState {
  customers: BillingCustomer[];
  subscriptions: Subscription[];
  entitlements: Entitlement[];
  invoices: Invoice[];
  webhookEvents: Set<string>;
  events: { type: string }[];
}

function emptyState(): FakeState {
  return { customers: [], subscriptions: [], entitlements: [], invoices: [], webhookEvents: new Set(), events: [] };
}

function makePlan(over: Partial<Plan>): Plan {
  return {
    id: "plan", code: "free", name: "Free", description: null, status: "active",
    billingInterval: "month", priceAmountCents: 0, priceCurrency: "usd", metadata: null,
    createdAt: new Date(), updatedAt: new Date(), ...over,
  };
}

type WebhookRepo = Pick<
  BillingRepository,
  | "createPlan" | "getPlanByCode" | "upsertBillingCustomer" | "getBillingCustomer"
  | "getActiveSubscription" | "createSubscription" | "updateSubscription"
  | "upsertEntitlement" | "upsertInvoice" | "recordProviderWebhookEvent"
>;

function makeRepo(state: FakeState): WebhookRepo {
  return {
    createPlan: async (input): Promise<BillingResult<Plan>> => ({ ok: true, value: makePlan({ id: input.id, code: input.code, name: input.name }) }),
    getPlanByCode: async (code): Promise<BillingResult<Plan>> => {
      const def = PLAN_CATALOG.find((p) => p.code === code);
      return def ? { ok: true, value: makePlan({ id: def.id, code: def.code, name: def.name }) } : { ok: false, error: { kind: "not_found" } };
    },
    upsertBillingCustomer: async (input): Promise<BillingResult<BillingCustomer>> => {
      let cust = state.customers.find((c) => c.orgId === input.orgId);
      if (!cust) {
        cust = { id: input.id, orgId: input.orgId, displayName: null, email: null, status: "active", provider: null, providerCustomerId: null, metadata: null, createdAt: new Date(), updatedAt: new Date() };
        state.customers.push(cust);
      }
      if (input.provider !== undefined) cust.provider = input.provider;
      if (input.providerCustomerId !== undefined) cust.providerCustomerId = input.providerCustomerId;
      return { ok: true, value: cust };
    },
    getBillingCustomer: async (orgId): Promise<BillingResult<BillingCustomer>> => {
      const cust = state.customers.find((c) => c.orgId === orgId);
      return cust ? { ok: true, value: cust } : { ok: false, error: { kind: "not_found" } };
    },
    getActiveSubscription: async (orgId): Promise<BillingResult<Subscription>> => {
      const sub = state.subscriptions.find((s) => s.orgId === orgId && s.status === "active");
      return sub ? { ok: true, value: sub } : { ok: false, error: { kind: "not_found" } };
    },
    createSubscription: async (input): Promise<BillingResult<Subscription>> => {
      const sub: Subscription = {
        id: input.id, orgId: input.orgId, billingCustomerId: input.billingCustomerId, planId: input.planId,
        status: input.status ?? "active", currentPeriodStart: input.currentPeriodStart ?? null, currentPeriodEnd: input.currentPeriodEnd ?? null,
        trialEnd: null, cancelAt: null, canceledAt: null, provider: input.provider ?? null, providerSubscriptionId: input.providerSubscriptionId ?? null,
        metadata: null, createdAt: new Date(), updatedAt: new Date(),
      };
      state.subscriptions.push(sub);
      return { ok: true, value: sub };
    },
    updateSubscription: async (orgId, id, input): Promise<BillingResult<Subscription>> => {
      const sub = state.subscriptions.find((s) => s.orgId === orgId && s.id === id);
      if (!sub) return { ok: false, error: { kind: "not_found" } };
      if (input.status) sub.status = input.status;
      if (input.canceledAt !== undefined) sub.canceledAt = input.canceledAt;
      if (input.currentPeriodStart !== undefined) sub.currentPeriodStart = input.currentPeriodStart;
      if (input.currentPeriodEnd !== undefined) sub.currentPeriodEnd = input.currentPeriodEnd;
      return { ok: true, value: sub };
    },
    upsertEntitlement: async (input): Promise<BillingResult<Entitlement>> => {
      const idx = state.entitlements.findIndex((e) => e.orgId === input.orgId && e.entitlementKey === input.entitlementKey);
      const ent: Entitlement = { id: input.id, orgId: input.orgId, subscriptionId: input.subscriptionId ?? null, entitlementKey: input.entitlementKey, valueType: input.valueType, enabled: input.enabled ?? true, limitValue: input.limitValue ?? null, source: input.source ?? "plan", metadata: null, createdAt: new Date(), updatedAt: new Date() };
      if (idx >= 0) state.entitlements[idx] = ent; else state.entitlements.push(ent);
      return { ok: true, value: ent };
    },
    upsertInvoice: async (input): Promise<BillingResult<Invoice>> => {
      let inv = state.invoices.find((i) => i.id === input.id);
      if (!inv) {
        inv = {
          id: input.id, orgId: input.orgId, billingCustomerId: input.billingCustomerId, subscriptionId: input.subscriptionId ?? null,
          number: input.number ?? null, status: input.status ?? "draft", amountDueCents: input.amountDueCents ?? 0, amountPaidCents: input.amountPaidCents ?? 0,
          currency: input.currency ?? "usd", issuedAt: input.issuedAt ?? null, dueAt: null, paidAt: input.paidAt ?? null, periodStart: null, periodEnd: null,
          provider: input.provider ?? null, providerInvoiceId: input.providerInvoiceId ?? null, hostedUrl: input.hostedUrl ?? null, metadata: null,
          createdAt: new Date(), updatedAt: new Date(),
        };
        state.invoices.push(inv);
      } else {
        inv.status = input.status ?? inv.status;
        inv.amountPaidCents = input.amountPaidCents ?? inv.amountPaidCents;
        inv.paidAt = input.paidAt ?? inv.paidAt;
      }
      return { ok: true, value: inv };
    },
    recordProviderWebhookEvent: async (input): Promise<BillingResult<{ duplicate: boolean }>> => {
      const key = `${input.provider}:${input.eventId}`;
      if (state.webhookEvents.has(key)) return { ok: true, value: { duplicate: true } };
      state.webhookEvents.add(key);
      return { ok: true, value: { duplicate: false } };
    },
  };
}

const events = (state: FakeState) => ({
  appendEventWithAudit: async (input: { event: { type: string } }) => {
    state.events.push({ type: input.event.type });
    return { ok: true as const, value: {} as never };
  },
});

let idc = 0;
const opts = (over: Partial<{ now: Date }> = {}) => ({
  now: over.now ?? new Date("2026-06-09T00:00:00Z"),
  genId: () => `id_${++idc}`,
  requestId: "req_test",
  productMap: PRODUCT_MAP,
});

const subEvent = (over: Partial<NormalizedEvent> = {}): NormalizedEvent => ({
  type: "subscription.activated",
  provider: "polar",
  providerEventId: `evt_${++idc}`,
  orgId: ORG_PUBLIC,
  providerCustomerId: "cus_1",
  providerSubscriptionId: "sub_1",
  productId: "prod_pro",
  currentPeriodStart: "2026-06-01T00:00:00Z",
  currentPeriodEnd: "2026-07-01T00:00:00Z",
  ...over,
}) as NormalizedEvent;

// ── parseProductMap ────────────────────────────────────────────────────

describe("parseProductMap", () => {
  it("reverses planCode→productId into productId→planCode for known plans only", () => {
    const m = parseProductMap(JSON.stringify({ pro: "prod_pro", business: "prod_business", bogus: "prod_x" }));
    expect(m.get("prod_pro")).toBe("pro");
    expect(m.get("prod_business")).toBe("business");
    expect(m.get("prod_x")).toBeUndefined(); // unknown plan code dropped
  });
  it("returns an empty map for missing/invalid JSON", () => {
    expect(parseProductMap(undefined).size).toBe(0);
    expect(parseProductMap("{not json").size).toBe(0);
  });
});

// ── applyNormalizedEvent ───────────────────────────────────────────────

describe("applyNormalizedEvent", () => {
  it("activates a paid subscription: customer + sub + entitlements with provider linkage", async () => {
    const state = emptyState();
    const res = await applyNormalizedEvent(makeRepo(state), events(state), subEvent(), opts());
    expect(res).toEqual({ kind: "applied", action: "subscription_activated" });
    const cust = state.customers[0]!;
    expect(cust.provider).toBe("polar");
    expect(cust.providerCustomerId).toBe("cus_1");
    const sub = state.subscriptions.find((s) => s.status === "active")!;
    expect(sub.provider).toBe("polar");
    expect(sub.providerSubscriptionId).toBe("sub_1");
    expect(sub.currentPeriodEnd).toEqual(new Date("2026-07-01T00:00:00Z"));
    // pro entitlements materialized
    expect(state.entitlements.find((e) => e.entitlementKey === "limit.projects")!.limitValue).toBe(25);
  });

  it("is idempotent on redelivery (same provider event id) — no second state change", async () => {
    const state = emptyState();
    const ev = subEvent();
    const repo = makeRepo(state);
    const first = await applyNormalizedEvent(repo, events(state), ev, opts());
    expect(first.kind).toBe("applied");
    const subsAfterFirst = state.subscriptions.length;
    const second = await applyNormalizedEvent(repo, events(state), ev, opts());
    expect(second).toEqual({ kind: "duplicate" });
    expect(state.subscriptions.length).toBe(subsAfterFirst);
  });

  it("ignores an unmapped product (cannot resolve a plan)", async () => {
    const state = emptyState();
    const res = await applyNormalizedEvent(makeRepo(state), events(state), subEvent({ productId: "prod_unknown" }), opts());
    expect(res).toEqual({ kind: "ignored", reason: "unmapped_product" });
    expect(state.subscriptions).toHaveLength(0);
  });

  it("ignores an event with no resolvable org", async () => {
    const state = emptyState();
    expect((await applyNormalizedEvent(makeRepo(state), events(state), subEvent({ orgId: null }), opts())).kind).toBe("ignored");
    expect((await applyNormalizedEvent(makeRepo(state), events(state), subEvent({ orgId: "not-an-org-id" }), opts())).kind).toBe("ignored");
  });

  it("downgrades to free on subscription.canceled (revoked)", async () => {
    const state = emptyState();
    const repo = makeRepo(state);
    // First activate pro.
    await applyNormalizedEvent(repo, events(state), subEvent(), opts());
    expect(state.entitlements.find((e) => e.entitlementKey === "limit.projects")!.limitValue).toBe(25);
    // Then cancel (revoked → subscription.canceled normalized type).
    const res = await applyNormalizedEvent(repo, events(state), subEvent({ type: "subscription.canceled", providerEventId: "evt_cancel" }), opts());
    expect(res).toEqual({ kind: "applied", action: "subscription_canceled" });
    // Downgraded: free limits now in effect, old paid sub canceled.
    expect(state.entitlements.find((e) => e.entitlementKey === "limit.projects")!.limitValue).toBe(3);
    expect(state.subscriptions.some((s) => s.status === "canceled")).toBe(true);
  });

  it("records a paid invoice, creating a customer if needed, linking the subscription", async () => {
    const state = emptyState();
    const repo = makeRepo(state);
    await applyNormalizedEvent(repo, events(state), subEvent(), opts()); // establishes sub_1 active
    const invEv: NormalizedEvent = {
      type: "invoice.paid", provider: "polar", providerEventId: "evt_inv", orgId: ORG_PUBLIC,
      providerCustomerId: "cus_1", providerInvoiceId: "ord_1", providerSubscriptionId: "sub_1",
      amountDueCents: 2000, amountPaidCents: 2000, currency: "usd", hostedUrl: null,
    };
    const res = await applyNormalizedEvent(repo, events(state), invEv, opts());
    expect(res).toEqual({ kind: "applied", action: "invoice_paid" });
    const inv = state.invoices[0]!;
    expect(inv.status).toBe("paid");
    expect(inv.amountPaidCents).toBe(2000);
    expect(inv.subscriptionId).toBe(state.subscriptions.find((s) => s.status === "active")!.id);
    expect(state.events.map((e) => e.type)).toContain("invoice.paid");
  });

  it("invoice id is derived from the provider order id so created→paid upsert one row", async () => {
    const state = emptyState();
    const repo = makeRepo(state);
    const common = { provider: "polar" as const, orgId: ORG_PUBLIC, providerCustomerId: "cus_1", providerInvoiceId: "ord_9", providerSubscriptionId: null, amountDueCents: 9900, currency: "usd", hostedUrl: null };
    await applyNormalizedEvent(repo, events(state), { ...common, type: "invoice.recorded", providerEventId: "evt_created", amountPaidCents: 0 } as NormalizedEvent, opts());
    await applyNormalizedEvent(repo, events(state), { ...common, type: "invoice.paid", providerEventId: "evt_paid", amountPaidCents: 9900 } as NormalizedEvent, opts());
    expect(state.invoices).toHaveLength(1);
    expect(state.invoices[0]!.status).toBe("paid");
  });

  it("surfaces repo_error when the dedupe ledger write fails", async () => {
    const state = emptyState();
    const repo = makeRepo(state);
    repo.recordProviderWebhookEvent = async () => ({ ok: false, error: { kind: "internal", message: "boom" } });
    const res = await applyNormalizedEvent(repo, events(state), subEvent(), opts());
    expect(res).toEqual({ kind: "repo_error" } satisfies ApplyResult);
  });
});

// ── handleProviderWebhook (verify + HTTP mapping, injected deps) ─────────

function makeReq(method: string, path: string, body = "{}"): Request {
  const init: RequestInit = {
    method,
    headers: { "content-type": "application/json", "x-request-id": "req_test" },
  };
  if (method !== "GET") init.body = body;
  return new Request(`https://billing-worker${path}`, init);
}

const fakeProvider = (verify: NormalizedEvent | { reason: "invalid_signature" | "malformed" }) => ({
  id: "polar" as const,
  createCheckout: async () => ({ checkoutUrl: "x" }),
  createPortalSession: async () => ({ portalUrl: "x" }),
  getCustomerByExternalId: async () => null,
  verifyWebhook: async () =>
    "reason" in verify ? ({ ok: false as const, reason: verify.reason }) : ({ ok: true as const, event: verify }),
});

describe("handleProviderWebhook", () => {
  const env = { ENVIRONMENT: "test", POLAR_PRODUCT_MAP: JSON.stringify({ pro: "prod_pro", business: "prod_business" }) } as Env;

  it("405 for non-POST", async () => {
    const res = await handleProviderWebhook(makeReq("GET", "/v1/billing/webhooks/polar"), env, "req", "polar");
    expect(res.status).toBe(405);
  });

  it("404 for an unsupported provider", async () => {
    const res = await handleProviderWebhook(makeReq("POST", "/v1/billing/webhooks/stripe"), env, "req", "stripe");
    expect(res.status).toBe(404);
  });

  it("403 (fail closed) on an invalid signature", async () => {
    const res = await handleProviderWebhook(makeReq("POST", "/v1/billing/webhooks/polar"), env, "req", "polar", {
      provider: fakeProvider({ reason: "invalid_signature" }),
    });
    expect(res.status).toBe(403);
  });

  it("400 on a malformed payload (valid signature, unparseable body)", async () => {
    const res = await handleProviderWebhook(makeReq("POST", "/v1/billing/webhooks/polar"), env, "req", "polar", {
      provider: fakeProvider({ reason: "malformed" }),
    });
    expect(res.status).toBe(400);
  });

  it("200 applied on a verified subscription event", async () => {
    const state = emptyState();
    const res = await handleProviderWebhook(makeReq("POST", "/v1/billing/webhooks/polar"), env, "req", "polar", {
      provider: fakeProvider(subEvent({ providerEventId: "evt_http" })),
      repoFactory: () => makeRepo(state),
      eventsFactory: () => events(state),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string; action: string } };
    expect(body.data.status).toBe("applied");
    expect(body.data.action).toBe("subscription_activated");
  });

  it("200 duplicate on redelivery", async () => {
    const state = emptyState();
    const ev = subEvent({ providerEventId: "evt_dup" });
    const repo = makeRepo(state);
    const deps = { provider: fakeProvider(ev), repoFactory: () => repo, eventsFactory: () => events(state) };
    await handleProviderWebhook(makeReq("POST", "/v1/billing/webhooks/polar"), env, "req", "polar", deps);
    const res = await handleProviderWebhook(makeReq("POST", "/v1/billing/webhooks/polar"), env, "req", "polar", deps);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe("duplicate");
  });
});

// ── Router wiring (no actor identity required; trust is the signature) ───

describe("router: webhook route", () => {
  const env = { ENVIRONMENT: "test" } as Env;

  it("routes POST /v1/billing/webhooks/polar without x-actor headers (503 not_configured, not 401)", async () => {
    const res = await route(makeReq("POST", "/v1/billing/webhooks/polar"), env);
    expect(res.status).toBe(503); // provider not configured (no creds in this env) — proves no auth gate
  });

  it("404 for an unsupported provider segment", async () => {
    const res = await route(makeReq("POST", "/v1/billing/webhooks/stripe"), env);
    expect(res.status).toBe(404);
  });

  it("405 for GET on the webhook route", async () => {
    const res = await route(makeReq("GET", "/v1/billing/webhooks/polar"), env);
    expect(res.status).toBe(405);
  });
});
