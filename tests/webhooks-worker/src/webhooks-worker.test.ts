import { route } from "@webhooks-worker/router";
import type { Env } from "@webhooks-worker/env";
import { encodeCursor, decodeCursor, parsePageParams } from "@webhooks-worker/pagination";
import {
  generateRequestId,
  parseOrgPublicId,
  parseProjectPublicId,
  parseWebhookEndpointPublicId,
  parseWebhookSubscriptionPublicId,
  parseWebhookDeliveryAttemptPublicId,
  orgPublicId,
  webhookEndpointPublicId,
  webhookSubscriptionPublicId,
  webhookDeliveryAttemptPublicId,
} from "@webhooks-worker/ids";
import {
  toPublicWebhookEndpoint,
  toPublicWebhookSubscription,
  toPublicDeliveryAttempt,
} from "@webhooks-worker/mappers";
import type { WebhookEndpoint, WebhookSubscription, WebhookDeliveryAttempt } from "@saas/db/webhooks";

// ── Test constants ──────────────────────────────────────────
const TEST_ORG_UUID = "11111111-1111-1111-1111-111111111111";
const TEST_ORG_PUBLIC = "org_11111111111111111111111111111111";
const TEST_PROJECT_UUID = "22222222-2222-2222-2222-222222222222";
const TEST_PROJECT_PUBLIC = "prj_22222222222222222222222222222222";
const TEST_ENDPOINT_UUID = "44444444-4444-4444-4444-444444444444";
const TEST_ENDPOINT_PUBLIC = "whe_44444444444444444444444444444444";
const TEST_SUBSCRIPTION_UUID = "55555555-5555-5555-5555-555555555555";
const TEST_SUBSCRIPTION_PUBLIC = "whs_55555555555555555555555555555555";
const TEST_DELIVERY_UUID = "66666666-6666-6666-6666-666666666666";
const TEST_DELIVERY_PUBLIC = "whd_66666666666666666666666666666666";
const TEST_USER_ID = "usr_aabbccdd";

// ── Mock helpers ────────────────────────────────────────────

function createMockFetcher(responseBody: unknown, status = 200): Fetcher & { fetchCalls: Array<{ url: string; init: RequestInit }> } {
  const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
  return {
    fetch(input: string | Request | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      fetchCalls.push({ url, init: init ?? {} });
      return Promise.resolve(new Response(JSON.stringify(responseBody), {
        status,
        headers: { "content-type": "application/json" },
      }));
    },
    connect() { throw new Error("not implemented"); },
    fetchCalls,
  } as unknown as Fetcher & { fetchCalls: Array<{ url: string; init: RequestInit }> };
}

function createFakeEnv(overrides?: Record<string, unknown>): Env {
  const base: Record<string, unknown> = {
    SOURCEPLANE_DB: { connectionString: "postgres://fake" },
    MEMBERSHIP_WORKER: createMockFetcher({ data: { memberships: [{ kind: "role_assignment", role: "admin", scope: { kind: "organization", orgId: TEST_ORG_UUID } }] } }),
    POLICY_WORKER: createMockFetcher({ data: { allow: true, reason: "org_admin", policyVersion: 1, derivedScope: { orgId: TEST_ORG_UUID } } }),
    ENVIRONMENT: "test",
  };
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete base[key];
      } else {
        base[key] = value;
      }
    }
  }
  return base as unknown as Env;
}

function makeRequest(method: string, path: string, headers?: Record<string, string>): Request {
  return new Request(`https://webhooks-worker${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      "x-request-id": "req_test123",
      "x-actor-subject-id": TEST_USER_ID,
      "x-actor-subject-type": "user",
      ...headers,
    },
  });
}

function makeUnauthenticatedRequest(method: string, path: string): Request {
  return new Request(`https://webhooks-worker${path}`, {
    method,
    headers: { "content-type": "application/json" },
  });
}

// ── ids.ts tests ────────────────────────────────────────────

