import { route } from "@billing-worker/router";
import type { Env } from "@billing-worker/env";
import {
  generateRequestId,
  parseOrgPublicId,
  parseSubscriptionPublicId,
} from "@billing-worker/ids";
import {
  parseCheckEntitlementBody,
  decideEntitlement,
  handleCheckEntitlement,
} from "@billing-worker/handlers/check-entitlement";
import type { BillingRepository, BillingResult, Entitlement } from "@saas/db/billing";

const TEST_ORG_UUID = "11111111-1111-1111-1111-111111111111";
const TEST_ORG_PUBLIC = "org_11111111111111111111111111111111";
const TEST_USER_ID = "usr_aabbccdd";

function createMockFetcher(
  responseBody: unknown,
  status = 200,
): Fetcher & { fetchCalls: Array<{ url: string; init: RequestInit }> } {
  const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
  return {
    fetch(input: string | Request | URL, init?: RequestInit): Promise<Response> {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      fetchCalls.push({ url, init: init ?? {} });
      return Promise.resolve(
        new Response(JSON.stringify(responseBody), {
          status,
          headers: { "content-type": "application/json" },
        }),
      );
    },
    connect() {
      throw new Error("not implemented");
    },
    fetchCalls,
  } as unknown as Fetcher & {
    fetchCalls: Array<{ url: string; init: RequestInit }>;
  };
}

function createFakeEnv(overrides?: Record<string, unknown>): Env {
  const base: Record<string, unknown> = {
    SOURCEPLANE_DB: { connectionString: "postgres://fake" },
    MEMBERSHIP_WORKER: createMockFetcher({
      data: {
        memberships: [
          {
            kind: "role_assignment",
            role: "billing_admin",
            scope: { kind: "organization", orgId: TEST_ORG_UUID },
          },
        ],
      },
    }),
    POLICY_WORKER: createMockFetcher({
      data: {
        allow: true,
        reason: "org_billing_admin",
        policyVersion: 1,
        derivedScope: { orgId: TEST_ORG_UUID },
      },
    }),
    ENVIRONMENT: "test",
  };
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) delete base[key];
      else base[key] = value;
    }
  }
  return base as unknown as Env;
}

