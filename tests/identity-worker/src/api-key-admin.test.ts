/// <reference types="@cloudflare/workers-types" />
import { createFakeRepository } from "./helpers/fake-repository";
import crypto from "node:crypto";

if (!(globalThis as any).crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: crypto.webcrypto });
}
if (typeof (globalThis as any).crypto.randomUUID !== "function") {
  ((globalThis as any).crypto as { randomUUID: () => string }).randomUUID = () => crypto.randomUUID();
}

import {
  handleCreateApiKey,
  handleListApiKeys,
  handleRevokeApiKey,
} from "../../../apps/identity-worker/src/handlers/api-key-admin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface FetchCall {
  url: string;
  init: RequestInit;
}

function createMockFetcher(
  handler?: (url: string, init: RequestInit) => Promise<Response>,
): { fetcher: any; calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetcher = {
    fetch(input: string | Request | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      const i = init ?? {};
      calls.push({ url, init: i });
      if (handler) return handler(url, i);
      return Promise.resolve(Response.json({ data: {} }));
    },
    connect() {
      throw new Error("not implemented");
    },
  } as any;
  return { fetcher, calls };
}

/** Creates a fake EventsRepository with appendEventWithAudit */
function createFakeEventsRepo() {
  const events: any[] = [];
  return {
    events,
    async appendEvent(input: any) {
      events.push(input);
      return { ok: true as const, value: { ...input.event ?? input, createdAt: new Date() } };
    },
    async appendEventWithAudit(input: any) {
      events.push(input);
      return {
        ok: true as const,
        value: {
          event: { ...input.event, createdAt: new Date() },
          audit: { ...input.audit, createdAt: new Date() },
        },
      };
    },
    async queryAuditByOrg() {
      return { ok: true as const, value: { items: [], nextCursor: null } };
    },
    async queryAuditByTarget() {
      return { ok: true as const, value: { items: [], nextCursor: null } };
    },
  };
}

function makeEnv(membershipFetcher: any, policyFetcher: any) {
  return {
    SOURCEPLANE_DB: {} as any,
    MEMBERSHIP_WORKER: membershipFetcher,
    POLICY_WORKER: policyFetcher,
    ENVIRONMENT: "test",
  } as any;
}

/** Standard membership + policy fetcher that approves everything */
function createApprovingFetchers(): {
  membershipFetcher: any;
  membershipCalls: FetchCall[];
  policyFetcher: any;
  policyCalls: FetchCall[];
} {
  const { fetcher: membershipFetcher, calls: membershipCalls } = createMockFetcher(async (url) => {
    if (url.includes("/authorization-context")) {
      return Response.json({
        data: {
          memberships: [
            { kind: "role_assignment", role: "owner", scope: { kind: "organization", orgId: "org_1" } },
          ],
        },
      });
    }
    if (url.includes("/service-principal-bindings")) {
      return Response.json({ data: { id: "bind_1" } });
    }
    return Response.json({ data: {} });
  });

  const { fetcher: policyFetcher, calls: policyCalls } = createMockFetcher(async () => {
    return Response.json({ data: { allow: true, reason: "org_owner", policyVersion: 1 } });
  });

  return { membershipFetcher, membershipCalls, policyFetcher, policyCalls };
}

