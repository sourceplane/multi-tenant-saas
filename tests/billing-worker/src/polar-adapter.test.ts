import {
  createPolarProvider,
  verifyStandardWebhook,
  normalizePolarEvent,
} from "@billing-worker/billing-provider/polar";
import {
  buildPolarProvider,
  createDefaultBillingProviderRegistry,
} from "@billing-worker/billing-provider/registry";

// ── Standard Webhooks signing helpers (mirror the adapter, for test inputs) ──

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}
async function sign(secretB64: string, id: string, ts: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    base64ToBytes(secretB64) as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  return `v1,${bytesToBase64(new Uint8Array(sig))}`;
}

const SECRET_B64 = bytesToBase64(new TextEncoder().encode("0123456789abcdef0123456789abcdef"));
const SECRET = `whsec_${SECRET_B64}`;
const FIXED = new Date("2026-06-09T00:00:00.000Z");
const TS = String(Math.floor(FIXED.getTime() / 1000));
const ID = "evt_abc123";

function headers(sig: string, over: Record<string, string> = {}): Record<string, string> {
  return { "webhook-id": ID, "webhook-timestamp": TS, "webhook-signature": sig, ...over };
}

describe("verifyStandardWebhook", () => {
  const body = JSON.stringify({ type: "order.paid", data: {} });

  it("accepts a correctly signed payload and returns the webhook id (dedupe key)", async () => {
    const sig = await sign(SECRET_B64, ID, TS, body);
    const res = await verifyStandardWebhook({ rawBody: body, headers: headers(sig), secret: SECRET, now: () => FIXED });
    expect(res).toEqual({ ok: true, webhookId: ID });
  });

  it("accepts a secret without the whsec_ prefix", async () => {
    const sig = await sign(SECRET_B64, ID, TS, body);
    const res = await verifyStandardWebhook({ rawBody: body, headers: headers(sig), secret: SECRET_B64, now: () => FIXED });
    expect(res.ok).toBe(true);
  });

  it("accepts when multiple space-separated signatures are present (one matches)", async () => {
    const good = await sign(SECRET_B64, ID, TS, body);
    const res = await verifyStandardWebhook({
      rawBody: body,
      headers: headers(`v1,deadbeef ${good}`),
      secret: SECRET,
      now: () => FIXED,
    });
    expect(res.ok).toBe(true);
  });

  it("rejects a tampered body (signature mismatch)", async () => {
    const sig = await sign(SECRET_B64, ID, TS, body);
    const res = await verifyStandardWebhook({ rawBody: body + " ", headers: headers(sig), secret: SECRET, now: () => FIXED });
    expect(res.ok).toBe(false);
  });

  it("rejects the wrong secret", async () => {
    const sig = await sign(SECRET_B64, ID, TS, body);
    const other = bytesToBase64(new TextEncoder().encode("ffffffffffffffffffffffffffffffff"));
    const res = await verifyStandardWebhook({ rawBody: body, headers: headers(sig), secret: other, now: () => FIXED });
    expect(res.ok).toBe(false);
  });

  it("rejects an out-of-tolerance timestamp (replay protection)", async () => {
    const sig = await sign(SECRET_B64, ID, TS, body);
    const later = new Date(FIXED.getTime() + 10 * 60 * 1000); // +10 min > 5 min tolerance
    const res = await verifyStandardWebhook({ rawBody: body, headers: headers(sig), secret: SECRET, now: () => later });
    expect(res.ok).toBe(false);
  });

  it("rejects missing headers", async () => {
    const sig = await sign(SECRET_B64, ID, TS, body);
    const res = await verifyStandardWebhook({
      rawBody: body,
      headers: { "webhook-signature": sig },
      secret: SECRET,
      now: () => FIXED,
    });
    expect(res.ok).toBe(false);
  });
});

