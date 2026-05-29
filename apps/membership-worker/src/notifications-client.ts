import type {
  EnqueueNotificationRequest,
  EnqueueNotificationResponse,
} from "@saas/contracts/notifications";

/**
 * Best-effort internal client for `notifications-worker`.
 *
 * Mirrors `apps/identity-worker/src/notifications-client.ts` — same shape,
 * same never-throws contract, same internal route. Duplicated in-place
 * (rather than extracted to a shared package) per Task 0088 scope: the
 * shared `@saas/notifications-client` package extraction is deferred until
 * a third caller appears.
 *
 * Posts the V1 enqueue contract to the internal route
 * `POST https://notifications.internal/v1/notifications` over the
 * `NOTIFICATIONS_WORKER` service binding.
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
 * invitation lifecycle. In particular, the raw invitation token MUST NOT
 * appear in `templateData`; only the token hash is persisted, and only the
 * existing `DEBUG_DELIVERY === "true"` response-body path is allowed to
 * carry the raw token.
 */

export interface NotificationsEnvBinding {
  NOTIFICATIONS_WORKER?: Fetcher;
}

export interface NotificationsClientContext {
  /** Caller identifier — for membership-worker this is `"membership-worker"`. */
  internalActor: string;
  /** Actor subject type as known to the caller (e.g. `"user"`, `"system"`). */
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