describe("ids", () => {
  it("generateRequestId returns req_ prefixed string", () => {
    const id = generateRequestId();
    expect(id).toMatch(/^req_[0-9a-f]{24}$/);
  });

  it("parseOrgPublicId round-trips correctly", () => {
    const publicId = orgPublicId(TEST_ORG_UUID);
    expect(publicId).toBe(TEST_ORG_PUBLIC);
    expect(parseOrgPublicId(publicId)).toBe(TEST_ORG_UUID);
  });

  it("parseOrgPublicId returns null for bad prefix", () => {
    expect(parseOrgPublicId("bad_11111111111111111111111111111111")).toBeNull();
  });

  it("parseOrgPublicId returns null for invalid hex length", () => {
    expect(parseOrgPublicId("org_abc")).toBeNull();
  });

  it("parseProjectPublicId round-trips correctly", () => {
    expect(parseProjectPublicId(TEST_PROJECT_PUBLIC)).toBe(TEST_PROJECT_UUID);
  });

  it("webhookEndpointPublicId round-trips correctly", () => {
    const publicId = webhookEndpointPublicId(TEST_ENDPOINT_UUID);
    expect(publicId).toBe(TEST_ENDPOINT_PUBLIC);
    expect(parseWebhookEndpointPublicId(publicId)).toBe(TEST_ENDPOINT_UUID);
  });

  it("parseWebhookEndpointPublicId returns null for bad prefix", () => {
    expect(parseWebhookEndpointPublicId("bad_44444444444444444444444444444444")).toBeNull();
  });

  it("webhookSubscriptionPublicId round-trips correctly", () => {
    const publicId = webhookSubscriptionPublicId(TEST_SUBSCRIPTION_UUID);
    expect(publicId).toBe(TEST_SUBSCRIPTION_PUBLIC);
    expect(parseWebhookSubscriptionPublicId(publicId)).toBe(TEST_SUBSCRIPTION_UUID);
  });

  it("webhookDeliveryAttemptPublicId round-trips correctly", () => {
    const publicId = webhookDeliveryAttemptPublicId(TEST_DELIVERY_UUID);
    expect(publicId).toBe(TEST_DELIVERY_PUBLIC);
    expect(parseWebhookDeliveryAttemptPublicId(publicId)).toBe(TEST_DELIVERY_UUID);
  });

  it("parseWebhookDeliveryAttemptPublicId returns null for bad prefix", () => {
    expect(parseWebhookDeliveryAttemptPublicId("bad_66666666666666666666666666666666")).toBeNull();
  });
});

// ── pagination.ts tests ─────────────────────────────────────

describe("pagination", () => {
  it("encodeCursor / decodeCursor round-trip", () => {
    const createdAt = "2026-01-01T00:00:00.000Z";
    const id = TEST_ORG_UUID;
    const encoded = encodeCursor(createdAt, id);
    const decoded = decodeCursor(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.createdAt).toBe(createdAt);
    expect(decoded!.id).toBe(id);
  });

  it("decodeCursor returns null for garbage", () => {
    expect(decodeCursor("not-base64!!!")).toBeNull();
  });

  it("decodeCursor returns null for wrong version", () => {
    const payload = JSON.stringify({ v: 999, t: "2026-01-01T00:00:00.000Z", i: TEST_ORG_UUID });
    expect(decodeCursor(btoa(payload))).toBeNull();
  });

  it("parsePageParams defaults to limit=50, cursor=null", () => {
    const result = parsePageParams(new URL("https://x/list"));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.limit).toBe(50);
      expect(result.value.cursor).toBeNull();
    }
  });

  it("parsePageParams rejects limit > 100", () => {
    const result = parsePageParams(new URL("https://x/list?limit=200"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("limit");
    }
  });

  it("parsePageParams rejects limit=0", () => {
    const result = parsePageParams(new URL("https://x/list?limit=0"));
    expect(result.ok).toBe(false);
  });

  it("parsePageParams accepts valid cursor", () => {
    const cursor = encodeCursor("2026-01-01T00:00:00.000Z", TEST_ORG_UUID);
    const result = parsePageParams(new URL(`https://x/list?cursor=${cursor}`));
    expect(result.ok).toBe(true);
  });

  it("parsePageParams rejects invalid cursor", () => {
    const result = parsePageParams(new URL("https://x/list?cursor=garbage"));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.field).toBe("cursor");
    }
  });
});

