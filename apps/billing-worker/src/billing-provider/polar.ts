import type {
  BillingProvider,
  CreateCheckoutInput,
  CreateCheckoutResult,
  CreatePortalSessionInput,
  CreatePortalSessionResult,
  NormalizedEvent,
  ProviderCustomerRef,
  ProviderWebhookHeaders,
  VerifyWebhookResult,
} from "./types.js";

/**
 * Polar billing-provider adapter (BP1) — first concrete implementation of the
 * provider-neutral `BillingProvider` seam.
 *
 * Implementation note (deviation from design.md §3, recorded deliberately):
 * the locked design suggested `@polar-sh/sdk`. This adapter is instead a thin,
 * **zero-dependency** implementation over `fetch` (REST) + WebCrypto (Standard
 * Webhooks signature verification), matching this repo's house style — see
 * `@saas/webhook-verifier` and billing-worker's zero-runtime-dependency
 * `package.json`. It keeps the Worker bundle small, needs no Node polyfills, and
 * runs verbatim on Cloudflare Workers. The seam/interface is unchanged, so the
 * SDK can be swapped in behind this same adapter later if ever desired.
 *
 * Invariants (from types.ts): no provider SDK types, secrets, raw payloads, or
 * tokenized URLs cross this seam. `verifyWebhook` MUST fail closed.
 */

export type PolarServer = "sandbox" | "production";

export interface PolarProviderConfig {
  /** Polar organization access token (secret). */
  accessToken: string;
  /** Target API: sandbox or production. */
  server: PolarServer;
  /** Standard Webhooks signing secret (base64, optionally `whsec_`-prefixed). */
  webhookSecret: string;
  /** Injectable fetch for tests; defaults to the global. */
  fetchImpl?: typeof fetch;
  /** Injectable clock for webhook timestamp tolerance (tests). */
  now?: () => Date;
}

const API_BASE: Record<PolarServer, string> = {
  sandbox: "https://sandbox-api.polar.sh",
  production: "https://api.polar.sh",
};

/** Standard Webhooks header names (lowercase; HTTP headers are case-insensitive). */
const SWH_ID = "webhook-id";
const SWH_TIMESTAMP = "webhook-timestamp";
const SWH_SIGNATURE = "webhook-signature";
const SWH_TOLERANCE_SECONDS = 300;

// ── base64 / bytes helpers (WebCrypto-only, Workers-native) ────────────

function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] as number) ^ (b[i] as number);
  return diff === 0;
}

async function hmacSha256(keyBytes: Uint8Array, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as unknown as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

/** Standard Webhooks secret: strip an optional `whsec_` prefix, then base64-decode. */
function decodeWebhookSecret(secret: string): Uint8Array | null {
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return base64ToBytes(raw);
}

function lookupHeader(headers: ProviderWebhookHeaders, name: string): string | undefined {
  const lower = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === lower) return headers[key];
  }
  return undefined;
}

// ── Standard Webhooks signature verification ───────────────────────────

export interface StandardWebhookVerifyInput {
  rawBody: string;
  headers: ProviderWebhookHeaders;
  secret: string;
  now?: () => Date;
  toleranceSeconds?: number;
}

/**
 * Verify a Standard Webhooks signature (https://www.standardwebhooks.com/).
 *   signed content = `${webhook-id}.${webhook-timestamp}.${rawBody}`
 *   signature      = base64( HMAC-SHA256(base64decode(secret), signed content) )
 *   webhook-signature: `v1,<base64>` (space-separated list; any match passes)
 * Returns the opaque `webhook-id` (the dedupe key) on success. Fails closed.
 */
export async function verifyStandardWebhook(
  input: StandardWebhookVerifyInput,
): Promise<{ ok: true; webhookId: string } | { ok: false }> {
  const id = lookupHeader(input.headers, SWH_ID);
  const timestamp = lookupHeader(input.headers, SWH_TIMESTAMP);
  const signatureHeader = lookupHeader(input.headers, SWH_SIGNATURE);
  if (!id || !timestamp || !signatureHeader) return { ok: false };

  // Timestamp must be unix seconds within tolerance (replay protection).
  if (!/^[0-9]+$/.test(timestamp)) return { ok: false };
  const tsSeconds = Number(timestamp);
  if (!Number.isFinite(tsSeconds) || tsSeconds > Number.MAX_SAFE_INTEGER / 1000) {
    return { ok: false };
  }
  const tolerance = input.toleranceSeconds ?? SWH_TOLERANCE_SECONDS;
  const nowSeconds = Math.floor((input.now ?? (() => new Date()))().getTime() / 1000);
  if (Math.abs(nowSeconds - tsSeconds) > tolerance) return { ok: false };

  const keyBytes = decodeWebhookSecret(input.secret);
  if (!keyBytes) return { ok: false };

  const expected = bytesToBase64(
    await hmacSha256(keyBytes, `${id}.${timestamp}.${input.rawBody}`),
  );
  const expectedBytes = base64ToBytes(expected)!;

  // Header may carry several space-separated signatures; any v1 match passes.
  for (const part of signatureHeader.split(" ")) {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) continue;
    const providedBytes = base64ToBytes(value);
    if (providedBytes && constantTimeEqual(providedBytes, expectedBytes)) {
      return { ok: true, webhookId: id };
    }
  }
  return { ok: false };
}

// ── Polar event normalization ──────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function asCents(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
}

/** Resolve our billing-parent org id from a Polar object's many possible carriers. */
function extractOrgId(data: Record<string, unknown>): string | null {
  const meta = asRecord(data.metadata);
  const customer = asRecord(data.customer);
  return (
    (meta && asString(meta.orgId)) ??
    asString(data.external_customer_id) ??
    (customer && asString(customer.external_id)) ??
    asString(data.customer_external_id) ??
    null
  );
}

