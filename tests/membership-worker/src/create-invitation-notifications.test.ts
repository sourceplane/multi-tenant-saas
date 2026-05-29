/// <reference types="@cloudflare/workers-types" />
/**
 * Task 0088 — coverage for the create-invitation → notifications-worker
 * wire. Asserts best-effort semantics: invitation response is invariant
 * across enqueue outcomes; payload is redaction-safe; non-success branches
 * do not enqueue.
 */
import { handleCreateInvitation } from "@membership-worker/handlers/create-invitation";
import type { RoleAssignment } from "@saas/db/membership";

type EnqueueArgs = {
  env: unknown;
  ctx: unknown;
  request: any;
};

const orgUuid = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const orgPublicIdStr = `org_${orgUuid.replace(/-/g, "")}`;
const actor = { subjectId: "usr_admin", subjectType: "user" };
const fixedNow = new Date("2026-01-15T10:00:00.000Z");
const RAW_TOKEN = "rawtoken_must_not_leak_into_notification_payload";

function policyFetcher(allow: boolean): Fetcher {
  return {
    fetch: async () =>
      Response.json({
        data: { allow, reason: allow ? "granted" : "denied", policyVersion: 1, derivedScope: {} },
        meta: { requestId: "req_test", cursor: null },
      }),
  } as unknown as Fetcher;
}

function baseRepo() {
  const roles: RoleAssignment[] = [
    {
      id: "ra1",
      orgId: orgUuid,
      subjectId: "usr_admin",
      subjectType: "user",
      role: "admin",
      scopeKind: "organization",
      scopeRef: null,
      createdAt: fixedNow,
      revokedAt: null,
    },
  ];
  return {
    listRoleAssignments: async () => ({ ok: true as const, value: roles }),
    countBillableMembers: async () => ({ ok: true as const, value: 0 }),
    createInvitation: async (input: any) => ({
      ok: true as const,
      value: {
        id: input.id,
        orgId: input.orgId,
        email: input.email,
        emailLower: input.emailLower,
        role: input.role,
        status: "pending",
        invitedBy: input.invitedBy,
        expiresAt: input.expiresAt,
        acceptedAt: null,
        revokedAt: null,
        createdAt: input.createdAt,
      },
    }),
  };
}

