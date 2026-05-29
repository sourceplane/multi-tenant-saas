import type {
  EnqueueNotificationRequest,
  EnqueueNotificationResponse,
} from "@saas/contracts/notifications";

/**
 * Best-effort internal client for `notifications-worker`.
 *
 * Posts the V1 enqueue contract to the internal route
 * `POST https://notifications.internal/v1/notifications` over the
 * `NOTIFICATIONS_WORKER` service binding, mirroring the established
 * internal-binding pattern (see `apps/notifications-worker/src/events-client.ts`).
 *
 * Best-effort semantics:
 *
 *   - missing binding (`env.NOTIFICATIONS_WORKER` undefined) → no-op
 *   - non-2xx response → returns `{ ok: false, reason: "non_2xx" }`
 *   - network throw / malformed JSON → returns `{ ok: false, reason }`
 *
 * The function NEVER throws. Call sites treat the result as advisory and
 * MUST NOT propagate notifications failures to the user-facing response —
 * the notifications surface is downstream of, and decoupled from, the
 * caller's primary lifecycle (auth, invitations, etc.).
 *
 * No secret material (raw codes, raw invitation tokens, provider responses)
 * MUST be placed in `templateData`. Allowed values are a bounded
 * redaction-safe subset (presentation hints + the message payload itself
 * where the payload IS the message — e.g. magic-link login codes — but
 * never the authoritative secret of the originating state — token hashes
 * are persisted server-side, never the raw token).
 */

export interface NotificationsEnvBinding {
  NOTIFICATIONS_WORKER?: Fetcher;
}

export interface NotificationsClientContext {
  /**
   * Caller identifier — e.g. `"identity-worker"`, `"membership-worker"`.
   * Forwarded as `x-internal-actor` for tracing / audit.
   */
  internalActor: string;
  /** Actor subject type as known to the caller (e.g. `"system"`, `"user"`). */
  actorSubjectType: string;
  /** Actor subject id as known to the caller. */
  actorSubjectId: string;
  /** Request id to propagate for tracing. */
  requestId: string;
}

export type EnqueueNotificationResult =
  | { ok: true; notificationId: string }
  | { ok: false; reason: "no_binding" | "non_2xx" | "network_error" | "bad_response" };

const ENQUEUE_URL = "https://notifications.internal/v1/notifications";

export async function enqueueNotification(
  env: NotificationsEnvBinding,
  ctx: NotificationsClientContext,
  request: EnqueueNotificationRequest,
): Promise<EnqueueNotificationResult> {
  if (!env.NOTIFICATIONS_WORKER) {
    return { ok: false, reason: "no_binding" };
  }

  let response: Response;
  try {
    response = await env.NOTIFICATIONS_WORKER.fetch(ENQUEUE_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-request-id": ctx.requestId,
        "x-internal-actor": ctx.internalActor,
        "x-actor-subject-type": ctx.actorSubjectType,
        "x-actor-subject-id": ctx.actorSubjectId,
      },
      body: JSON.stringify(request),
    });
  } catch {
    return { ok: false, reason: "network_error" };
  }

  if (!response.ok) {
    return { ok: false, reason: "non_2xx" };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return { ok: false, reason: "bad_response" };
  }

  if (!parsed || typeof parsed !== "object" || !("data" in parsed)) {
    return { ok: false, reason: "bad_response" };
  }

  const data = (parsed as { data: unknown }).data;
  if (
    !data ||
    typeof data !== "object" ||
    !("notification" in data)
  ) {
    return { ok: false, reason: "bad_response" };
  }

  const notification = (data as { notification: unknown }).notification;
  if (
    !notification ||
    typeof notification !== "object" ||
    typeof (notification as { id?: unknown }).id !== "string"
  ) {
    return { ok: false, reason: "bad_response" };
  }

  const resp = data as EnqueueNotificationResponse;
  return { ok: true, notificationId: resp.notification.id };
}
