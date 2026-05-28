/**
 * Webhook delivery dispatcher — event fanout, subscription matching,
 * HMAC-SHA256 signing, HTTP delivery with exponential backoff retry.
 *
 * Entry points:
 *   - dispatchNewEvents(): poll event_log per org, fan out to matching subscriptions
 *   - retryFailedDeliveries(): pick up retryable attempts and redeliver
 */

import type { CiphertextEnvelope, EncryptionAdapter } from "./encryption.js";
import type { WebhookRepository, WebhookDeliveryAttempt, EndpointForDelivery } from "@saas/db/webhooks";
import type { EventsRepository, StoredEvent } from "@saas/db/events";

// ── Constants ────────────────────────────────────────────────

const MAX_EVENTS_PER_ORG = 50;
const MAX_RETRIES = 5;
const RETRY_BASE_SECONDS = 30;
const DELIVERY_TIMEOUT_MS = 10_000;
const MAX_RETRY_BATCH = 100;

// ── Signing ──────────────────────────────────────────────────

/**
 * Compute HMAC-SHA256 signature for a webhook payload.
 * Returns hex-encoded signature with `sha256=` prefix (GitHub-style).
 */
async function computeSignature(secret: string, timestamp: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const message = encoder.encode(`${timestamp}.${body}`);
  const sig = await crypto.subtle.sign("HMAC", key, message);
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256=${hex}`;
}

// ── Retry schedule ───────────────────────────────────────────

function nextRetryAt(attemptNumber: number): Date | null {
  if (attemptNumber >= MAX_RETRIES) return null;
  // Exponential backoff: 30s, 120s, 480s, 1920s, ...
  const delaySeconds = RETRY_BASE_SECONDS * Math.pow(4, attemptNumber - 1);
  return new Date(Date.now() + delaySeconds * 1000);
}

// ── Delivery ─────────────────────────────────────────────────

interface DeliveryContext {
  webhookRepo: WebhookRepository;
  eventsRepo: EventsRepository;
  encryption: EncryptionAdapter | null;
}

async function deliverAttempt(
  ctx: DeliveryContext,
  attempt: WebhookDeliveryAttempt,
  event: StoredEvent | null,
  endpoint: EndpointForDelivery | null,
): Promise<void> {
  // Resolve endpoint if not pre-fetched
  if (!endpoint) {
    const epResult = await ctx.webhookRepo.getEndpointForDelivery(attempt.orgId, attempt.endpointId);
    if (!epResult.ok) {
      await ctx.webhookRepo.updateDeliveryAttempt(attempt.orgId, attempt.id, {
        status: "failed",
        failureReason: "endpoint_not_found",
        completedAt: new Date(),
      });
      return;
    }
    endpoint = epResult.value;
  }

  if (endpoint.status !== "active") {
    await ctx.webhookRepo.updateDeliveryAttempt(attempt.orgId, attempt.id, {
      status: "failed",
      failureReason: "endpoint_disabled",
      completedAt: new Date(),
    });
    return;
  }

  // Build payload
  const timestamp = new Date().toISOString();
  const payload = JSON.stringify({
    id: attempt.eventId,
    type: attempt.eventType,
    occurred_at: event?.occurredAt.toISOString() ?? timestamp,
    data: event?.payload ?? {},
  });

  // Sign if secret available
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "Sourceplane-Webhooks/1.0",
    "X-Webhook-ID": attempt.id,
    "X-Webhook-Timestamp": timestamp,
  };

  if (endpoint.secretCiphertext && ctx.encryption) {
    try {
      const envelope = JSON.parse(endpoint.secretCiphertext) as CiphertextEnvelope;
      const secret = await ctx.encryption.decrypt(envelope);
      const signature = await computeSignature(secret, timestamp, payload);
      headers["X-Webhook-Signature"] = signature;
    } catch {
      // If decryption fails, still deliver unsigned but log it
      headers["X-Webhook-Signature-Error"] = "decryption_failed";
    }
  }

  // Deliver
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const response = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body: payload,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status >= 200 && response.status < 300) {
      await ctx.webhookRepo.updateDeliveryAttempt(attempt.orgId, attempt.id, {
        status: "success",
        httpStatusCode: response.status,
        attemptNumber: attempt.attemptNumber,
        completedAt: new Date(),
        nextRetryAt: null,
      });
    } else {
      // Non-2xx — schedule retry or fail permanently
      const retry = nextRetryAt(attempt.attemptNumber);
      await ctx.webhookRepo.updateDeliveryAttempt(attempt.orgId, attempt.id, {
        status: retry ? "retrying" : "failed",
        httpStatusCode: response.status,
        failureReason: `HTTP ${response.status}`,
        attemptNumber: attempt.attemptNumber + 1,
        nextRetryAt: retry,
        completedAt: retry ? null : new Date(),
      });
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown_error";
    const isTimeout = reason.includes("abort");
    const retry = nextRetryAt(attempt.attemptNumber);
    await ctx.webhookRepo.updateDeliveryAttempt(attempt.orgId, attempt.id, {
      status: retry ? "retrying" : "failed",
      failureReason: isTimeout ? "timeout" : reason,
      attemptNumber: attempt.attemptNumber + 1,
      nextRetryAt: retry,
      completedAt: retry ? null : new Date(),
    });
  }
}

// ── Fanout ────────────────────────────────────────────────────

export async function dispatchNewEvents(ctx: DeliveryContext): Promise<{ dispatched: number; errors: number }> {
  let dispatched = 0;
  let errors = 0;

  // 1. Find orgs with active subscriptions
  const orgsResult = await ctx.webhookRepo.listActiveOrgIds();
  if (!orgsResult.ok) return { dispatched: 0, errors: 1 };

  for (const orgId of orgsResult.value) {
    // 2. Get dispatch cursor for this org
    const cursorResult = await ctx.webhookRepo.getDispatchCursor(orgId);
    if (!cursorResult.ok) { errors++; continue; }
    const cursor = cursorResult.value;

    // 3. Query new events since cursor
    const eventsResult = await ctx.eventsRepo.queryEventsByOrg(
      orgId,
      cursor.lastOccurredAt,
      cursor.lastEventId,
      MAX_EVENTS_PER_ORG,
    );
    if (!eventsResult.ok) { errors++; continue; }
    if (eventsResult.value.length === 0) continue;

    let lastEvent: StoredEvent | null = null;

    for (const event of eventsResult.value) {
      // 4. Find matching subscriptions
      const subsResult = await ctx.webhookRepo.findMatchingSubscriptions(orgId, event.type);
      if (!subsResult.ok) { errors++; continue; }

      for (const sub of subsResult.value) {
        // 5. Create delivery attempt
        const attemptId = crypto.randomUUID();
        const idempotencyKey = `${sub.id}:${event.id}:1`;
        const createResult = await ctx.webhookRepo.createDeliveryAttempt({
          id: attemptId,
          orgId,
          endpointId: sub.endpointId,
          subscriptionId: sub.id,
          eventId: event.id,
          eventType: event.type,
          idempotencyKey,
        });

        if (!createResult.ok) {
          // Likely idempotency conflict — skip
          continue;
        }

        // 6. Resolve endpoint and deliver
        const epResult = await ctx.webhookRepo.getEndpointForDelivery(orgId, sub.endpointId);
        if (!epResult.ok) { errors++; continue; }

        await deliverAttempt(ctx, createResult.value, event, epResult.value);
        dispatched++;
      }

      lastEvent = event;
    }

    // 7. Advance cursor
    if (lastEvent) {
      await ctx.webhookRepo.advanceDispatchCursor(
        orgId,
        lastEvent.id,
        lastEvent.occurredAt.toISOString(),
      );
    }
  }

  return { dispatched, errors };
}

// ── Retry ────────────────────────────────────────────────────

export async function retryFailedDeliveries(ctx: DeliveryContext): Promise<{ retried: number; errors: number }> {
  let retried = 0;
  let errors = 0;

  const result = await ctx.webhookRepo.listRetryableDeliveries(MAX_RETRY_BATCH);
  if (!result.ok) return { retried: 0, errors: 1 };

  for (const attempt of result.value) {
    try {
      await deliverAttempt(ctx, attempt, null, null);
      retried++;
    } catch {
      errors++;
    }
  }

  return { retried, errors };
}