describe("normalizePolarEvent", () => {
  it("maps subscription.created/active → subscription.activated with linkage", () => {
    const ev = normalizePolarEvent(ID, {
      type: "subscription.created",
      data: {
        id: "sub_1",
        customer_id: "cus_1",
        product_id: "prod_pro",
        current_period_start: "2026-06-01T00:00:00Z",
        current_period_end: "2026-07-01T00:00:00Z",
        metadata: { orgId: "org_abc", planCode: "pro" },
      },
    });
    expect(ev).toMatchObject({
      type: "subscription.activated",
      provider: "polar",
      providerEventId: ID,
      orgId: "org_abc",
      providerCustomerId: "cus_1",
      providerSubscriptionId: "sub_1",
      productId: "prod_pro",
      currentPeriodEnd: "2026-07-01T00:00:00Z",
    });
  });

  it("maps subscription.canceled (scheduled) → subscription.updated", () => {
    const ev = normalizePolarEvent(ID, { type: "subscription.canceled", data: { id: "sub_1", customer: { external_id: "org_x" } } });
    expect(ev.type).toBe("subscription.updated");
    if (ev.type === "subscription.updated") expect(ev.orgId).toBe("org_x");
  });

  it("maps subscription.revoked (access ended) → subscription.canceled", () => {
    const ev = normalizePolarEvent(ID, { type: "subscription.revoked", data: { id: "sub_1", customer_id: "cus_1", metadata: { orgId: "org_x" } } });
    expect(ev.type).toBe("subscription.canceled");
  });

  it("maps order.paid → invoice.paid with amounts from total_amount", () => {
    const ev = normalizePolarEvent(ID, {
      type: "order.paid",
      data: { id: "ord_1", customer_id: "cus_1", subscription_id: "sub_1", total_amount: 2000, currency: "usd", metadata: { orgId: "org_x" } },
    });
    expect(ev).toMatchObject({ type: "invoice.paid", providerInvoiceId: "ord_1", amountDueCents: 2000, amountPaidCents: 2000, currency: "usd" });
  });

  it("maps order.created → invoice.recorded with amountPaid 0 when unpaid", () => {
    const ev = normalizePolarEvent(ID, { type: "order.created", data: { id: "ord_2", amount: 9900, currency: "usd", metadata: { orgId: "org_x" } } });
    expect(ev).toMatchObject({ type: "invoice.recorded", amountDueCents: 9900, amountPaidCents: 0 });
  });

  it("normalizes unknown/unhandled types to ignored (still carries the event id)", () => {
    const ev = normalizePolarEvent(ID, { type: "benefit.created", data: {} });
    expect(ev).toMatchObject({ type: "ignored", providerType: "benefit.created", providerEventId: ID });
  });

  it("handles a malformed envelope without throwing", () => {
    expect(normalizePolarEvent(ID, null).type).toBe("ignored");
    expect(normalizePolarEvent(ID, { data: {} }).type).toBe("ignored");
  });
});

