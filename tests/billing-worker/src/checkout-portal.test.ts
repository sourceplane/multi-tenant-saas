import {
  handleCreateCheckout,
  validateEmbedOrigin,
  validateReturnPath,
  buildSuccessUrl,
} from "@billing-worker/handlers/create-checkout";
import { handleCreatePortal } from "@billing-worker/handlers/create-portal";
import { handleCancelSubscription } from "@billing-worker/handlers/cancel-subscription";
import { handleChangePlan } from "@billing-worker/handlers/change-plan";
import type { Env } from "@billing-worker/env";
import type { ActorContext } from "@billing-worker/router";
import type { BillingProviderRegistry } from "@billing-worker/billing-provider/registry";
import type {
  BillingProvider,
  CancelSubscriptionInput,
  ChangeSubscriptionPlanInput,
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
  cancel: CancelSubscriptionInput[];
  change: ChangeSubscriptionPlanInput[];
}

function recordingRegistry(rec: Recorder, opts: { resolveFail?: "not_configured"; throwOn?: "checkout" | "portal" | "cancel" | "change"; hasActiveSub?: boolean } = {}): BillingProviderRegistry {
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
    cancelSubscription: async (input) => {
      rec.cancel.push(input);
      if (opts.throwOn === "cancel") throw new Error("provider down");
      return { cancelAtPeriodEnd: true };
    },
    changeSubscriptionPlan: async (input) => {
      rec.change.push(input);
      if (opts.throwOn === "change") throw new Error("provider down");
      return { changed: true };
    },
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
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
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
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
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
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
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
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
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

  it("forwards a valid embedOrigin to the provider (enables in-app embedded checkout)", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    await handleCreateCheckout(
      checkoutReq({ planCode: "pro", embedOrigin: "https://app.example.com" }),
      env, "req_t", ACTOR, ORG_HEX,
      { registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow, getActiveSubscription: async () => ({ planId: "plan_free" }) },
    );
    expect(rec.checkout[0]!.embedOrigin).toBe("https://app.example.com");
  });

  it("ignores a malformed embedOrigin (still checks out, no embed origin)", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    await handleCreateCheckout(
      checkoutReq({ planCode: "pro", embedOrigin: "https://evil.example.com/path?x=1" }),
      env, "req_t", ACTOR, ORG_HEX,
      { registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow, getActiveSubscription: async () => ({ planId: "plan_free" }) },
    );
    expect(rec.checkout).toHaveLength(1);
    expect(rec.checkout[0]!.embedOrigin).toBeUndefined();
  });

  it("builds a same-origin successUrl from embedOrigin + returnPath", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    await handleCreateCheckout(
      checkoutReq({
        planCode: "pro",
        embedOrigin: "https://app.example.com",
        returnPath: "/orgs/acme/settings/billing?checkout=complete",
      }),
      env, "req_t", ACTOR, ORG_HEX,
      { registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow, getActiveSubscription: async () => ({ planId: "plan_free" }) },
    );
    expect(rec.checkout[0]!.successUrl).toBe(
      "https://app.example.com/orgs/acme/settings/billing?checkout=complete",
    );
  });

  it("ignores a malformed returnPath (falls back to env success url, here empty)", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    await handleCreateCheckout(
      checkoutReq({ planCode: "pro", embedOrigin: "https://app.example.com", returnPath: "https://evil.com/x" }),
      env, "req_t", ACTOR, ORG_HEX,
      { registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow, getActiveSubscription: async () => ({ planId: "plan_free" }) },
    );
    expect(rec.checkout[0]!.successUrl).toBe("");
  });

  it("rejects an unknown plan code (400)", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "platinum" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(400);
    expect(rec.checkout).toHaveLength(0);
  });

  it("rejects a non-purchasable plan with no product (free) (400)", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "free" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(400);
    expect(rec.checkout).toHaveLength(0);
  });

  it("returns the deny response when not authorized", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "pro" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      productMap: PRODUCT_MAP,
      authorize: deny,
    });
    expect(res.status).toBe(404);
    expect(rec.checkout).toHaveLength(0);
  });

  it("returns 503 when the provider is not configured", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "pro" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec, { resolveFail: "not_configured" }),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(503);
  });

  it("returns 502 when the provider call fails", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCreateCheckout(checkoutReq({ planCode: "pro" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec, { throwOn: "checkout" }),
      productMap: PRODUCT_MAP,
      authorize: allow,
    });
    expect(res.status).toBe(502);
  });
});

