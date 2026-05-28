/**
 * Tests for webhook delivery runtime — signing, dispatch, retry.
 */

import { dispatchNewEvents, retryFailedDeliveries } from "@webhooks-worker/delivery";
import { createEncryptionAdapter, type CiphertextEnvelope } from "@webhooks-worker/encryption";
import type {
  WebhookRepository,
  WebhookResult,
  WebhookDeliveryAttempt,
  EndpointForDelivery,
  MatchedSubscription,
  DispatchCursor,
  CreateDeliveryAttemptInput,
  UpdateDeliveryAttemptInput,
  PagedResult,
  WebhookEndpoint,
  WebhookSubscription,
} from "@saas/db/webhooks";
import type { EventsRepository, StoredEvent, EventsResult } from "@saas/db/events";

// ── Test constants ──────────────────────────────────────────

const TEST_ORG_UUID = "11111111-1111-1111-1111-111111111111";
const TEST_ENDPOINT_UUID = "44444444-4444-4444-4444-444444444444";
const TEST_SUBSCRIPTION_UUID = "55555555-5555-5555-5555-555555555555";
const TEST_EVENT_ID = "evt_test_001";
const TEST_SIGNING_SECRET = "whsec_test_signing_secret_1234567890";
const TEST_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

function makeStoredEvent(overrides?: Partial<StoredEvent>): StoredEvent {
  return {
    id: TEST_EVENT_ID,
    type: "project.created",
    version: 1,
    source: "projects-worker",
    occurredAt: new Date("2026-05-29T10:00:00Z"),
    actorType: "user",
    actorId: "usr_abc",
    actorSessionId: null,
    actorIp: null,
    orgId: TEST_ORG_UUID,
    projectId: null,
    environmentId: null,
    subjectKind: "project",
    subjectId: "prj_xyz",
    subjectName: "My Project",
    requestId: "req_test",
    correlationId: null,
    causationId: null,
    idempotencyKey: null,
    payload: { name: "My Project" },
    redactPaths: [],
    createdAt: new Date("2026-05-29T10:00:00Z"),
    ...overrides,
  };
}

// ── Mock repos ──────────────────────────────────────────────

interface MockWebhookRepo extends WebhookRepository {
  _createdAttempts: CreateDeliveryAttemptInput[];
  _updatedAttempts: Array<{ orgId: string; attemptId: string; input: UpdateDeliveryAttemptInput }>;
  _advancedCursors: Array<{ orgId: string; lastEventId: string; lastOccurredAt: string }>;
}

