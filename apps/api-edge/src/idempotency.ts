// Edge-side validation gate for the `Idempotency-Key` request header.
//
// Wraps the shared `parseIdempotencyKey` parser from `@saas/contracts/idempotency`
// and returns a typed `errorResponse` (using existing `errors.ts` codes) on a
// present-but-malformed header. The header itself stays optional: requests that
// omit it pass through unchanged. Reads (GET/HEAD) ignore the header — they have
// no idempotency semantics, so a malformed key on a read MUST NOT be rejected
// here.
//
// Task 0094 plants the validation seam only. Durable replay (KV/DO/DB) lands in
// Task 0095 and will import the same parser from `@saas/contracts/idempotency`.

import {
  IDEMPOTENCY_KEY_HEADER,
  describeIdempotencyKeyParseError,
  parseIdempotencyKey,
} from "@saas/contracts/idempotency";

import { errorResponse } from "./http";

const UNSAFE_METHODS: ReadonlySet<string> = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Returns `null` when the request can proceed (header absent, valid, or method is
 * safe), and a 400 `Response` when the header is present-but-malformed on an
 * unsafe method.
 *
 * Callers should invoke this at the top of the request handler — after method
 * gating but before any cross-binding fetch — and short-circuit on a non-null
 * return value.
 */
export function validateIdempotencyKey(
  request: Request,
  requestId: string,
): Response | null {
  if (!UNSAFE_METHODS.has(request.method)) {
    return null;
  }

  const raw = request.headers.get("idempotency-key");
  const result = parseIdempotencyKey(raw);
  if (result.ok) {
    return null;
  }

  return errorResponse(
    "validation_failed",
    describeIdempotencyKeyParseError(result.reason),
    400,
    requestId,
    { header: IDEMPOTENCY_KEY_HEADER, reason: result.reason },
  );
}
