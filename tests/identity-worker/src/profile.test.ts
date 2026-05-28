import { createFakeRepository } from "./helpers/fake-repository";
import crypto from "node:crypto";

if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", { value: crypto.webcrypto });
}
if (typeof globalThis.crypto.randomUUID !== "function") {
  (globalThis.crypto as unknown as { randomUUID: () => string }).randomUUID = () => crypto.randomUUID();
}

import { handleProfile } from "../../../apps/identity-worker/src/handlers/profile";
import { createAuthService } from "../../../apps/identity-worker/src/services/auth";

async function setupAuthenticatedUser(repo: ReturnType<typeof createFakeRepository>) {
  const recentPast = new Date(Date.now() - 60_000);
  const auth = createAuthService({ repo, now: () => recentPast });
  const loginResult = await auth.startLogin("test@example.com");
  if ("error" in loginResult) throw new Error("startLogin failed");

  const completeResult = await auth.completeLogin(loginResult.challengeId, loginResult.rawCode);
  if ("error" in completeResult) throw new Error("completeLogin failed");

  return { token: completeResult.token, userId: completeResult.user.id };
}

function makeEnv(db = {} as unknown) {
  return { SOURCEPLANE_DB: db, ENVIRONMENT: "test" } as any;
}

function makeGetRequest(token?: string) {
  const headers: Record<string, string> = {};
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new Request("https://identity.internal/v1/auth/profile", {
    method: "GET",
    headers,
  });
}

function makePatchRequest(token: string | undefined, body: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (token) headers["authorization"] = `Bearer ${token}`;
  return new Request("https://identity.internal/v1/auth/profile", {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
}

describe("GET /v1/auth/profile", () => {
  it("returns 401 when no authorization header", async () => {
    const repo = createFakeRepository();
    const response = await handleProfile(makeGetRequest(), makeEnv(), "req_p1", { repo });
    expect(response.status).toBe(401);
    const json = (await response.json()) as any;
    expect(json.error.code).toBe("unauthenticated");
  });

  it("returns 401 for invalid token", async () => {
    const repo = createFakeRepository();
    const response = await handleProfile(makeGetRequest("invalid"), makeEnv(), "req_p2", { repo });
    expect(response.status).toBe(401);
  });

  it("returns user profile for valid session token", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const response = await handleProfile(makeGetRequest(token), makeEnv(), "req_p3", { repo });
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data.user).toBeDefined();
    expect(json.data.user.email).toBe("test@example.com");
    expect(json.data.user.id).toBeDefined();
    expect(json.meta.requestId).toBe("req_p3");
  });
});

describe("PATCH /v1/auth/profile", () => {
  it("returns 401 when no authorization header", async () => {
    const repo = createFakeRepository();
    const response = await handleProfile(
      makePatchRequest(undefined, { displayName: "Test" }),
      makeEnv(),
      "req_u1",
      { repo },
    );
    expect(response.status).toBe(401);
  });

  it("updates displayName successfully", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const response = await handleProfile(
      makePatchRequest(token, { displayName: "Alice" }),
      makeEnv(),
      "req_u2",
      { repo },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data.user.displayName).toBe("Alice");
  });

  it("sets displayName to null when null is provided", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    // First set a name
    await handleProfile(makePatchRequest(token, { displayName: "Alice" }), makeEnv(), "req_u3a", { repo });

    // Then clear it
    const response = await handleProfile(
      makePatchRequest(token, { displayName: null }),
      makeEnv(),
      "req_u3b",
      { repo },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data.user.displayName).toBeNull();
  });

  it("normalizes empty string to null", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const response = await handleProfile(
      makePatchRequest(token, { displayName: "" }),
      makeEnv(),
      "req_u4",
      { repo },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data.user.displayName).toBeNull();
  });

  it("normalizes whitespace-only to null", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const response = await handleProfile(
      makePatchRequest(token, { displayName: "   " }),
      makeEnv(),
      "req_u5",
      { repo },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data.user.displayName).toBeNull();
  });

  it("rejects displayName exceeding 120 characters", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const longName = "A".repeat(121);
    const response = await handleProfile(
      makePatchRequest(token, { displayName: longName }),
      makeEnv(),
      "req_u6",
      { repo },
    );
    expect(response.status).toBe(422);
    const json = (await response.json()) as any;
    expect(json.error.code).toBe("validation_failed");
    expect(json.error.details.fields.displayName).toBeDefined();
  });

  it("accepts displayName at exactly 120 characters", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const exactName = "A".repeat(120);
    const response = await handleProfile(
      makePatchRequest(token, { displayName: exactName }),
      makeEnv(),
      "req_u7",
      { repo },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data.user.displayName).toBe(exactName);
  });

  it("rejects non-string, non-null displayName", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const response = await handleProfile(
      makePatchRequest(token, { displayName: 42 }),
      makeEnv(),
      "req_u8",
      { repo },
    );
    expect(response.status).toBe(422);
    const json = (await response.json()) as any;
    expect(json.error.code).toBe("validation_failed");
  });

  it("rejects unsupported fields", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const response = await handleProfile(
      makePatchRequest(token, { displayName: "Alice", email: "new@example.com" }),
      makeEnv(),
      "req_u9",
      { repo },
    );
    expect(response.status).toBe(422);
    const json = (await response.json()) as any;
    expect(json.error.code).toBe("validation_failed");
    expect(json.error.details.fields.email).toBeDefined();
  });

  it("rejects request with missing displayName field", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const response = await handleProfile(
      makePatchRequest(token, {}),
      makeEnv(),
      "req_u10",
      { repo },
    );
    expect(response.status).toBe(422);
  });

  it("records user.profile.updated security event", async () => {
    const repo = createFakeRepository();
    const { token, userId } = await setupAuthenticatedUser(repo);

    await handleProfile(
      makePatchRequest(token, { displayName: "EventTest" }),
      makeEnv(),
      "req_u11",
      { repo },
    );

    const events = repo._securityEvents;
    const profileEvent = events.find((e: any) => e.eventType === "user.profile.updated");
    expect(profileEvent).toBeDefined();
    expect(profileEvent!.outcome).toBe("success");
  });

  it("returns standard success envelope", async () => {
    const repo = createFakeRepository();
    const { token } = await setupAuthenticatedUser(repo);

    const response = await handleProfile(
      makePatchRequest(token, { displayName: "Envelope" }),
      makeEnv(),
      "req_u12",
      { repo },
    );
    expect(response.status).toBe(200);
    const json = (await response.json()) as any;
    expect(json.data).toBeDefined();
    expect(json.data.user).toBeDefined();
    expect(json.meta).toBeDefined();
    expect(json.meta.requestId).toBe("req_u12");
  });
});