describe("validateEmbedOrigin", () => {
  it("accepts a bare https origin", () => {
    expect(validateEmbedOrigin("https://app.example.com")).toBe("https://app.example.com");
    expect(validateEmbedOrigin("https://console.acme.io:8443")).toBe("https://console.acme.io:8443");
  });
  it("accepts http only for localhost (dev)", () => {
    expect(validateEmbedOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(validateEmbedOrigin("http://127.0.0.1:3000")).toBe("http://127.0.0.1:3000");
  });
  it("rejects http for non-localhost, paths/queries, and junk", () => {
    expect(validateEmbedOrigin("http://app.example.com")).toBeNull();
    expect(validateEmbedOrigin("https://app.example.com/checkout")).toBeNull();
    expect(validateEmbedOrigin("https://app.example.com?x=1")).toBeNull();
    expect(validateEmbedOrigin("not a url")).toBeNull();
    expect(validateEmbedOrigin("")).toBeNull();
    expect(validateEmbedOrigin(undefined)).toBeNull();
    expect(validateEmbedOrigin(123)).toBeNull();
  });
});

describe("handleCancelSubscription", () => {
  function cancelReq(): Request {
    return new Request("https://billing/v1/organizations/x/billing/subscription/cancel", { method: "POST" });
  }

  it("cancels the active paid subscription via the provider sub id", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCancelSubscription(cancelReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_polar_1" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { cancelAtPeriodEnd: boolean } };
    expect(body.data.cancelAtPeriodEnd).toBe(true);
    expect(rec.cancel[0]!.orgId).toBe(ORG_PUBLIC);
    expect(rec.cancel[0]!.providerSubscriptionId).toBe("sub_polar_1");
  });

  it("409 when there is no paid subscription (free / none)", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const free = await handleCancelSubscription(cancelReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_free", providerSubscriptionId: null }),
    });
    expect(free.status).toBe(409);
    const none = await handleCancelSubscription(cancelReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), authorize: allow,
      getActiveSubscription: async () => null,
    });
    expect(none.status).toBe(409);
    expect(rec.cancel).toHaveLength(0);
  });

  it("409 when a paid plan has no provider subscription id (not cancelable here)", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCancelSubscription(cancelReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: null }),
    });
    expect(res.status).toBe(409);
    expect(rec.cancel).toHaveLength(0);
  });

  it("returns the deny response when not authorized", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCancelSubscription(cancelReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), authorize: deny,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_1" }),
    });
    expect(res.status).toBe(404);
    expect(rec.cancel).toHaveLength(0);
  });

  it("503 when the provider is not configured", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCancelSubscription(cancelReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec, { resolveFail: "not_configured" }), authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_1" }),
    });
    expect(res.status).toBe(503);
  });

  it("502 when the provider cancel call fails", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCancelSubscription(cancelReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec, { throwOn: "cancel" }), authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_1" }),
    });
    expect(res.status).toBe(502);
  });
});