describe("createPolarProvider REST calls (injected fetch)", () => {
  function fakeFetch(status: number, json: unknown) {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const impl = ((url: string, init?: RequestInit) => {
      calls.push({ url, init: init ?? {} });
      return Promise.resolve(new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } }));
    }) as unknown as typeof fetch;
    return { impl, calls };
  }

  it("createCheckout posts to sandbox /v1/checkouts/ and returns the hosted url", async () => {
    const { impl, calls } = fakeFetch(201, { id: "co_1", url: "https://sandbox.polar.sh/checkout/co_1" });
    const provider = createPolarProvider({ accessToken: "tok", server: "sandbox", webhookSecret: SECRET, fetchImpl: impl });
    const res = await provider.createCheckout({ orgId: "org_abc", planCode: "pro", productId: "prod_pro", successUrl: "https://app/complete" });
    expect(res.checkoutUrl).toBe("https://sandbox.polar.sh/checkout/co_1");
    expect(calls[0]!.url).toBe("https://sandbox-api.polar.sh/v1/checkouts/");
    const body = JSON.parse(calls[0]!.init.body as string);
    expect(body).toMatchObject({ products: ["prod_pro"], success_url: "https://app/complete", external_customer_id: "org_abc", metadata: { orgId: "org_abc", planCode: "pro" } });
    expect((calls[0]!.init.headers as Record<string, string>).authorization).toBe("Bearer tok");
  });

  it("createCheckout throws on a non-2xx response", async () => {
    const { impl } = fakeFetch(422, { error: "bad" });
    const provider = createPolarProvider({ accessToken: "tok", server: "sandbox", webhookSecret: SECRET, fetchImpl: impl });
    await expect(
      provider.createCheckout({ orgId: "org_abc", planCode: "pro", productId: "prod_pro", successUrl: "https://app/complete" }),
    ).rejects.toThrow();
  });

  it("createPortalSession returns customer_portal_url and targets production base", async () => {
    const { impl, calls } = fakeFetch(201, { customer_portal_url: "https://polar.sh/portal/xyz" });
    const provider = createPolarProvider({ accessToken: "tok", server: "production", webhookSecret: SECRET, fetchImpl: impl });
    const res = await provider.createPortalSession({ orgId: "org_abc" });
    expect(res.portalUrl).toBe("https://polar.sh/portal/xyz");
    expect(calls[0]!.url).toBe("https://api.polar.sh/v1/customer-sessions/");
  });

  it("getCustomerByExternalId returns null on 404", async () => {
    const { impl } = fakeFetch(404, { detail: "not found" });
    const provider = createPolarProvider({ accessToken: "tok", server: "sandbox", webhookSecret: SECRET, fetchImpl: impl });
    expect(await provider.getCustomerByExternalId("org_abc")).toBeNull();
  });

  it("getCustomerByExternalId returns a customer ref on 200", async () => {
    const { impl, calls } = fakeFetch(200, { id: "cus_9", external_id: "org_abc", email: "x@y.z" });
    const provider = createPolarProvider({ accessToken: "tok", server: "sandbox", webhookSecret: SECRET, fetchImpl: impl });
    const ref = await provider.getCustomerByExternalId("org_abc");
    expect(ref).toEqual({ providerCustomerId: "cus_9", externalId: "org_abc" });
    expect(calls[0]!.url).toBe("https://sandbox-api.polar.sh/v1/customers/external/org_abc");
  });

  it("verifyWebhook returns the normalized event for a valid signature", async () => {
    const provider = createPolarProvider({ accessToken: "tok", server: "sandbox", webhookSecret: SECRET, now: () => FIXED });
    const body = JSON.stringify({ type: "subscription.created", data: { id: "sub_1", product_id: "prod_pro", metadata: { orgId: "org_abc" } } });
    const sig = await sign(SECRET_B64, ID, TS, body);
    const res = await provider.verifyWebhook(body, headers(sig));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.event.type).toBe("subscription.activated");
  });

  it("verifyWebhook fails closed on a bad signature", async () => {
    const provider = createPolarProvider({ accessToken: "tok", server: "sandbox", webhookSecret: SECRET, now: () => FIXED });
    const body = JSON.stringify({ type: "order.paid", data: {} });
    const res = await provider.verifyWebhook(body, headers("v1,deadbeef"));
    expect(res).toEqual({ ok: false, reason: "invalid_signature" });
  });
});

describe("registry: Polar registration is config-gated", () => {
  it("buildPolarProvider returns null without secrets", () => {
    expect(buildPolarProvider({})).toBeNull();
    expect(buildPolarProvider({ POLAR_ACCESS_TOKEN: "tok" })).toBeNull();
  });

  it("buildPolarProvider returns a polar adapter when both secrets are set", () => {
    const p = buildPolarProvider({ POLAR_ACCESS_TOKEN: "tok", POLAR_WEBHOOK_SECRET: SECRET });
    expect(p?.id).toBe("polar");
  });

  it("default registry resolves Polar once secrets are present", () => {
    const reg = createDefaultBillingProviderRegistry({ POLAR_ACCESS_TOKEN: "tok", POLAR_WEBHOOK_SECRET: SECRET });
    const res = reg.resolve({ BILLING_PROVIDER: "polar" });
    expect(res.ok).toBe(true);
  });

  it("default registry stays dormant (not_configured) without secrets", () => {
    const reg = createDefaultBillingProviderRegistry({});
    expect(reg.resolve({ BILLING_PROVIDER: "polar" })).toEqual({ ok: false, reason: "not_configured" });
  });
});
