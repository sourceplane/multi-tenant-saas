import { route } from "@billing-worker/router";
import type { Env } from "@billing-worker/env";
import {
  generateRequestId,
  parseOrgPublicId,
  parseSubscriptionPublicId,
} from "@billing-worker/ids";

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
});
