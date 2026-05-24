import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { isOrgRoute, handleOrgRoute } from "@api-edge/org-facade";

const __dirname = dirname(fileURLToPath(import.meta.url));

function stripJsoncComments(text: string): string {
  return text.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

interface FetchCall {
  url: string;
  init: RequestInit;
}

function createFakeFetcher(
  response: Response = Response.json({ data: {}, meta: { requestId: "req_test", cursor: null } }),
): { fetcher: Fetcher; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetcher = {
    fetch(input: string | Request | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({ url, init: init ?? {} });
      return Promise.resolve(response.clone());
    },
    connect() {
      throw new Error("not implemented");
    },
  } as unknown as Fetcher;
  return { fetcher, calls };
}

function createThrowingFetcher(error: Error): Fetcher {
  return {
    fetch(): Promise<Response> {
      return Promise.reject(error);
    },
    connect() {
      throw new Error("not implemented");
    },
  } as unknown as Fetcher;
}

function createSessionFetcher(userId: string): { fetcher: Fetcher; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetcher = {
    fetch(input: string | Request | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({ url, init: init ?? {} });
      if (url.includes("/v1/auth/session")) {
        return Promise.resolve(
          Response.json({
            data: { session: { id: "ses_abc", expiresAt: "2026-12-01T00:00:00Z", createdAt: "2026-01-01T00:00:00Z" }, user: { id: userId, email: "user@test.com", displayName: "Test" } },
            meta: { requestId: "req_inner", cursor: null },
          }),
        );
      }
      return Promise.resolve(Response.json({ data: {}, meta: { requestId: "req_test", cursor: null } }));
    },
    connect() {
      throw new Error("not implemented");
    },
  } as unknown as Fetcher;
  return { fetcher, calls };
}

describe("api-edge org facade", () => {
  describe("isOrgRoute", () => {
    it("matches /v1/organizations", () => {
      expect(isOrgRoute("/v1/organizations")).toBe(true);
    });

    it("matches /v1/organizations/{orgId}", () => {
      expect(isOrgRoute("/v1/organizations/org_abc123def456")).toBe(true);
    });

    it("matches /v1/organizations/{orgId}/members", () => {
      expect(isOrgRoute("/v1/organizations/org_abc/members")).toBe(true);
    });

    it("does not match deeper nested org routes", () => {
      expect(isOrgRoute("/v1/organizations/org_abc/members/extra")).toBe(false);
    });

    it("does not match /v1/auth routes", () => {
      expect(isOrgRoute("/v1/auth/session")).toBe(false);
    });
  });

  describe("session resolution through IDENTITY_WORKER", () => {
    it("resolves session and forwards actor context to MEMBERSHIP_WORKER", async () => {
      const { fetcher: identityFetcher, calls: identityCalls } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher, calls: membershipCalls } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(identityCalls).toHaveLength(1);
      expect(identityCalls[0]!.url).toContain("/v1/auth/session");

      expect(membershipCalls).toHaveLength(1);
      const forwardedHeaders = new Headers(membershipCalls[0]!.init.headers as HeadersInit);
      expect(forwardedHeaders.get("x-actor-subject-id")).toBe("usr_abc123");
      expect(forwardedHeaders.get("x-actor-subject-type")).toBe("user");
    });

    it("does not forward raw bearer token to MEMBERSHIP_WORKER", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher, calls: membershipCalls } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      const forwardedHeaders = new Headers(membershipCalls[0]!.init.headers as HeadersInit);
      expect(forwardedHeaders.get("authorization")).toBeNull();
      const rawCall = JSON.stringify(membershipCalls[0]);
      expect(rawCall).not.toContain("sps_ses_");
      expect(rawCall).not.toContain("Bearer");
    });

    it("returns unauthenticated when bearer token is missing", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(response.status).toBe(401);
      const json = await response.json() as any;
      expect(json.error.code).toBe("unauthenticated");
    });

    it("returns unauthenticated when identity service returns error", async () => {
      const identityFetcher = {
        fetch(): Promise<Response> {
          return Promise.resolve(
            Response.json({ error: { code: "unauthenticated", message: "Invalid token", requestId: "req_x" } }, { status: 401 }),
          );
        },
        connect() { throw new Error("not implemented"); },
      } as unknown as Fetcher;
      const { fetcher: membershipFetcher } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.bad" },
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(response.status).toBe(401);
    });
  });

  describe("error handling", () => {
    it("returns 503 when IDENTITY_WORKER is not configured", async () => {
      const { fetcher: membershipFetcher } = createFakeFetcher();
      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      const response = await handleOrgRoute(
        request,
        { MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(response.status).toBe(503);
      const json = await response.json() as any;
      expect(json.error.code).toBe("internal_error");
      expect(json.error.message).toBe("Authentication service unavailable");
      expect(JSON.stringify(json)).not.toContain("identity-worker");
    });

    it("returns 503 when MEMBERSHIP_WORKER is not configured", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(response.status).toBe(503);
      const json = await response.json() as any;
      expect(json.error.code).toBe("internal_error");
      expect(json.error.message).toBe("Membership service unavailable");
      expect(JSON.stringify(json)).not.toContain("membership-worker");
    });

    it("returns 503 with safe envelope when membership binding throws", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const membershipFetcher = createThrowingFetcher(
        new Error("Connection refused to membership-worker-stage.internal"),
      );

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(response.status).toBe(503);
      const json = await response.json() as any;
      expect(json.error.message).toBe("Membership service unavailable");
      expect(JSON.stringify(json)).not.toContain("Connection refused");
      expect(JSON.stringify(json)).not.toContain("membership-worker-stage");
    });

    it("returns 405 for unsupported method on /v1/organizations", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "DELETE",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(response.status).toBe(405);
      const json = await response.json() as any;
      expect(json.error.code).toBe("unsupported");
    });

    it("returns 405 for non-GET on /v1/organizations/:id", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations/org_abc", {
        method: "DELETE",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations/org_abc",
      );

      expect(response.status).toBe(405);
    });
  });

  describe("downstream response passthrough", () => {
    it("passes through membership success envelope", async () => {
      const envelope = { data: { organizations: [] }, meta: { requestId: "req_123", cursor: null } };
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher } = createFakeFetcher(Response.json(envelope));

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual(envelope);
    });

    it("passes through membership error envelope", async () => {
      const envelope = { error: { code: "conflict", message: "Organization already exists", details: {}, requestId: "req_123" } };
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher } = createFakeFetcher(Response.json(envelope, { status: 409 }));

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "POST",
        headers: { authorization: "Bearer sps_ses_abc.secret", "content-type": "application/json" },
        body: JSON.stringify({ name: "test" }),
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(response.status).toBe(409);
      const json = await response.json();
      expect(json).toEqual(envelope);
    });
  });

  describe("header forwarding", () => {
    it("forwards x-request-id to membership", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher, calls } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret", "x-request-id": "req_custom" },
      });

      await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_custom",
        "/v1/organizations",
      );

      const forwarded = new Headers(calls[0]!.init.headers as HeadersInit);
      expect(forwarded.get("x-request-id")).toBe("req_custom");
    });

    it("forwards traceparent to membership", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher, calls } = createFakeFetcher();
      const traceparent = "00-abcdef1234567890-1234567890abcdef-01";

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret", traceparent },
      });

      await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      const forwarded = new Headers(calls[0]!.init.headers as HeadersInit);
      expect(forwarded.get("traceparent")).toBe(traceparent);
    });

    it("forwards idempotency-key to membership", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher, calls } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "POST",
        headers: { authorization: "Bearer sps_ses_abc.secret", "content-type": "application/json", "idempotency-key": "idem_xyz" },
        body: JSON.stringify({ name: "Test" }),
      });

      await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      const forwarded = new Headers(calls[0]!.init.headers as HeadersInit);
      expect(forwarded.get("idempotency-key")).toBe("idem_xyz");
    });

    it("forwards POST body to membership", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher, calls } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations", {
        method: "POST",
        headers: { authorization: "Bearer sps_ses_abc.secret", "content-type": "application/json" },
        body: JSON.stringify({ name: "My Org" }),
      });

      await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations",
      );

      expect(calls[0]!.init.body).toBeDefined();
    });
  });

  describe("binding verification config", () => {
    it("wrangler.jsonc has stage MEMBERSHIP_WORKER binding to membership-worker-stage", () => {
      const configPath = resolve(__dirname, "../../../apps/api-edge/wrangler.jsonc");
      const raw = readFileSync(configPath, "utf-8");
      const config = JSON.parse(stripJsoncComments(raw));

      const stageServices = config.env?.stage?.services;
      expect(stageServices).toBeDefined();
      const membership = stageServices.find((s: any) => s.binding === "MEMBERSHIP_WORKER");
      expect(membership).toBeDefined();
      expect(membership.service).toBe("membership-worker-stage");
    });

    it("wrangler.jsonc has prod MEMBERSHIP_WORKER binding to membership-worker-prod", () => {
      const configPath = resolve(__dirname, "../../../apps/api-edge/wrangler.jsonc");
      const raw = readFileSync(configPath, "utf-8");
      const config = JSON.parse(stripJsoncComments(raw));

      const prodServices = config.env?.prod?.services;
      expect(prodServices).toBeDefined();
      const membership = prodServices.find((s: any) => s.binding === "MEMBERSHIP_WORKER");
      expect(membership).toBeDefined();
      expect(membership.service).toBe("membership-worker-prod");
    });

    it("stage does not bind to prod membership worker", () => {
      const configPath = resolve(__dirname, "../../../apps/api-edge/wrangler.jsonc");
      const raw = readFileSync(configPath, "utf-8");
      const config = JSON.parse(stripJsoncComments(raw));

      const stageServices = config.env?.stage?.services ?? [];
      const membershipBindings = stageServices.filter((s: any) => s.binding === "MEMBERSHIP_WORKER");
      for (const svc of membershipBindings) {
        expect(svc.service).not.toContain("prod");
      }
    });

    it("prod does not bind to stage membership worker", () => {
      const configPath = resolve(__dirname, "../../../apps/api-edge/wrangler.jsonc");
      const raw = readFileSync(configPath, "utf-8");
      const config = JSON.parse(stripJsoncComments(raw));

      const prodServices = config.env?.prod?.services ?? [];
      const membershipBindings = prodServices.filter((s: any) => s.binding === "MEMBERSHIP_WORKER");
      for (const svc of membershipBindings) {
        expect(svc.service).not.toContain("stage");
      }
    });
  });

  describe("members route /v1/organizations/{orgId}/members", () => {
    it("forwards GET /v1/organizations/{orgId}/members to MEMBERSHIP_WORKER", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher, calls: membershipCalls } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations/org_abc123/members", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations/org_abc123/members",
      );

      expect(response.status).toBe(200);
      expect(membershipCalls).toHaveLength(1);
      expect(membershipCalls[0]!.url).toContain("/v1/organizations/org_abc123/members");
    });

    it("only allows GET method", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations/org_abc123/members", {
        method: "POST",
        headers: { authorization: "Bearer sps_ses_abc.secret", "content-type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations/org_abc123/members",
      );

      expect(response.status).toBe(405);
      const json = await response.json() as any;
      expect(json.error.code).toBe("unsupported");
    });

    it("resolves auth and forwards actor headers", async () => {
      const { fetcher: identityFetcher, calls: identityCalls } = createSessionFetcher("usr_member_actor");
      const { fetcher: membershipFetcher, calls: membershipCalls } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations/org_abc123/members", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations/org_abc123/members",
      );

      expect(identityCalls).toHaveLength(1);
      expect(identityCalls[0]!.url).toContain("/v1/auth/session");

      const forwarded = new Headers(membershipCalls[0]!.init.headers as HeadersInit);
      expect(forwarded.get("x-actor-subject-id")).toBe("usr_member_actor");
      expect(forwarded.get("x-actor-subject-type")).toBe("user");
    });

    it("does not forward raw bearer token to MEMBERSHIP_WORKER", async () => {
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher, calls: membershipCalls } = createFakeFetcher();

      const request = new Request("https://api.example.com/v1/organizations/org_abc123/members", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_secret_token.xyz" },
      });

      await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations/org_abc123/members",
      );

      const forwarded = new Headers(membershipCalls[0]!.init.headers as HeadersInit);
      expect(forwarded.get("authorization")).toBeNull();
      const rawCall = JSON.stringify(membershipCalls[0]);
      expect(rawCall).not.toContain("sps_ses_secret_token");
      expect(rawCall).not.toContain("Bearer");
    });

    it("passes through downstream success response", async () => {
      const envelope = { data: { members: [] }, meta: { requestId: "req_123", cursor: null } };
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher } = createFakeFetcher(Response.json(envelope));

      const request = new Request("https://api.example.com/v1/organizations/org_abc123/members", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations/org_abc123/members",
      );

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual(envelope);
    });

    it("passes through downstream error response", async () => {
      const envelope = { error: { code: "not_found", message: "Organization not found", details: {}, requestId: "req_123" } };
      const { fetcher: identityFetcher } = createSessionFetcher("usr_abc123");
      const { fetcher: membershipFetcher } = createFakeFetcher(Response.json(envelope, { status: 404 }));

      const request = new Request("https://api.example.com/v1/organizations/org_abc123/members", {
        method: "GET",
        headers: { authorization: "Bearer sps_ses_abc.secret" },
      });

      const response = await handleOrgRoute(
        request,
        { IDENTITY_WORKER: identityFetcher, MEMBERSHIP_WORKER: membershipFetcher, ENVIRONMENT: "test" },
        "req_test",
        "/v1/organizations/org_abc123/members",
      );

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json).toEqual(envelope);
    });
  });
});