function makeRequest(body: unknown): Request {
  return new Request("https://test.local/v1/organizations/" + orgPublicIdStr + "/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRecorder() {
  const calls: EnqueueArgs[] = [];
  const fn = async (env: unknown, ctx: unknown, request: any) => {
    calls.push({ env, ctx, request });
    return { ok: true as const, notificationId: "ntf_test_123" };
  };
  return { calls, fn };
}

const fakeToken = { raw: RAW_TOKEN, hash: "hash_" + "a".repeat(60) };

describe("create-invitation → notifications-worker wire (Task 0088)", () => {
  it("enqueues invitation.created with category invitation and lower-cased recipient", async () => {
    const recorder = makeRecorder();
    const env = {
      POLICY_WORKER: policyFetcher(true),
      SOURCEPLANE_DB: {} as Hyperdrive,
      ENVIRONMENT: "test",
      DEBUG_DELIVERY: "false",
      NOTIFICATIONS_WORKER: {} as Fetcher,
    };

    const response = await handleCreateInvitation(
      makeRequest({ email: "INVITE@Example.COM", role: "builder" }),
      env as any,
      "req_test",
      actor,
      orgPublicIdStr,
      {
        repo: baseRepo(),
        generateToken: async () => fakeToken,
        now: () => fixedNow,
        enqueueNotification: recorder.fn,
      },
    );

    expect(response.status).toBe(201);
    expect(recorder.calls).toHaveLength(1);

    const call = recorder.calls[0]!;
    expect(call.request.category).toBe("invitation");
    expect(call.request.templateKey).toBe("invitation.created");
    expect(call.request.recipient.channel).toBe("email");
    expect(call.request.recipient.address).toBe("invite@example.com");
    expect(call.request.orgId).toBe(orgUuid);
    expect(call.request.correlationId).toBe("req_test");

    const ctx = call.ctx as any;
    expect(ctx.internalActor).toBe("membership-worker");
    expect(ctx.actorSubjectType).toBe("user");
    expect(ctx.actorSubjectId).toBe("usr_admin");
    expect(ctx.requestId).toBe("req_test");
  });

  it("never includes the raw invitation token in the enqueue payload", async () => {
    const recorder = makeRecorder();
    const env = {
      POLICY_WORKER: policyFetcher(true),
      SOURCEPLANE_DB: {} as Hyperdrive,
      ENVIRONMENT: "test",
      DEBUG_DELIVERY: "false",
      NOTIFICATIONS_WORKER: {} as Fetcher,
    };

    await handleCreateInvitation(
      makeRequest({ email: "user@test.com", role: "viewer" }),
      env as any,
      "req_test",
      actor,
      orgPublicIdStr,
      {
        repo: baseRepo(),
        generateToken: async () => fakeToken,
        now: () => fixedNow,
        enqueueNotification: recorder.fn,
      },
    );

    expect(recorder.calls).toHaveLength(1);
    const serialized = JSON.stringify(recorder.calls[0]!.request);
    expect(serialized).not.toContain(RAW_TOKEN);
    expect(serialized).not.toContain(fakeToken.hash);
  });

  it("returns 201 unchanged when enqueue fails (non_2xx)", async () => {
    const env = {
      POLICY_WORKER: policyFetcher(true),
      SOURCEPLANE_DB: {} as Hyperdrive,
      ENVIRONMENT: "test",
      DEBUG_DELIVERY: "false",
      NOTIFICATIONS_WORKER: {} as Fetcher,
    };

    const response = await handleCreateInvitation(
      makeRequest({ email: "user@test.com", role: "viewer" }),
      env as any,
      "req_test",
      actor,
      orgPublicIdStr,
      {
        repo: baseRepo(),
        generateToken: async () => fakeToken,
        now: () => fixedNow,
        enqueueNotification: async () => ({ ok: false as const, reason: "non_2xx" as const }),
      },
    );

    expect(response.status).toBe(201);
    const json = (await response.json()) as any;
    expect(json.data.invitation.email).toBe("user@test.com");
    expect(json.data.invitation.role).toBe("viewer");
  });

  it("returns 201 unchanged when enqueue returns no_binding (NOTIFICATIONS_WORKER undefined)", async () => {
    const env = {
      POLICY_WORKER: policyFetcher(true),
      SOURCEPLANE_DB: {} as Hyperdrive,
      ENVIRONMENT: "test",
      DEBUG_DELIVERY: "false",
      // NOTIFICATIONS_WORKER intentionally absent.
    };

    const recorder = makeRecorder();
    // Inject a stand-in client that mimics the real `no_binding` short-circuit:
    // when env.NOTIFICATIONS_WORKER is undefined, the real client returns
    // `{ ok: false, reason: "no_binding" }` without performing any side
    // effect. The handler must not branch on the result.
    const fn = async (envArg: any) => {
      if (!envArg?.NOTIFICATIONS_WORKER) {
        return { ok: false as const, reason: "no_binding" as const };
      }
      return recorder.fn(envArg, null, null as any);
    };

    const response = await handleCreateInvitation(
      makeRequest({ email: "user@test.com", role: "viewer" }),
      env as any,
      "req_test",
      actor,
      orgPublicIdStr,
      {
        repo: baseRepo(),
        generateToken: async () => fakeToken,
        now: () => fixedNow,
        enqueueNotification: fn,
      },
    );

    expect(response.status).toBe(201);
  });

  it("does NOT enqueue on validation failure", async () => {
    const recorder = makeRecorder();
    const env = {
      POLICY_WORKER: policyFetcher(true),
      SOURCEPLANE_DB: {} as Hyperdrive,
      ENVIRONMENT: "test",
      DEBUG_DELIVERY: "false",
      NOTIFICATIONS_WORKER: {} as Fetcher,
    };

    const response = await handleCreateInvitation(
      makeRequest({ email: "not-an-email", role: "viewer" }),
      env as any,
      "req_test",
      actor,
      orgPublicIdStr,
      {
        repo: baseRepo(),
        generateToken: async () => fakeToken,
        now: () => fixedNow,
        enqueueNotification: recorder.fn,
      },
    );

    expect(response.status).toBe(422);
    expect(recorder.calls).toHaveLength(0);
  });

  it("does NOT enqueue on policy denial", async () => {
    const recorder = makeRecorder();
    const env = {
      POLICY_WORKER: policyFetcher(false),
      SOURCEPLANE_DB: {} as Hyperdrive,
      ENVIRONMENT: "test",
      DEBUG_DELIVERY: "false",
      NOTIFICATIONS_WORKER: {} as Fetcher,
    };

    const response = await handleCreateInvitation(
      makeRequest({ email: "user@test.com", role: "viewer" }),
      env as any,
      "req_test",
      actor,
      orgPublicIdStr,
      {
        repo: baseRepo(),
        generateToken: async () => fakeToken,
        now: () => fixedNow,
        enqueueNotification: recorder.fn,
      },
    );

    expect(response.status).toBe(404);
    expect(recorder.calls).toHaveLength(0);
  });

  it("does NOT enqueue on billing precondition_failed deny", async () => {
    const recorder = makeRecorder();
    const env = {
      POLICY_WORKER: policyFetcher(true),
      BILLING_WORKER: {} as Fetcher,
      SOURCEPLANE_DB: {} as Hyperdrive,
      ENVIRONMENT: "test",
      DEBUG_DELIVERY: "false",
      NOTIFICATIONS_WORKER: {} as Fetcher,
    };

    const repo = {
      ...baseRepo(),
      countBillableMembers: async () => ({ ok: true as const, value: 5 }),
    };

    const response = await handleCreateInvitation(
      makeRequest({ email: "user@test.com", role: "viewer" }),
      env as any,
      "req_test",
      actor,
      orgPublicIdStr,
      {
        repo,
        generateToken: async () => fakeToken,
        now: () => fixedNow,
        enqueueNotification: recorder.fn,
        checkEntitlement: async (_b, orgPid, key) => ({
          kind: "decision" as const,
          decision: {
            allowed: true as const,
            orgId: orgPid,
            entitlementKey: key,
            valueType: "quantity" as const,
            limitValue: 3,
            source: "plan" as const,
            subscriptionId: null,
          },
        }),
      },
    );

    expect(response.status).toBe(412);
    expect(recorder.calls).toHaveLength(0);
  });

  it("does NOT enqueue under DEBUG_DELIVERY=true (skipped in dev to avoid duplicate local_debug rows)", async () => {
    const recorder = makeRecorder();
    const env = {
      POLICY_WORKER: policyFetcher(true),
      SOURCEPLANE_DB: {} as Hyperdrive,
      ENVIRONMENT: "test",
      DEBUG_DELIVERY: "true",
      NOTIFICATIONS_WORKER: {} as Fetcher,
    };

    const response = await handleCreateInvitation(
      makeRequest({ email: "user@test.com", role: "viewer" }),
      env as any,
      "req_test",
      actor,
      orgPublicIdStr,
      {
        repo: baseRepo(),
        generateToken: async () => fakeToken,
        now: () => fixedNow,
        enqueueNotification: recorder.fn,
      },
    );

    expect(response.status).toBe(201);
    expect(recorder.calls).toHaveLength(0);
    // Existing local_debug response-body contract preserved.
    const json = (await response.json()) as any;
    expect(json.data.delivery).toEqual({ mode: "local_debug", token: RAW_TOKEN });
  });

  it("templateData contains expected redaction-safe keys only", async () => {
    const recorder = makeRecorder();
    const env = {
      POLICY_WORKER: policyFetcher(true),
      SOURCEPLANE_DB: {} as Hyperdrive,
      ENVIRONMENT: "test",
      DEBUG_DELIVERY: "false",
      NOTIFICATIONS_WORKER: {} as Fetcher,
    };

    await handleCreateInvitation(
      makeRequest({ email: "user@test.com", role: "builder" }),
      env as any,
      "req_test",
      actor,
      orgPublicIdStr,
      {
        repo: baseRepo(),
        generateToken: async () => fakeToken,
        now: () => fixedNow,
        enqueueNotification: recorder.fn,
      },
    );

    expect(recorder.calls).toHaveLength(1);
    const td = recorder.calls[0]!.request.templateData as Record<string, unknown>;
    expect(Object.keys(td).sort()).toEqual(
      ["expiresAt", "invitationId", "invitedBy", "orgId", "role"].sort(),
    );
    expect(td.role).toBe("builder");
    expect(typeof td.invitationId).toBe("string");
    expect((td.invitationId as string).startsWith("inv_")).toBe(true);
    expect(td.invitedBy).toBe("usr_admin");
    expect(td.orgId).toBe(orgPublicIdStr);
    // No `token`, no `tokenHash`, no raw secrets.
    expect(td).not.toHaveProperty("token");
    expect(td).not.toHaveProperty("tokenHash");
    expect(td).not.toHaveProperty("rawToken");
  });

  // ── Task 0090 — idempotency-key population ────────────────────────────
  describe("idempotencyKey (Task 0090)", () => {
    function makeEnv() {
      return {
        POLICY_WORKER: policyFetcher(true),
        SOURCEPLANE_DB: {} as Hyperdrive,
        ENVIRONMENT: "test",
        DEBUG_DELIVERY: "false",
        NOTIFICATIONS_WORKER: {} as Fetcher,
      };
    }

    async function callOnce(genId: () => string, recorder: ReturnType<typeof makeRecorder>) {
      return handleCreateInvitation(
        makeRequest({ email: "user@test.com", role: "builder" }),
        makeEnv() as any,
        "req_test",
        actor,
        orgPublicIdStr,
        {
          repo: baseRepo(),
          generateToken: async () => fakeToken,
          now: () => fixedNow,
          enqueueNotification: recorder.fn,
          generateId: genId,
        },
      );
    }

    it("populates a deterministic, template-scoped idempotencyKey", async () => {
      const recorder = makeRecorder();
      // Pin crypto.randomUUID so `inv.id` is stable across the two calls
      // below — the dedup invariant is `(orgId, idempotencyKey)`, and
      // since the handler synthesizes `invitationId = crypto.randomUUID()`
      // before invoking the repo, replays of the same logical action MUST
      // converge on the same id (a real Workers-runtime retry replays the
      // upstream id verbatim).
      const STABLE_INV_UUID = "12345678-1234-1234-1234-123456789012";
      const origRandomUUID = crypto.randomUUID;
      (crypto as any).randomUUID = () => STABLE_INV_UUID;
      try {
        await callOnce(() => "evt_1", recorder);
        await callOnce(() => "evt_2", recorder);
      } finally {
        (crypto as any).randomUUID = origRandomUUID;
      }

      expect(recorder.calls).toHaveLength(2);
      const k1 = recorder.calls[0]!.request.idempotencyKey;
      const k2 = recorder.calls[1]!.request.idempotencyKey;
      expect(typeof k1).toBe("string");
      expect(k1).toBe(k2);
      // Template-scoped + carries the public-id form of the invitation row.
      expect(k1.startsWith("invitation.created:inv_")).toBe(true);
    });

    it("idempotencyKey contains no raw token, hash, or secret material", async () => {
      const recorder = makeRecorder();
      await callOnce(() => "evt_x", recorder);
      const key = recorder.calls[0]!.request.idempotencyKey as string;
      expect(key).not.toContain(RAW_TOKEN);
      expect(key).not.toContain(fakeToken.hash);
      expect(key).not.toMatch(/[A-F0-9]{40,}/);
    });
  });
});