// ── mappers.ts tests ────────────────────────────────────────

describe("mappers", () => {
  const now = new Date("2026-01-15T12:00:00.000Z");

  it("toPublicWebhookEndpoint maps all fields", () => {
    const endpoint: WebhookEndpoint = {
      id: TEST_ENDPOINT_UUID,
      orgId: TEST_ORG_UUID,
      projectId: TEST_PROJECT_UUID,
      url: "https://example.com/hook",
      name: "My Hook",
      description: "desc",
      status: "active",
      disabledReason: null,
      disabledAt: null,
      secretVersion: 1,
      secretLastRotatedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const pub = toPublicWebhookEndpoint(endpoint);
    expect(pub.id).toBe(TEST_ENDPOINT_PUBLIC);
    expect(pub.orgId).toBe(TEST_ORG_PUBLIC);
    expect(pub.projectId).toBe(TEST_PROJECT_PUBLIC);
    expect(pub.url).toBe("https://example.com/hook");
    expect(pub.name).toBe("My Hook");
    expect(pub.status).toBe("active");
    expect(pub.secretVersion).toBe(1);
    expect(pub.secretLastRotatedAt).toBe("2026-01-15T12:00:00.000Z");
    expect(pub.createdAt).toBe("2026-01-15T12:00:00.000Z");
  });

  it("toPublicWebhookEndpoint handles null projectId", () => {
    const endpoint: WebhookEndpoint = {
      id: TEST_ENDPOINT_UUID,
      orgId: TEST_ORG_UUID,
      projectId: null,
      url: "https://example.com/hook",
      name: null,
      description: null,
      status: "active",
      disabledReason: null,
      disabledAt: null,
      secretVersion: 1,
      secretLastRotatedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const pub = toPublicWebhookEndpoint(endpoint);
    expect(pub.projectId).toBeNull();
    expect(pub.name).toBeNull();
    expect(pub.secretLastRotatedAt).toBeNull();
  });

  it("toPublicWebhookSubscription maps all fields", () => {
    const sub: WebhookSubscription = {
      id: TEST_SUBSCRIPTION_UUID,
      orgId: TEST_ORG_UUID,
      endpointId: TEST_ENDPOINT_UUID,
      projectId: null,
      eventType: "project.created",
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    const pub = toPublicWebhookSubscription(sub);
    expect(pub.id).toBe(TEST_SUBSCRIPTION_PUBLIC);
    expect(pub.orgId).toBe(TEST_ORG_PUBLIC);
    expect(pub.endpointId).toBe(TEST_ENDPOINT_PUBLIC);
    expect(pub.eventType).toBe("project.created");
    expect(pub.enabled).toBe(true);
  });

  it("toPublicDeliveryAttempt maps all fields", () => {
    const attempt: WebhookDeliveryAttempt = {
      id: TEST_DELIVERY_UUID,
      orgId: TEST_ORG_UUID,
      endpointId: TEST_ENDPOINT_UUID,
      subscriptionId: TEST_SUBSCRIPTION_UUID,
      eventId: "evt_abc123",
      eventType: "project.created",
      status: "success",
      attemptNumber: 1,
      httpStatusCode: 200,
      failureReason: null,
      idempotencyKey: "idk_abc",
      nextRetryAt: null,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    const pub = toPublicDeliveryAttempt(attempt);
    expect(pub.id).toBe(TEST_DELIVERY_PUBLIC);
    expect(pub.endpointId).toBe(TEST_ENDPOINT_PUBLIC);
    expect(pub.subscriptionId).toBe(TEST_SUBSCRIPTION_PUBLIC);
    expect(pub.status).toBe("success");
    expect(pub.attemptNumber).toBe(1);
    expect(pub.httpStatusCode).toBe(200);
    expect(pub.completedAt).toBe("2026-01-15T12:00:00.000Z");
  });
});

// ── router.ts tests ─────────────────────────────────────────

describe("router", () => {
  it("returns 200 for /health", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", "/health");
    const res = await route(req, env);
    expect(res.status).toBe(200);
    const body = await res.json() as { data: Record<string, unknown> };
    expect(body.data).toHaveProperty("service", "webhooks-worker");
  });

  it("returns 503 when SOURCEPLANE_DB is missing", async () => {
    const env = createFakeEnv({ SOURCEPLANE_DB: undefined });
    const req = makeRequest("GET", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/endpoints`);
    const res = await route(req, env);
    expect(res.status).toBe(503);
  });

  it("returns 503 when MEMBERSHIP_WORKER is missing", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: undefined });
    const req = makeRequest("GET", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/endpoints`);
    const res = await route(req, env);
    expect(res.status).toBe(503);
  });

  it("returns 503 when POLICY_WORKER is missing", async () => {
    const env = createFakeEnv({ POLICY_WORKER: undefined });
    const req = makeRequest("GET", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/endpoints`);
    const res = await route(req, env);
    expect(res.status).toBe(503);
  });

  it("returns 401 when actor headers are missing", async () => {
    const env = createFakeEnv();
    const req = makeUnauthenticatedRequest("GET", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/endpoints`);
    const res = await route(req, env);
    expect(res.status).toBe(401);
  });

  it("returns 404 for unknown path", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", "/v1/organizations/org_abc/unknown");
    const res = await route(req, env);
    expect(res.status).toBe(404);
  });

  it("returns 404 when org ID has bad prefix", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", "/v1/organizations/bad_abc/webhooks/endpoints");
    const res = await route(req, env);
    expect(res.status).toBe(404);
  });

  it("returns 405 for PUT on endpoints collection", async () => {
    const env = createFakeEnv();
    const req = makeRequest("PUT", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/endpoints`);
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("returns 405 for PUT on endpoint item", async () => {
    const env = createFakeEnv();
    const req = makeRequest("PUT", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/endpoints/${TEST_ENDPOINT_PUBLIC}`);
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("returns 405 for GET on disable endpoint", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/endpoints/${TEST_ENDPOINT_PUBLIC}/disable`);
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("returns 405 for GET on rotate-secret", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/endpoints/${TEST_ENDPOINT_PUBLIC}/rotate-secret`);
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("returns 405 for POST on subscription item", async () => {
    const env = createFakeEnv();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/subscriptions/${TEST_SUBSCRIPTION_PUBLIC}`);
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("returns 405 for POST on delivery-attempts list", async () => {
    const env = createFakeEnv();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/endpoints/${TEST_ENDPOINT_PUBLIC}/delivery-attempts`);
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("returns 405 for POST on delivery-attempt item", async () => {
    const env = createFakeEnv();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/webhooks/delivery-attempts/${TEST_DELIVERY_PUBLIC}`);
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("preserves x-request-id from incoming header", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", "/health", { "x-request-id": "req_custom12345" });
    const res = await route(req, env);
    const body = await res.json() as { meta: { requestId: string } };
    expect(body.meta.requestId).toBe("req_custom12345");
  });

  it("generates x-request-id when missing", async () => {
    const env = createFakeEnv();
    const req = new Request("https://webhooks-worker/health", { method: "GET" });
    const res = await route(req, env);
    const body = await res.json() as { meta: { requestId: string } };
    expect(body.meta.requestId).toBeDefined();
    expect(typeof body.meta.requestId).toBe("string");
    expect(body.meta.requestId).toMatch(/^req_/);
  });
});
