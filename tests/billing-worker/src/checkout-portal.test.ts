import { handleCreateCheckout } from "@billing-worker/handlers/create-checkout";
import { handleCreatePortal } from "@billing-worker/handlers/create-portal";
import type { Env } from "@billing-worker/env";
import type { ActorContext } from "@billing-worker/router";
import type { BillingProviderRegistry } from "@billing-worker/billing-provider/registry";
import type {
  BillingProvider,
  CreateCheckoutInput,
  CreatePortalSessionInput,
} from "@billing-worker/billing-provider/types";

const ORG_HEX = "2f65ddde-1f5b-4e93-8c0b-80e030e31229";
const ORG_PUBLIC = "org_2f65ddde1f5b4e938c0b80e030e31229";
const PRODUCT_MAP = { pro: "prod_p", business: "prod_b" };
const ACTOR: ActorContext = { subjectId: "usr_1", subjectType: "user" };
const env = { ENVIRONMENT: "test" } as Env;

interface Recorder {
  checkout: CreateCheckoutInput[];
  portal: CreatePortalSessionInput[];
}

function recordingRegistry(rec: Recorder, opts: { resolveFail?: "not_configured"; throwOn?: "checkout" | "portal"; hasActiveSub?: boolean } = {}): BillingProviderRegistry {
  const provider: BillingProvider = {
    id: "polar",
    createCheckout: async (input) => {
      rec.checkout.push(input);
      if (opts.throwOn === "checkout") throw new Error("provider down");
      return { checkoutUrl: "https://polar.test/checkout/abc" };
    },
    createPortalSession: async (input) => {
      rec.portal.push(input);
      if (opts.throwOn === "portal") throw new Error("provider down");
      return { portalUrl: "https://polar.test/portal/abc" };
    },
    getCustomerByExternalId: async () => null,
    hasActiveSubscription: async () => opts.hasActiveSub ?? false,
    verifyWebhook: async () => ({ ok: false, reason: "invalid_signature" }),
  };
  return {
    get: () => provider,
    resolve: () => (opts.resolveFail ? { ok: false, reason: opts.resolveFail } : { ok: true, provider }),
  };
}

const allow = async () => ({ ok: true as const });
const deny = async () => ({ ok: false as const, response: new Response("nope", { status: 404 }) });

function checkoutReq(body: unknown): Request {
  return new Request("https://billing/v1/organizations/x/billing/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("handleCreateCheckout", () => {
  it("creates a checkout bound to the org public id and returns the url", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "business" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { checkoutUrl: string } };
    expect(body.data.checkoutUrl).toBe("https://polar.test/checkout/abc");
    expect(rec.checkout[0]!.orgId).toBe(ORG_PUBLIC);
    expect(rec.checkout[0]!.productId).toBe("prod_b");
    expect(rec.checkout[0]!.planCode).toBe("business");
    const body2 = body as { data: { mode?: string } };
    expect(body2.data.mode).toBe("checkout");
  });

  it("routes an existing subscriber's plan change to the portal (no second checkout)", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "business" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec, { hasActiveSub: true }),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { checkoutUrl: string; mode: string } };
    expect(body.data.mode).toBe("portal");
    expect(body.data.checkoutUrl).toBe("https://polar.test/portal/abc");
    // No checkout was attempted; the portal session was created instead.
    expect(rec.checkout).toHaveLength(0);
    expect(rec.portal[0]!.orgId).toBe(ORG_PUBLIC);
  });

  it("routes to the portal from OUR billing state (paid plan) even if the provider check is false", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "business" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), // provider.hasActiveSubscription → false
      productMap: PRODUCT_MAP,
      authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro" }),
    });
    const body = (await res.json()) as { data: { mode: string } };
    expect(body.data.mode).toBe("portal");
    expect(rec.checkout).toHaveLength(0);
  });

  it("checks out a first purchase when the active plan is free", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "pro" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      productMap: PRODUCT_MAP,
      authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_free" }),
    });
    const body = (await res.json()) as { data: { mode: string } };
    expect(body.data.mode).toBe("checkout");
    expect(rec.checkout).toHaveLength(1);
  });

  it("rejects an unknown plan code (400)", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "platinum" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(400);
    expect(rec.checkout).toHaveLength(0);
  });

  it("rejects a non-purchasable plan with no product (free) (400)", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "free" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(400);
    expect(rec.checkout).toHaveLength(0);
  });

  it("returns the deny response when not authorized", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "pro" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      productMap: PRODUCT_MAP,
      authorize: deny,
    });
    expect(res.status).toBe(404);
    expect(rec.checkout).toHaveLength(0);
  });

  it("returns 503 when the provider is not configured", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "pro" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec, { resolveFail: "not_configured" }),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(503);
  });

  it("returns 502 when the provider call fails", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "pro" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec, { throwOn: "checkout" }),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(502);
  });
});

describe("handleCreatePortal", () => {
  function portalReq(): Request {
    return new Request("https://billing/v1/organizations/x/billing/portal", { method: "POST" });
  }

  it("creates a portal session for the org public id and returns the url", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreatePortal(portalReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      authorize: allow,
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { portalUrl: string } };
    expect(body.data.portalUrl).toBe("https://polar.test/portal/abc");
    expect(rec.portal[0]!.orgId).toBe(ORG_PUBLIC);
  });

  it("returns the deny response when not authorized", async () => {
    const rec: Recorder = { checkout: [], portal: [] };
    const res = await handleCreatePortal(portalReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      authorize: deny,
    });
    expect(res.status).toBe(404);
    expect(rec.portal).toHaveLength(0);
  });
});