function makeCreateRequest(orgId: string, body: object, actorHeaders = true): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (actorHeaders) {
    headers["x-actor-subject-id"] = "usr_actor1";
    headers["x-actor-subject-type"] = "user";
  }
  return new Request(`https://identity.internal/v1/organizations/${orgId}/api-keys`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeListRequest(orgId: string, actorHeaders = true): Request {
  const headers: Record<string, string> = {};
  if (actorHeaders) {
    headers["x-actor-subject-id"] = "usr_actor1";
    headers["x-actor-subject-type"] = "user";
  }
  return new Request(`https://identity.internal/v1/organizations/${orgId}/api-keys`, {
    method: "GET",
    headers,
  });
}

function makeRevokeRequest(orgId: string, keyId: string, actorHeaders = true): Request {
  const headers: Record<string, string> = {};
  if (actorHeaders) {
    headers["x-actor-subject-id"] = "usr_actor1";
    headers["x-actor-subject-type"] = "user";
  }
  return new Request(`https://identity.internal/v1/organizations/${orgId}/api-keys/${keyId}`, {
    method: "DELETE",
    headers,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("handleCreateApiKey", () => {
  it("returns 401 if no actor headers", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleCreateApiKey(
      makeCreateRequest("org_1", { label: "test", role: "admin" }, false),
      makeEnv(membershipFetcher, policyFetcher),
      "req_1",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(401);
  });

  it("returns 422 if label is missing", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleCreateApiKey(
      makeCreateRequest("org_1", { role: "admin" }),
      makeEnv(membershipFetcher, policyFetcher),
      "req_2",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(422);
    const json = (await response.json()) as any;
    expect(json.error.details.fields.label).toBeDefined();
  });

  it("returns 422 if label is too long", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleCreateApiKey(
      makeCreateRequest("org_1", { label: "x".repeat(129), role: "admin" }),
      makeEnv(membershipFetcher, policyFetcher),
      "req_2b",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(422);
  });

  it("returns 422 if role is invalid", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleCreateApiKey(
      makeCreateRequest("org_1", { label: "test", role: "superadmin" }),
      makeEnv(membershipFetcher, policyFetcher),
      "req_3",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(422);
    const json = (await response.json()) as any;
    expect(json.error.details.fields.role).toBeDefined();
  });

  it("returns 422 if project role without projectId", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleCreateApiKey(
      makeCreateRequest("org_1", { label: "test", role: "project_admin" }),
      makeEnv(membershipFetcher, policyFetcher),
      "req_4",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(422);
    const json = (await response.json()) as any;
    expect(json.error.details.fields.projectId).toBeDefined();
  });

  it("returns 404 if membership context fails", async () => {
    const { fetcher: membershipFetcher } = createMockFetcher(async (url) => {
      if (url.includes("/authorization-context")) {
        return Response.json({ error: { code: "not_found" } }, { status: 404 });
      }
      return Response.json({ data: {} });
    });
    const { fetcher: policyFetcher } = createMockFetcher(async () =>
      Response.json({ data: { allow: true, reason: "ok", policyVersion: 1 } }),
    );
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleCreateApiKey(
      makeCreateRequest("org_1", { label: "test", role: "admin" }),
      makeEnv(membershipFetcher, policyFetcher),
      "req_5",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(404);
  });

  it("returns 404 if policy denies", async () => {
    const { fetcher: membershipFetcher } = createMockFetcher(async (url) => {
      if (url.includes("/authorization-context")) {
        return Response.json({
          data: {
            memberships: [
              { kind: "role_assignment", role: "viewer", scope: { kind: "organization", orgId: "org_1" } },
            ],
          },
        });
      }
      return Response.json({ data: {} });
    });
    const { fetcher: policyFetcher } = createMockFetcher(async () =>
      Response.json({ data: { allow: false, reason: "denied", policyVersion: 1 } }),
    );
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleCreateApiKey(
      makeCreateRequest("org_1", { label: "test", role: "admin" }),
      makeEnv(membershipFetcher, policyFetcher),
      "req_6",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(404);
  });

  it("returns 201 with api key data on success", async () => {
    const { membershipFetcher } = createApprovingFetchers();
    const { fetcher: policyFetcher } = createMockFetcher(async () =>
      Response.json({ data: { allow: true, reason: "org_owner", policyVersion: 1 } }),
    );
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleCreateApiKey(
      makeCreateRequest("org_1", { label: "My Key", role: "admin" }),
      makeEnv(membershipFetcher, policyFetcher),
      "req_7",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(201);
    const json = (await response.json()) as any;
    const apiKey = json.data.apiKey;
    expect(apiKey.secret).toMatch(/^sk_/);
    expect(apiKey.prefix).toBe(apiKey.secret.slice(0, 12));
    expect(apiKey.label).toBe("My Key");
    expect(apiKey.servicePrincipal).toBeDefined();
    expect(apiKey.servicePrincipal.role).toBe("admin");

    // SP was created in the repo
    expect(repo._servicePrincipals.size).toBe(1);

    // Security event was recorded
    const secEvents = repo._securityEvents.filter(e => e.eventType === "api_key.created");
    expect(secEvents).toHaveLength(1);

    // Org event was appended
    expect(eventsRepo.events.length).toBeGreaterThanOrEqual(1);
  });
});

describe("handleListApiKeys", () => {
  it("returns 401 if no actor headers", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();

    const response = await handleListApiKeys(
      makeListRequest("org_1", false),
      makeEnv(membershipFetcher, policyFetcher),
      "req_l1",
      { identityRepo: repo },
    );
    expect(response.status).toBe(401);
  });

  it("returns 200 with empty list when no keys exist", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();

    const response = await handleListApiKeys(
      makeListRequest("org_1"),
      makeEnv(membershipFetcher, policyFetcher),
      "req_l2",
      { identityRepo: repo },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data.apiKeys).toEqual([]);
  });

  it("returns 200 with keys after creating one", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const now = new Date();

    // Add a SP and API key directly to the repo
    await repo.createServicePrincipal({
      id: "sp_1",
      orgId: "org_1",
      projectId: null,
      displayName: "API Key: test-key",
      createdBy: "usr_actor1",
      createdAt: now,
    });
    await repo.createApiKey({
      id: "key_1",
      servicePrincipalId: "sp_1",
      orgId: "org_1",
      keyPrefix: "sk_abcdef1234",
      keyHash: "hash_1",
      label: "test-key",
      expiresAt: null,
      createdBy: "usr_actor1",
      createdAt: now,
    });

    const response = await handleListApiKeys(
      makeListRequest("org_1"),
      makeEnv(membershipFetcher, policyFetcher),
      "req_l3",
      { identityRepo: repo },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data.apiKeys).toHaveLength(1);
    expect(json.data.apiKeys[0].id).toBe("key_1");
    expect(json.data.apiKeys[0].label).toBe("test-key");
  });
});

describe("handleRevokeApiKey", () => {
  it("returns 401 if no actor headers", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleRevokeApiKey(
      makeRevokeRequest("org_1", "key_1", false),
      makeEnv(membershipFetcher, policyFetcher),
      "req_r1",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(401);
  });

  it("returns 404 if key does not exist", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();

    const response = await handleRevokeApiKey(
      makeRevokeRequest("org_1", "key_nonexistent"),
      makeEnv(membershipFetcher, policyFetcher),
      "req_r2",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(404);
  });

  it("returns 409 if already revoked", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();
    const now = new Date();

    await repo.createServicePrincipal({
      id: "sp_r",
      orgId: "org_1",
      projectId: null,
      displayName: "API Key: revoked-key",
      createdBy: "usr_actor1",
      createdAt: now,
    });
    await repo.createApiKey({
      id: "key_revoked",
      servicePrincipalId: "sp_r",
      orgId: "org_1",
      keyPrefix: "sk_revoked1234",
      keyHash: "hash_r",
      label: "revoked-key",
      expiresAt: null,
      createdBy: "usr_actor1",
      createdAt: now,
    });
    // Revoke it
    await repo.revokeApiKey("key_revoked", "usr_actor1", now);

    const response = await handleRevokeApiKey(
      makeRevokeRequest("org_1", "key_revoked"),
      makeEnv(membershipFetcher, policyFetcher),
      "req_r3",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(409);
  });

  it("returns 200 on success with revoked key data", async () => {
    const { membershipFetcher, policyFetcher } = createApprovingFetchers();
    const repo = createFakeRepository();
    const eventsRepo = createFakeEventsRepo();
    const now = new Date();

    await repo.createServicePrincipal({
      id: "sp_s",
      orgId: "org_1",
      projectId: null,
      displayName: "API Key: active-key",
      createdBy: "usr_actor1",
      createdAt: now,
    });
    await repo.createApiKey({
      id: "key_active",
      servicePrincipalId: "sp_s",
      orgId: "org_1",
      keyPrefix: "sk_active12345",
      keyHash: "hash_s",
      label: "active-key",
      expiresAt: null,
      createdBy: "usr_actor1",
      createdAt: now,
    });

    const response = await handleRevokeApiKey(
      makeRevokeRequest("org_1", "key_active"),
      makeEnv(membershipFetcher, policyFetcher),
      "req_r4",
      { identityRepo: repo, eventsRepo: eventsRepo as any },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data.apiKey.id).toBe("key_active");
    expect(json.data.apiKey.label).toBe("active-key");
    expect(json.data.apiKey.revokedAt).toBeDefined();
  });
});