function createMockWebhookRepo(overrides?: {
  activeOrgIds?: string[];
  matchingSubs?: MatchedSubscription[];
  endpoint?: EndpointForDelivery | null;
  cursor?: DispatchCursor;
  retryable?: WebhookDeliveryAttempt[];
}): MockWebhookRepo {
  const created: CreateDeliveryAttemptInput[] = [];
  const updated: Array<{ orgId: string; attemptId: string; input: UpdateDeliveryAttemptInput }> = [];
  const advanced: Array<{ orgId: string; lastEventId: string; lastOccurredAt: string }> = [];
  let attemptCounter = 0;

  return {
    _createdAttempts: created,
    _updatedAttempts: updated,
    _advancedCursors: advanced,

    // Delivery runtime methods
    async listActiveOrgIds() {
      return { ok: true, value: overrides?.activeOrgIds ?? [TEST_ORG_UUID] };
    },
    async getDispatchCursor(orgId: string) {
      return {
        ok: true,
        value: overrides?.cursor ?? {
          orgId,
          subscriberLane: "webhooks",
          lastEventId: null,
          lastOccurredAt: null,
          updatedAt: new Date(0),
        },
      };
    },
    async advanceDispatchCursor(orgId: string, lastEventId: string, lastOccurredAt: string) {
      advanced.push({ orgId, lastEventId, lastOccurredAt });
      return {
        ok: true,
        value: { orgId, subscriberLane: "webhooks", lastEventId, lastOccurredAt, updatedAt: new Date() },
      };
    },
    async findMatchingSubscriptions() {
      return {
        ok: true,
        value: overrides?.matchingSubs ?? [{
          id: TEST_SUBSCRIPTION_UUID,
          orgId: TEST_ORG_UUID,
          endpointId: TEST_ENDPOINT_UUID,
          projectId: null,
          eventType: "project.created",
        }],
      };
    },
    async getEndpointForDelivery() {
      const ep = overrides?.endpoint;
      if (ep === null) return { ok: false as const, error: { kind: "not_found" as const } };
      return {
        ok: true,
        value: ep ?? {
          id: TEST_ENDPOINT_UUID,
          orgId: TEST_ORG_UUID,
          url: "https://example.com/webhook",
          status: "active" as const,
          secretCiphertext: null,
          secretVersion: 1,
        },
      };
    },
    async createDeliveryAttempt(input: CreateDeliveryAttemptInput) {
      created.push(input);
      attemptCounter++;
      const attempt: WebhookDeliveryAttempt = {
        id: input.id,
        orgId: input.orgId,
        endpointId: input.endpointId,
        subscriptionId: input.subscriptionId,
        eventId: input.eventId,
        eventType: input.eventType,
        status: "pending",
        attemptNumber: 1,
        httpStatusCode: null,
        failureReason: null,
        idempotencyKey: input.idempotencyKey ?? null,
        nextRetryAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return { ok: true, value: attempt };
    },
    async updateDeliveryAttempt(orgId: string, attemptId: string, input: UpdateDeliveryAttemptInput) {
      updated.push({ orgId, attemptId, input });
      return {
        ok: true,
        value: {
          id: attemptId,
          orgId,
          endpointId: TEST_ENDPOINT_UUID,
          subscriptionId: TEST_SUBSCRIPTION_UUID,
          eventId: TEST_EVENT_ID,
          eventType: "project.created",
          status: input.status,
          attemptNumber: input.attemptNumber ?? 1,
          httpStatusCode: input.httpStatusCode ?? null,
          failureReason: input.failureReason ?? null,
          idempotencyKey: null,
          nextRetryAt: input.nextRetryAt ?? null,
          completedAt: input.completedAt ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };
    },
    async listRetryableDeliveries() {
      return { ok: true, value: overrides?.retryable ?? [] };
    },

    // Stubs for non-delivery methods (not exercised in delivery tests)
    async createEndpoint() { throw new Error("not called"); },
    async getEndpoint() { throw new Error("not called"); },
    async listEndpoints() { throw new Error("not called"); },
    async updateEndpoint() { throw new Error("not called"); },
    async disableEndpoint() { throw new Error("not called"); },
    async deleteEndpoint() { throw new Error("not called"); },
    async rotateEndpointSecret() { throw new Error("not called"); },
    async createSubscription() { throw new Error("not called"); },
    async getSubscription() { throw new Error("not called"); },
    async listSubscriptions() { throw new Error("not called"); },
    async updateSubscription() { throw new Error("not called"); },
    async deleteSubscription() { throw new Error("not called"); },
    async getDeliveryAttempt() { throw new Error("not called"); },
    async listDeliveryAttempts() { throw new Error("not called"); },
  } as unknown as MockWebhookRepo;
}

function createMockEventsRepo(events: StoredEvent[] = []): EventsRepository {
  return {
    async queryEventsByOrg() {
      return { ok: true, value: events } as EventsResult<StoredEvent[]>;
    },
    async appendEvent() { throw new Error("not called"); },
    async appendEventWithAudit() { throw new Error("not called"); },
    async queryAuditByOrg() { throw new Error("not called"); },
    async queryAuditByTarget() { throw new Error("not called"); },
  } as unknown as EventsRepository;
}

// ── Encryption tests ────────────────────────────────────────

describe("encryption adapter — encrypt/decrypt round-trip", () => {
  it("encrypts and decrypts to original plaintext", async () => {
    const adapter = await createEncryptionAdapter(TEST_ENCRYPTION_KEY);
    expect(adapter).not.toBeNull();

    const plaintext = TEST_SIGNING_SECRET;
    const envelope = await adapter!.encrypt(plaintext);

    expect(envelope.alg).toBe("AES-256-GCM");
    expect(envelope.v).toBe(1);
    expect(envelope.iv).toBeTruthy();
    expect(envelope.ct).toBeTruthy();

    const decrypted = await adapter!.decrypt(envelope);
    expect(decrypted).toBe(plaintext);
  });

  it("different encryptions produce different ciphertexts (random IV)", async () => {
    const adapter = await createEncryptionAdapter(TEST_ENCRYPTION_KEY);
    const e1 = await adapter!.encrypt("same");
    const e2 = await adapter!.encrypt("same");
    expect(e1.ct).not.toBe(e2.ct);
    expect(e1.iv).not.toBe(e2.iv);
  });

  it("returns null for invalid key", async () => {
    const adapter = await createEncryptionAdapter("tooshort");
    expect(adapter).toBeNull();
  });

  it("returns null for undefined key", async () => {
    const adapter = await createEncryptionAdapter(undefined);
    expect(adapter).toBeNull();
  });
});

// ── dispatchNewEvents tests ─────────────────────────────────

describe("dispatchNewEvents", () => {
  // Use a mock fetcher to intercept outgoing HTTP calls
  let fetchCalls: Array<{ url: string; init: RequestInit }>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    fetchCalls = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      fetchCalls.push({ url, init: init ?? {} });
      return new Response("OK", { status: 200 });
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("dispatches event to matching subscription and advances cursor", async () => {
    const event = makeStoredEvent();
    const webhookRepo = createMockWebhookRepo();
    const eventsRepo = createMockEventsRepo([event]);

    const result = await dispatchNewEvents({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    expect(result.dispatched).toBe(1);
    expect(result.errors).toBe(0);

    // Verify delivery attempt was created
    expect(webhookRepo._createdAttempts).toHaveLength(1);
    expect(webhookRepo._createdAttempts[0]!.eventId).toBe(TEST_EVENT_ID);
    expect(webhookRepo._createdAttempts[0]!.subscriptionId).toBe(TEST_SUBSCRIPTION_UUID);

    // Verify HTTP was called
    expect(fetchCalls).toHaveLength(1);
    expect(fetchCalls[0]!.url).toBe("https://example.com/webhook");

    // Verify cursor was advanced
    expect(webhookRepo._advancedCursors).toHaveLength(1);
    expect(webhookRepo._advancedCursors[0]!.lastEventId).toBe(TEST_EVENT_ID);
  });

  it("skips when no active orgs", async () => {
    const webhookRepo = createMockWebhookRepo({ activeOrgIds: [] });
    const eventsRepo = createMockEventsRepo();

    const result = await dispatchNewEvents({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    expect(result.dispatched).toBe(0);
    expect(result.errors).toBe(0);
    expect(fetchCalls).toHaveLength(0);
  });

  it("skips when no new events", async () => {
    const webhookRepo = createMockWebhookRepo();
    const eventsRepo = createMockEventsRepo([]);

    const result = await dispatchNewEvents({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    expect(result.dispatched).toBe(0);
    expect(webhookRepo._advancedCursors).toHaveLength(0);
  });

  it("skips when no matching subscriptions", async () => {
    const event = makeStoredEvent();
    const webhookRepo = createMockWebhookRepo({ matchingSubs: [] });
    const eventsRepo = createMockEventsRepo([event]);

    const result = await dispatchNewEvents({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    expect(result.dispatched).toBe(0);
    expect(webhookRepo._createdAttempts).toHaveLength(0);
    // Cursor should still advance past the event
    expect(webhookRepo._advancedCursors).toHaveLength(1);
  });

  it("includes HMAC signature when endpoint has encrypted secret", async () => {
    const encryption = await createEncryptionAdapter(TEST_ENCRYPTION_KEY);
    const envelope = await encryption!.encrypt(TEST_SIGNING_SECRET);
    const secretCiphertext = JSON.stringify(envelope);

    const endpoint: EndpointForDelivery = {
      id: TEST_ENDPOINT_UUID,
      orgId: TEST_ORG_UUID,
      url: "https://example.com/webhook",
      status: "active",
      secretCiphertext,
      secretVersion: 1,
    };

    const event = makeStoredEvent();
    const webhookRepo = createMockWebhookRepo({ endpoint });
    const eventsRepo = createMockEventsRepo([event]);

    await dispatchNewEvents({
      webhookRepo,
      eventsRepo,
      encryption,
    });

    expect(fetchCalls).toHaveLength(1);
    const headers = fetchCalls[0]!.init.headers as Record<string, string>;
    expect(headers["X-Webhook-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
    expect(headers["X-Webhook-Timestamp"]).toBeTruthy();
  });

  it("handles non-2xx response with retry scheduling", async () => {
    globalThis.fetch = async () => new Response("Internal Server Error", { status: 500 });

    const event = makeStoredEvent();
    const webhookRepo = createMockWebhookRepo();
    const eventsRepo = createMockEventsRepo([event]);

    const result = await dispatchNewEvents({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    expect(result.dispatched).toBe(1); // still counted as dispatched (attempted)
    expect(webhookRepo._updatedAttempts).toHaveLength(1);
    const update = webhookRepo._updatedAttempts[0]!;
    expect(update.input.status).toBe("retrying");
    expect(update.input.httpStatusCode).toBe(500);
    expect(update.input.nextRetryAt).toBeTruthy();
  });

  it("marks as failed when endpoint is disabled", async () => {
    const endpoint: EndpointForDelivery = {
      id: TEST_ENDPOINT_UUID,
      orgId: TEST_ORG_UUID,
      url: "https://example.com/webhook",
      status: "disabled",
      secretCiphertext: null,
      secretVersion: 1,
    };

    const event = makeStoredEvent();
    const webhookRepo = createMockWebhookRepo({ endpoint });
    const eventsRepo = createMockEventsRepo([event]);

    await dispatchNewEvents({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    expect(webhookRepo._updatedAttempts).toHaveLength(1);
    expect(webhookRepo._updatedAttempts[0]!.input.status).toBe("failed");
    expect(webhookRepo._updatedAttempts[0]!.input.failureReason).toBe("endpoint_disabled");
    expect(fetchCalls).toHaveLength(0); // no HTTP call for disabled endpoint
  });
});

// ── retryFailedDeliveries tests ─────────────────────────────

describe("retryFailedDeliveries", () => {
  let fetchCalls: Array<{ url: string; init: RequestInit }>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    fetchCalls = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : (input as Request).url;
      fetchCalls.push({ url, init: init ?? {} });
      return new Response("OK", { status: 200 });
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("retries delivery attempts that are due", async () => {
    const retryable: WebhookDeliveryAttempt = {
      id: "retry-attempt-1",
      orgId: TEST_ORG_UUID,
      endpointId: TEST_ENDPOINT_UUID,
      subscriptionId: TEST_SUBSCRIPTION_UUID,
      eventId: TEST_EVENT_ID,
      eventType: "project.created",
      status: "retrying",
      attemptNumber: 2,
      httpStatusCode: 500,
      failureReason: "HTTP 500",
      idempotencyKey: null,
      nextRetryAt: new Date(Date.now() - 1000),
      completedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const webhookRepo = createMockWebhookRepo({ retryable: [retryable] });
    const eventsRepo = createMockEventsRepo();

    const result = await retryFailedDeliveries({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    expect(result.retried).toBe(1);
    expect(result.errors).toBe(0);
    expect(fetchCalls).toHaveLength(1);
    expect(webhookRepo._updatedAttempts).toHaveLength(1);
    expect(webhookRepo._updatedAttempts[0]!.input.status).toBe("success");
  });

  it("returns zero when no retryable deliveries", async () => {
    const webhookRepo = createMockWebhookRepo({ retryable: [] });
    const eventsRepo = createMockEventsRepo();

    const result = await retryFailedDeliveries({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    expect(result.retried).toBe(0);
    expect(result.errors).toBe(0);
  });
});

// ── Webhook payload structure tests ─────────────────────────

describe("delivery payload structure", () => {
  let lastBody: string;
  let lastHeaders: Record<string, string>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    lastBody = "";
    lastHeaders = {};
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (_input: RequestInfo | URL, init?: RequestInit) => {
      lastBody = init?.body as string ?? "";
      lastHeaders = (init?.headers ?? {}) as Record<string, string>;
      return new Response("OK", { status: 200 });
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends correct JSON payload with event data", async () => {
    const event = makeStoredEvent({ payload: { foo: "bar" } });
    const webhookRepo = createMockWebhookRepo();
    const eventsRepo = createMockEventsRepo([event]);

    await dispatchNewEvents({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    const parsed = JSON.parse(lastBody);
    expect(parsed.id).toBe(TEST_EVENT_ID);
    expect(parsed.type).toBe("project.created");
    expect(parsed.data).toEqual({ foo: "bar" });
    expect(parsed.occurred_at).toBeTruthy();
  });

  it("includes required headers", async () => {
    const event = makeStoredEvent();
    const webhookRepo = createMockWebhookRepo();
    const eventsRepo = createMockEventsRepo([event]);

    await dispatchNewEvents({
      webhookRepo,
      eventsRepo,
      encryption: null,
    });

    expect(lastHeaders["Content-Type"]).toBe("application/json");
    expect(lastHeaders["User-Agent"]).toBe("Sourceplane-Webhooks/1.0");
    expect(lastHeaders["X-Webhook-ID"]).toBeTruthy();
    expect(lastHeaders["X-Webhook-Timestamp"]).toBeTruthy();
  });
});