function makeRequest(
  method: string,
  path: string,
  headers?: Record<string, string>,
): Request {
  return new Request(`https://billing-worker${path}`, {
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
  return new Request(`https://billing-worker${path}`, {
    method,
    headers: { "content-type": "application/json" },
  });
}

// ── ids tests ────────────────────────────────────────────────

describe("ids", () => {
  it("generateRequestId returns req_ prefixed string", () => {
    expect(generateRequestId()).toMatch(/^req_[0-9a-f]{24}$/);
  });

  it("parseOrgPublicId round-trips correctly", () => {
    expect(parseOrgPublicId(TEST_ORG_PUBLIC)).toBe(TEST_ORG_UUID);
  });

  it("parseOrgPublicId returns null for bad prefix", () => {
    expect(parseOrgPublicId("bad_11111111111111111111111111111111")).toBeNull();
  });

  it("parseOrgPublicId returns null for invalid hex", () => {
    expect(parseOrgPublicId("org_abc")).toBeNull();
  });

  it("parseSubscriptionPublicId works", () => {
    expect(
      parseSubscriptionPublicId("sub_22222222222222222222222222222222"),
    ).toBe("22222222-2222-2222-2222-222222222222");
  });

  it("parseSubscriptionPublicId rejects wrong prefix", () => {
    expect(
      parseSubscriptionPublicId("org_22222222222222222222222222222222"),
    ).toBeNull();
  });
});

// ── Router tests ─────────────────────────────────────────────

describe("router", () => {
  it("GET /health returns 200 when bindings present", async () => {
    const env = createFakeEnv();
    const req = new Request("https://billing-worker/health", { method: "GET" });
    const res = await route(req, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { status: string } };
    expect(body.data.status).toBe("ok");
  });

  it("GET /health returns 503 when SOURCEPLANE_DB missing", async () => {
    const env = createFakeEnv({ SOURCEPLANE_DB: undefined });
    const req = new Request("https://billing-worker/health", { method: "GET" });
    const res = await route(req, env);
    expect(res.status).toBe(503);
  });

  it("returns 404 for unknown routes", async () => {
    const env = createFakeEnv();
    const req = makeRequest(
      "GET",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/unknown`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(404);
  });

  it("returns 404 for invalid org public id", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", "/v1/organizations/bad_id/billing/plans");
    const res = await route(req, env);
    expect(res.status).toBe(404);
  });

  it("returns 401 for unauthenticated requests", async () => {
    const env = createFakeEnv();
    const req = makeUnauthenticatedRequest(
      "GET",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/plans`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(401);
  });

  it("returns 405 for POST on a billing read route", async () => {
    const env = createFakeEnv();
    const req = makeRequest(
      "POST",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/plans`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it.each([
    "plans",
    "customer",
    "summary",
    "invoices",
    "entitlements",
  ])("returns 404 (fail-closed) when policy denies %s", async (suffix) => {
    const denyPolicy = createMockFetcher({
      data: {
        allow: false,
        reason: "no_matching_role",
        policyVersion: 1,
        derivedScope: { orgId: TEST_ORG_UUID },
      },
    });
    const env = createFakeEnv({ POLICY_WORKER: denyPolicy });
    const req = makeRequest(
      "GET",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/${suffix}`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(404);
  });

  it("returns 404 when membership-worker fails (fail-closed)", async () => {
    const failing = createMockFetcher({ error: { code: "x" } }, 500);
    const env = createFakeEnv({ MEMBERSHIP_WORKER: failing });
    const req = makeRequest(
      "GET",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/plans`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid status query on plans", async () => {
    const env = createFakeEnv();
    const req = makeRequest(
      "GET",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/plans?status=bogus`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid subscriptionId on invoices", async () => {
    const env = createFakeEnv();
    const req = makeRequest(
      "GET",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/invoices?subscriptionId=not_a_sub`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid source on entitlements", async () => {
    const env = createFakeEnv();
    const req = makeRequest(
      "GET",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/entitlements?source=bogus`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid limit on invoices", async () => {
    const env = createFakeEnv();
    const req = makeRequest(
      "GET",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/invoices?limit=9999`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid cursor on invoices", async () => {
    const env = createFakeEnv();
    const req = makeRequest(
      "GET",
      `/v1/organizations/${TEST_ORG_PUBLIC}/billing/invoices?cursor=not-base64-json`,
    );
    const res = await route(req, env);
    expect(res.status).toBe(400);
  });

  it("preserves x-request-id from header on health", async () => {
    const env = createFakeEnv();
    const req = new Request("https://billing-worker/health", {
      method: "GET",
      headers: { "x-request-id": "req_custom123" },
    });
    const res = await route(req, env);
    expect(res.headers.get("x-request-id")).toBe("req_custom123");
  });

  // ── Internal entitlement-check route (Task 0078) ──
  it("internal entitlement-check route rejects GET with 405", async () => {
    const env = createFakeEnv();
    const req = new Request(
      "https://billing-worker/v1/internal/billing/entitlements/check",
      {
        method: "GET",
        headers: { "x-internal-caller": "projects-worker" },
      },
    );
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("internal entitlement-check route does NOT require x-actor headers", async () => {
    // Caller is a service binding from another bounded-context Worker, not an
    // end user. With DB missing we expect 503 (misconfiguration), NOT 401.
    const env = createFakeEnv({ SOURCEPLANE_DB: undefined });
    const req = new Request(
      "https://billing-worker/v1/internal/billing/entitlements/check",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-caller": "projects-worker",
        },
        body: JSON.stringify({
          orgId: TEST_ORG_PUBLIC,
          entitlementKey: "feature.custom_domains",
        }),
      },
    );
    const res = await route(req, env);
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("internal_error");
  });

  it("internal entitlement-check route rejects invalid JSON with 400", async () => {
    const env = createFakeEnv();
    const req = new Request(
      "https://billing-worker/v1/internal/billing/entitlements/check",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-caller": "projects-worker",
        },
        body: "{not json",
      },
    );
    const res = await route(req, env);
    expect(res.status).toBe(400);
  });

  it("internal entitlement-check route rejects malformed orgId/key with 400", async () => {
    const env = createFakeEnv();
    const req = new Request(
      "https://billing-worker/v1/internal/billing/entitlements/check",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-caller": "projects-worker",
        },
        body: JSON.stringify({ orgId: "not_org", entitlementKey: "Bad.KEY" }),
      },
    );
    const res = await route(req, env);
    expect(res.status).toBe(400);
  });

  // ── Internal caller allow-list (Task 0079) ──
  it("internal entitlement-check route rejects missing x-internal-caller with 403", async () => {
    const env = createFakeEnv();
    const req = new Request(
      "https://billing-worker/v1/internal/billing/entitlements/check",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId: TEST_ORG_PUBLIC,
          entitlementKey: "limit.projects",
        }),
      },
    );
    const res = await route(req, env);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("unauthorized");
  });

  it("internal entitlement-check route rejects unknown caller with 403", async () => {
    const env = createFakeEnv();
    const req = new Request(
      "https://billing-worker/v1/internal/billing/entitlements/check",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-caller": "rogue-worker",
        },
        body: JSON.stringify({
          orgId: TEST_ORG_PUBLIC,
          entitlementKey: "limit.projects",
        }),
      },
    );
    const res = await route(req, env);
    expect(res.status).toBe(403);
  });

  it("internal entitlement-check route rejects malformed caller header with 403", async () => {
    const env = createFakeEnv();
    const req = new Request(
      "https://billing-worker/v1/internal/billing/entitlements/check",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-caller": "Projects-Worker!",
        },
        body: JSON.stringify({
          orgId: TEST_ORG_PUBLIC,
          entitlementKey: "limit.projects",
        }),
      },
    );
    const res = await route(req, env);
    expect(res.status).toBe(403);
  });

  it("internal caller allow-list runs BEFORE method/body validation", async () => {
    // Without caller header, a GET should still get 403 (gate first) not 405.
    const env = createFakeEnv();
    const req = new Request(
      "https://billing-worker/v1/internal/billing/entitlements/check",
      { method: "GET" },
    );
    const res = await route(req, env);
    expect(res.status).toBe(403);
  });
});

// ── Internal entitlement-check unit tests ────────────────────

const TEST_ORG_HEX = "11111111-1111-1111-1111-111111111111";

function fakeRepo(
  result: BillingResult<Entitlement>,
): Pick<BillingRepository, "getEntitlement"> {
  return {
    getEntitlement: () => Promise.resolve(result),
  };
}

function makeEntitlement(overrides: Partial<Entitlement> = {}): Entitlement {
  return {
    id: "ent_1",
    orgId: TEST_ORG_HEX,
    subscriptionId: "sub-uuid",
    entitlementKey: "feature.custom_domains",
    valueType: "boolean",
    enabled: true,
    limitValue: null,
    source: "plan",
    metadata: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("parseCheckEntitlementBody", () => {
  it("rejects non-object payloads", () => {
    expect(parseCheckEntitlementBody(null)).toEqual({
      error: expect.any(String),
    });
    expect(parseCheckEntitlementBody("hello")).toEqual({
      error: expect.any(String),
    });
  });

  it("rejects missing orgId or entitlementKey", () => {
    expect(parseCheckEntitlementBody({})).toEqual({ error: expect.any(String) });
    expect(parseCheckEntitlementBody({ orgId: TEST_ORG_PUBLIC })).toEqual({
      error: expect.any(String),
    });
    expect(
      parseCheckEntitlementBody({ entitlementKey: "feature.custom_domains" }),
    ).toEqual({ error: expect.any(String) });
  });

  it("rejects malformed entitlement keys", () => {
    for (const key of ["Bad.KEY", "1leading", "trailing.", ".leading", "has space", "with-dash"]) {
      const parsed = parseCheckEntitlementBody({
        orgId: TEST_ORG_PUBLIC,
        entitlementKey: key,
      });
      expect(parsed).toEqual({ error: expect.any(String) });
    }
  });

  it("rejects an entitlement key over 128 chars", () => {
    const key = "a." + "b".repeat(200);
    expect(
      parseCheckEntitlementBody({ orgId: TEST_ORG_PUBLIC, entitlementKey: key }),
    ).toEqual({ error: expect.any(String) });
  });

  it("rejects malformed org public ids", () => {
    expect(
      parseCheckEntitlementBody({
        orgId: "org_short",
        entitlementKey: "feature.custom_domains",
      }),
    ).toEqual({ error: expect.any(String) });
  });

  it("accepts a well-formed payload", () => {
    const parsed = parseCheckEntitlementBody({
      orgId: TEST_ORG_PUBLIC,
      entitlementKey: "feature.custom_domains",
    });
    expect(parsed).toEqual({
      publicOrgId: TEST_ORG_PUBLIC,
      orgId: TEST_ORG_HEX,
      entitlementKey: "feature.custom_domains",
    });
  });
});

describe("decideEntitlement", () => {
  const parsed = {
    publicOrgId: TEST_ORG_PUBLIC,
    orgId: TEST_ORG_HEX,
    entitlementKey: "feature.custom_domains",
  };

  it("returns allowed for an enabled entitlement with safe fields", async () => {
    const repo = fakeRepo({
      ok: true,
      value: makeEntitlement({
        valueType: "quantity",
        limitValue: 10,
        source: "override",
        subscriptionId: "sub-uuid-x",
        metadata: { secret: "should_not_leak" },
      }),
    });
    const outcome = await decideEntitlement(repo, parsed);
    expect(outcome.kind).toBe("decision");
    if (outcome.kind !== "decision") return;
    expect(outcome.body).toEqual({
      allowed: true,
      orgId: TEST_ORG_PUBLIC,
      entitlementKey: "feature.custom_domains",
      valueType: "quantity",
      limitValue: 10,
      source: "override",
      subscriptionId: "sub-uuid-x",
    });
    // Crucially: no metadata, no raw db row, no provider fields.
    expect(Object.prototype.hasOwnProperty.call(outcome.body, "metadata")).toBe(
      false,
    );
  });

  it("returns denied/disabled for a present but disabled entitlement", async () => {
    const repo = fakeRepo({
      ok: true,
      value: makeEntitlement({ enabled: false }),
    });
    const outcome = await decideEntitlement(repo, parsed);
    expect(outcome).toEqual({
      kind: "decision",
      body: {
        allowed: false,
        orgId: TEST_ORG_PUBLIC,
        entitlementKey: "feature.custom_domains",
        reason: "disabled",
      },
    });
  });

  it("returns denied/not_configured for a missing entitlement (fail-closed)", async () => {
    const repo = fakeRepo({ ok: false, error: { kind: "not_found" } });
    const outcome = await decideEntitlement(repo, parsed);
    expect(outcome).toEqual({
      kind: "decision",
      body: {
        allowed: false,
        orgId: TEST_ORG_PUBLIC,
        entitlementKey: "feature.custom_domains",
        reason: "not_configured",
      },
    });
  });

  it("surfaces repo_error for non-not_found repository failures", async () => {
    const repo = fakeRepo({
      ok: false,
      error: { kind: "internal", message: "db blew up" },
    });
    const outcome = await decideEntitlement(repo, parsed);
    expect(outcome.kind).toBe("repo_error");
  });
});

describe("handleCheckEntitlement (with injected repo)", () => {
  function makeReq(body: unknown): Request {
    return new Request(
      "https://billing-worker/v1/internal/billing/entitlements/check",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
      },
    );
  }

  it("returns 200 with an allowed decision on a happy path", async () => {
    const env = createFakeEnv();
    const repo = fakeRepo({ ok: true, value: makeEntitlement() });
    const res = await handleCheckEntitlement(
      makeReq({ orgId: TEST_ORG_PUBLIC, entitlementKey: "feature.custom_domains" }),
      env,
      "req_test",
      { repoFactory: () => repo },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { allowed: boolean; entitlementKey: string };
    };
    expect(body.data.allowed).toBe(true);
    expect(body.data.entitlementKey).toBe("feature.custom_domains");
  });

  it("returns 200 with a not_configured denial for missing entitlement", async () => {
    const env = createFakeEnv();
    const repo = fakeRepo({ ok: false, error: { kind: "not_found" } });
    const res = await handleCheckEntitlement(
      makeReq({ orgId: TEST_ORG_PUBLIC, entitlementKey: "feature.unknown" }),
      env,
      "req_test",
      { repoFactory: () => repo },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { allowed: boolean; reason: string };
    };
    expect(body.data.allowed).toBe(false);
    expect(body.data.reason).toBe("not_configured");
  });

  it("returns 503 internal_error on a non-not_found repo failure without leaking details", async () => {
    const env = createFakeEnv();
    const repo = fakeRepo({
      ok: false,
      error: {
        kind: "internal",
        message: "SELECT * FROM billing.entitlements failed at line 42",
      },
    });
    const res = await handleCheckEntitlement(
      makeReq({ orgId: TEST_ORG_PUBLIC, entitlementKey: "feature.custom_domains" }),
      env,
      "req_test",
      { repoFactory: () => repo },
    );
    expect(res.status).toBe(503);
    const text = await res.text();
    expect(text).not.toContain("SELECT");
    expect(text).not.toContain("billing.entitlements");
    expect(text).not.toContain("line 42");
  });
});