describe("handleChangePlan", () => {
  function changeReq(body: unknown): Request {
    return new Request("https://billing/v1/organizations/x/billing/subscription/change", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("changes an existing paid subscription to the target product", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleChangePlan(changeReq({ planCode: "business" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_1" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { changed: boolean } };
    expect(body.data.changed).toBe(true);
    expect(rec.change[0]!.orgId).toBe(ORG_PUBLIC);
    expect(rec.change[0]!.providerSubscriptionId).toBe("sub_1");
    expect(rec.change[0]!.productId).toBe("prod_b");
  });

  it("409 when there is no paid/provider-linked subscription (first purchase is checkout)", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const free = await handleChangePlan(changeReq({ planCode: "business" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_free", providerSubscriptionId: null }),
    });
    expect(free.status).toBe(409);
    const unlinked = await handleChangePlan(changeReq({ planCode: "business" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: null }),
    });
    expect(unlinked.status).toBe(409);
    expect(rec.change).toHaveLength(0);
  });

  it("409 when changing to the plan already active (no-op)", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleChangePlan(changeReq({ planCode: "pro" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_1" }),
    });
    expect(res.status).toBe(409);
    expect(rec.change).toHaveLength(0);
  });

  it("400 for an unknown / non-purchasable plan", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const bad = await handleChangePlan(changeReq({ planCode: "platinum" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_1" }),
    });
    expect(bad.status).toBe(400);
    const free = await handleChangePlan(changeReq({ planCode: "free" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_1" }),
    });
    expect(free.status).toBe(400); // free has no product in the map
    expect(rec.change).toHaveLength(0);
  });

  it("returns the deny response when not authorized", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleChangePlan(changeReq({ planCode: "business" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec), productMap: PRODUCT_MAP, authorize: deny,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_1" }),
    });
    expect(res.status).toBe(404);
    expect(rec.change).toHaveLength(0);
  });

  it("502 when the provider change call fails", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleChangePlan(changeReq({ planCode: "business" }), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec, { throwOn: "change" }), productMap: PRODUCT_MAP, authorize: allow,
      getActiveSubscription: async () => ({ planId: "plan_pro", providerSubscriptionId: "sub_1" }),
    });
    expect(res.status).toBe(502);
  });
});

describe("validateReturnPath", () => {
  it("accepts root-relative paths (with query)", () => {
    expect(validateReturnPath("/orgs/acme/settings/billing")).toBe("/orgs/acme/settings/billing");
    expect(validateReturnPath("/orgs/acme/settings/billing?checkout=complete")).toBe(
      "/orgs/acme/settings/billing?checkout=complete",
    );
  });
  it("rejects absolute, protocol-relative, backslash, control-char, and junk", () => {
    expect(validateReturnPath("https://evil.com/x")).toBeNull();
    expect(validateReturnPath("//evil.com")).toBeNull();
    expect(validateReturnPath("/\\evil.com")).toBeNull();
    expect(validateReturnPath("relative/no-slash")).toBeNull();
    expect(validateReturnPath("/has\\backslash")).toBeNull();
    expect(validateReturnPath("/has\nnewline")).toBeNull();
    expect(validateReturnPath("")).toBeNull();
    expect(validateReturnPath(undefined)).toBeNull();
    expect(validateReturnPath(123)).toBeNull();
  });
});

describe("buildSuccessUrl", () => {
  it("combines embedOrigin + returnPath when both present", () => {
    expect(buildSuccessUrl("https://app.example.com", "/orgs/x/billing", undefined)).toBe(
      "https://app.example.com/orgs/x/billing",
    );
  });
  it("falls back to the env success url when origin/path missing", () => {
    expect(buildSuccessUrl(null, "/orgs/x/billing", "https://fallback.example.com/")).toBe(
      "https://fallback.example.com/",
    );
    expect(buildSuccessUrl("https://app.example.com", null, "https://fallback.example.com/")).toBe(
      "https://fallback.example.com/",
    );
  });
  it("returns empty string when nothing is configured", () => {
    expect(buildSuccessUrl(null, null, undefined)).toBe("");
  });
});

describe("handleCreatePortal", () => {
  function portalReq(): Request {
    return new Request("https://billing/v1/organizations/x/billing/portal", { method: "POST" });
  }

  it("creates a portal session for the org public id and returns the url", async () => {
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
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
    const rec: Recorder = { checkout: [], portal: [], cancel: [], change: [] };
    const res = await handleCreatePortal(portalReq(), env, "req_t", ACTOR, ORG_HEX, {
      registry: recordingRegistry(rec),
      authorize: deny,
    });
    expect(res.status).toBe(404);
    expect(rec.portal).toHaveLength(0);
  });
});
