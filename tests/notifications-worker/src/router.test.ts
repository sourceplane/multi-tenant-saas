import crypto from "node:crypto";
import { route } from "@notifications-worker/router";
import type { Env } from "@notifications-worker/env";

if (!(globalThis as Record<string, unknown>).crypto) {
  (globalThis as Record<string, unknown>).crypto = crypto;
}

const env: Env = { ENVIRONMENT: "test", NOTIFICATIONS_PROVIDER: "local-debug" };

function internalHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    "x-internal-actor": "membership-worker",
    "x-actor-subject-id": "svc-membership",
    "x-actor-subject-type": "service",
    "x-request-id": "req_router_test",
  };
}

describe("router — internal-actor gate", () => {
  it("returns 200 on /health without actor header", async () => {
    const res = await route(new Request("http://nf/health", { method: "GET" }), env);
    // Without SOURCEPLANE_DB the response is 200 with degraded=false (db not configured).
    expect([200, 503]).toContain(res.status);
  });

  it("returns 403 when POST /v1/notifications is called without x-internal-actor", async () => {
    const res = await route(
      new Request("http://nf/v1/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      env,
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("forbidden");
  });

  it("returns 403 when x-internal-actor is not on the allow-list", async () => {
    const res = await route(
      new Request("http://nf/v1/notifications", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-internal-actor": "console-ui",
          "x-actor-subject-id": "x",
          "x-actor-subject-type": "user",
        },
        body: JSON.stringify({}),
      }),
      env,
    );
    expect(res.status).toBe(403);
  });

  it("returns 503 when DB is not configured even for an authorized internal caller", async () => {
    const res = await route(
      new Request("http://nf/v1/notifications", {
        method: "POST",
        headers: internalHeaders(),
        body: JSON.stringify({
          orgId: "00000000-0000-0000-0000-000000000000",
          category: "invitation",
          templateKey: "invitation.created",
          recipient: { channel: "email", address: "x@y.com" },
        }),
      }),
      env,
    );
    // Without SOURCEPLANE_DB the handler returns 503 "Database not configured".
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("internal_error");
  });

  it("returns 422 for malformed enqueue body", async () => {
    const res = await route(
      new Request("http://nf/v1/notifications", {
        method: "POST",
        headers: internalHeaders(),
        body: JSON.stringify({ orgId: "x" }),
      }),
      env,
    );
    expect(res.status).toBe(422);
  });

  it("returns 405 for PATCH /v1/notifications", async () => {
    const res = await route(
      new Request("http://nf/v1/notifications", { method: "PATCH", headers: internalHeaders() }),
      env,
    );
    expect(res.status).toBe(405);
  });

  it("returns 404 for unknown routes", async () => {
    const res = await route(
      new Request("http://nf/v2/unknown", { method: "GET", headers: internalHeaders() }),
      env,
    );
    expect(res.status).toBe(404);
  });
});