/**
 * Map a verified Polar event envelope (`{ type, data }`) onto the internal
 * `NormalizedEvent` union. Unknown/unhandled types normalize to `ignored`
 * (still verified) so intake stays provider-agnostic.
 *
 * Subscription lifecycle nuance: Polar `subscription.canceled` is a *scheduled*
 * cancel (access continues to period end) → `subscription.updated`; access is
 * only actually removed on `subscription.revoked` → `subscription.canceled`
 * (the event that triggers a downgrade).
 */
export function normalizePolarEvent(
  webhookId: string,
  envelope: unknown,
): NormalizedEvent {
  const root = asRecord(envelope);
  const type = root ? asString(root.type) : null;
  const data = (root && asRecord(root.data)) ?? {};
  const base = { providerEventId: webhookId, provider: "polar" as const };

  if (!type) return { ...base, type: "ignored", providerType: "unknown" };

  switch (type) {
    case "subscription.created":
    case "subscription.active":
    case "subscription.updated":
    case "subscription.uncanceled":
    case "subscription.past_due":
    case "subscription.canceled":
    case "subscription.revoked": {
      const product = asRecord(data.product);
      return {
        ...base,
        type: type === "subscription.revoked" ? "subscription.canceled"
          : type === "subscription.created" || type === "subscription.active"
            ? "subscription.activated"
            : "subscription.updated",
        orgId: extractOrgId(data),
        providerCustomerId:
          asString(data.customer_id) ?? (asRecord(data.customer)?.id as string | undefined ?? null),
        providerSubscriptionId: asString(data.id),
        productId: asString(data.product_id) ?? (product ? asString(product.id) : null),
        currentPeriodStart: asString(data.current_period_start),
        currentPeriodEnd: asString(data.current_period_end),
      };
    }

    case "order.created":
    case "order.paid": {
      const paid = type === "order.paid" || data.paid === true || asString(data.status) === "paid";
      const due = asCents(data.total_amount ?? data.amount);
      return {
        ...base,
        type: type === "order.paid" ? "invoice.paid" : "invoice.recorded",
        orgId: extractOrgId(data),
        providerCustomerId:
          asString(data.customer_id) ?? (asRecord(data.customer)?.id as string | undefined ?? null),
        providerInvoiceId: asString(data.id),
        providerSubscriptionId: asString(data.subscription_id),
        amountDueCents: due,
        amountPaidCents: paid ? due : 0,
        currency: asString(data.currency) ?? "usd",
        hostedUrl: asString(data.hosted_invoice_url),
      };
    }

    default:
      return { ...base, type: "ignored", providerType: type };
  }
}

// ── Adapter factory ────────────────────────────────────────────────────

export function createPolarProvider(config: PolarProviderConfig): BillingProvider {
  const base = API_BASE[config.server];
  const doFetch = config.fetchImpl ?? fetch;

  async function call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; json: unknown }> {
    const init: RequestInit = {
      method,
      headers: {
        authorization: `Bearer ${config.accessToken}`,
        "content-type": "application/json",
        accept: "application/json",
      },
    };
    if (body !== undefined) init.body = JSON.stringify(body);
    const res = await doFetch(`${base}${path}`, init);
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, json };
  }

  return {
    id: "polar",

    async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
      const { status, json } = await call("POST", "/v1/checkouts/", {
        products: [input.productId],
        success_url: input.successUrl,
        external_customer_id: input.orgId,
        metadata: { orgId: input.orgId, planCode: input.planCode },
      });
      const url = asString(asRecord(json)?.url);
      if (status < 200 || status >= 300 || !url) {
        throw new Error(`polar checkout create failed (status ${status})`);
      }
      return { checkoutUrl: url };
    },

    async createPortalSession(
      input: CreatePortalSessionInput,
    ): Promise<CreatePortalSessionResult> {
      const body: Record<string, unknown> = input.providerCustomerId
        ? { customer_id: input.providerCustomerId }
        : { external_customer_id: input.orgId };
      const { status, json } = await call("POST", "/v1/customer-sessions/", body);
      const url = asString(asRecord(json)?.customer_portal_url);
      if (status < 200 || status >= 300 || !url) {
        throw new Error(`polar customer session create failed (status ${status})`);
      }
      return { portalUrl: url };
    },

    async getCustomerByExternalId(
      externalId: string,
    ): Promise<ProviderCustomerRef | null> {
      const { status, json } = await call(
        "GET",
        `/v1/customers/external/${encodeURIComponent(externalId)}`,
      );
      if (status === 404) return null;
      const rec = asRecord(json);
      const id = rec && asString(rec.id);
      if (status < 200 || status >= 300 || !id) {
        throw new Error(`polar customer lookup failed (status ${status})`);
      }
      return { providerCustomerId: id, externalId: rec ? asString(rec.external_id) : null };
    },

    async verifyWebhook(
      rawBody: string,
      headers: ProviderWebhookHeaders,
    ): Promise<VerifyWebhookResult> {
      const verified = await verifyStandardWebhook({
        rawBody,
        headers,
        secret: config.webhookSecret,
        ...(config.now ? { now: config.now } : {}),
      });
      if (!verified.ok) return { ok: false, reason: "invalid_signature" };

      let envelope: unknown;
      try {
        envelope = JSON.parse(rawBody);
      } catch {
        return { ok: false, reason: "malformed" };
      }
      return { ok: true, event: normalizePolarEvent(verified.webhookId, envelope) };
    },
  };
}
