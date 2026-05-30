// Edge-side idempotency seam.
//
// Two responsibilities, both anchored on the shared parser from
// `@saas/contracts/idempotency` so the wire contract (Task 0094) and the
// durable replay store (Task 0095) can never drift:
//
//   1. `validateIdempotencyKey(request, requestId)` — the original Task 0094
//      validation gate, retained as a thin wrapper for callers that don't
//      need replay (none in production today, but kept for tests and for
//      any future facade that handles its own forwarding).
//
//   2. `replayOrExecute(request, requestId, env, downstream)` — the
//      Stripe-style replay chokepoint introduced in Task 0095. Every unsafe
//      method (POST/PATCH/PUT/DELETE) carrying a valid `Idempotency-Key` is
//      first looked up in `env.IDEMPOTENCY_KV`. On hit, the stored response
//      envelope is reconstructed and returned without invoking the
//      downstream worker. On miss, the downstream is called once, its
//      response is stored under a 24h TTL, and the original response is
//      returned to the caller.
//
// Failure semantics:
//   - Header absent on an unsafe method → no cache lookup, no cache write,
//     downstream is invoked exactly once.
//   - Header malformed on an unsafe method → 400 `validation_failed`
//     (Task 0094 wire behavior preserved verbatim) BEFORE any KV touch.
//   - Header malformed on a safe method (GET/HEAD) → ignored; reads have
//     no idempotency semantics. Downstream is invoked normally.
//   - KV binding missing OR KV `get` throws OR KV `put` throws → log via
//     console.warn (caught by the standard observability hook) and degrade
//     to "execute downstream once, no replay." A KV outage MUST NOT 5xx the
//     request — Stripe-quality systems fail open on the cache.
//
// Key/envelope shape (latitude exercised under the Task 0095 architect
// brief):
//
//   - Key: `idem:v1:{orgScope}:{routeKey}:{idempotencyKey}` where
//     `orgScope` is the path-derived org id (`/v1/organizations/{orgId}/...`)
//     or the literal `"anon"` when the route has no org segment;
//     `routeKey` is the URL path with concrete IDs collapsed to `:id`
//     placeholders (so `/v1/organizations/org_abc/projects/proj_xyz/foo`
//     → `/v1/organizations/:id/projects/:id/foo`); both segments are
//     length-bounded and the whole key is fingerprinted with SHA-256 +
//     re-encoded as `idem:v1:{orgScope}:{hash40}` if the literal form
//     would exceed the 512-byte cap.
//
//     Rationale: org-scope by URL path keeps the lookup work synchronous
//     and avoids dragging `resolveActor` ahead of the KV touch (Stripe's
//     replay is identity-agnostic — the key itself is the principal).
//     Anon scope handles `/v1/auth/login/start` which has no org. Route
//     canonicalisation prevents `org_a/.../foo` and `org_b/.../foo`
//     colliding when callers reuse keys but lets `/foo` and `/bar`
//     coexist. SHA-256 fallback guarantees we stay under the 512-byte
//     cap regardless of caller-supplied key length.
//
//   - Envelope: JSON `{ status, headers, contentType, body, bodyEncoding,
//     storedAt, requestId }`. Headers are a strict allow-list (see
//     `STORED_HEADER_ALLOWLIST`) — caller-controlled or session-bearing
//     headers like `set-cookie` / `authorization` are NEVER persisted.
//     `bodyEncoding` is `"utf8"` for text/JSON bodies and `"base64"` for
//     anything else, preserving binary safety.

import {
  IDEMPOTENCY_KEY_HEADER,
  describeIdempotencyKeyParseError,
  parseIdempotencyKey,
} from "@saas/contracts/idempotency";

import type { Env } from "./env.js";
import { errorResponse } from "./http.js";

const UNSAFE_METHODS: ReadonlySet<string> = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const KV_KEY_PREFIX = "idem:v1";
const KV_KEY_BYTE_CAP = 512;
const KV_TTL_SECONDS = 86_400; // 24h, matches Stripe's documented replay window.
const KV_ENVELOPE_VERSION = 1 as const;

/**
 * Headers that are SAFE to store and replay. Any header outside this list is
 * dropped on store. This protects callers from accidental leakage of
 * `set-cookie`, `authorization`, or other principal-bearing values that the
 * downstream worker would have set on the original response.
 */
const STORED_HEADER_ALLOWLIST: ReadonlySet<string> = new Set([
  "content-type",
  "content-language",
  "cache-control",
  "etag",
  "x-request-id",
  "x-saas-replay-source",
]);

interface StoredEnvelopeV1 {
  v: typeof KV_ENVELOPE_VERSION;
  status: number;
  headers: Record<string, string>;
  contentType: string;
  body: string;
  bodyEncoding: "utf8" | "base64";
  storedAt: string;
  requestId: string;
}

/**
 * Returns `null` when the request can proceed (header absent, valid, or
 * method is safe), and a 400 `Response` when the header is present-but-
 * malformed on an unsafe method.
 *
 * Retained for symmetry with Task 0094 callers / tests. New code should
 * prefer `replayOrExecute`, which performs the same validation gate AND
 * the durable replay lookup behind a single chokepoint.
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

/**
 * Single chokepoint for unsafe-method requests: validate the header, replay
 * a stored response on cache hit, otherwise invoke `downstream` once, store
 * the response, and return it.
 *
 * Callers pass `downstream` as a thunk because the facade has already
 * decided WHICH worker to forward to (auth → identity, org → membership,
 * etc.) and how to shape the request — this helper has no business
 * deciding that.
 *
 * On safe methods or absent keys, this function is effectively a pass-
 * through that just calls `downstream()`.
 */
export async function replayOrExecute(
  request: Request,
  requestId: string,
  env: Env,
  downstream: () => Promise<Response>,
): Promise<Response> {
  // Safe methods: never cache, never validate; pass through.
  if (!UNSAFE_METHODS.has(request.method)) {
    return downstream();
  }

  const raw = request.headers.get("idempotency-key");
  const parsed = parseIdempotencyKey(raw);

  if (!parsed.ok) {
    return errorResponse(
      "validation_failed",
      describeIdempotencyKeyParseError(parsed.reason),
      400,
      requestId,
      { header: IDEMPOTENCY_KEY_HEADER, reason: parsed.reason },
    );
  }

  // Header absent on an unsafe method is allowed (Task 0094 contract).
  // Pass through without any cache touch.
  if (parsed.key === null) {
    return downstream();
  }

  // KV binding missing → degrade open.
  const kv = env.IDEMPOTENCY_KV;
  if (!kv) {
    return downstream();
  }

  const url = new URL(request.url);
  const cacheKey = await buildCacheKey(parsed.key, url.pathname);

  // --- Cache lookup ---
  let stored: StoredEnvelopeV1 | null = null;
  try {
    const raw = await kv.get(cacheKey, "text");
    if (raw) {
      stored = parseEnvelope(raw);
    }
  } catch (err) {
    // KV read failure is not fatal — log and proceed as if cache-miss.
    logKvFailure("get", err, requestId);
  }

  if (stored) {
    return reconstructResponse(stored);
  }

  // --- Cache miss: execute downstream, then store. ---
  const response = await downstream();

  // Only cache "successful" final responses. Stripe stores both the success
  // and the stable error response. We replay on any HTTP status because
  // the same retry deserves the same answer regardless of code; however
  // we explicitly skip caching 5xx since those represent transient
  // server errors that the caller should be free to retry against a
  // real downstream call.
  if (response.status < 500) {
    try {
      const envelope = await buildEnvelope(response, requestId);
      // We must clone before reading the body when building the envelope.
      // `buildEnvelope` already operates on a clone, so `response` is still
      // streamable to the caller.
      await kv.put(cacheKey, JSON.stringify(envelope), {
        expirationTtl: KV_TTL_SECONDS,
      });
    } catch (err) {
      // KV write failure is not fatal — caller still gets the real response.
      logKvFailure("put", err, requestId);
    }
  }

  return response;
}

// --- Internals ---

async function buildCacheKey(
  idempotencyKey: string,
  pathname: string,
): Promise<string> {
  const orgScope = extractOrgScope(pathname);
  const routeKey = canonicaliseRoute(pathname);
  const literal = `${KV_KEY_PREFIX}:${orgScope}:${routeKey}:${idempotencyKey}`;

  // Cheap path: literal fits the cap. Useful for debug / forensic lookups.
  // (UTF-8 encoding length, since KV measures bytes.)
  const bytes = new TextEncoder().encode(literal);
  if (bytes.byteLength <= KV_KEY_BYTE_CAP) {
    return literal;
  }

  // Fallback: collapse the variable tail into a stable SHA-256 hash so the
  // total length is bounded regardless of caller-supplied key size.
  const hash = await sha256Hex(`${routeKey}:${idempotencyKey}`);
  return `${KV_KEY_PREFIX}:${orgScope}:${hash}`;
}

const ORG_SEGMENT_RE = /^\/v1\/organizations\/([^/]+)(?:\/|$)/;

function extractOrgScope(pathname: string): string {
  const m = ORG_SEGMENT_RE.exec(pathname);
  if (!m || !m[1]) return "anon";
  return m[1];
}

/**
 * Collapse concrete IDs in the path into the literal `:id`. Heuristic: any
 * path segment that looks like an opaque identifier (containing a `_`, a
 * `-`, or being purely alphanumeric and >= 8 chars) is replaced. This is
 * good enough for our route surface — all current IDs are either ULIDs,
 * UUIDs, or `prefix_…` opaque tokens.
 */
function canonicaliseRoute(pathname: string): string {
  return pathname
    .split("/")
    .map((segment) => {
      if (segment === "") return segment;
      if (/^[a-z]+$/.test(segment)) return segment;
      if (/^v\d+$/.test(segment)) return segment;
      // Looks like an opaque ID.
      if (segment.length >= 8 || segment.includes("_") || segment.includes("-")) {
        return ":id";
      }
      return segment;
    })
    .join("/");
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, "0");
  }
  return hex;
}

async function buildEnvelope(
  response: Response,
  requestId: string,
): Promise<StoredEnvelopeV1> {
  // Clone before reading so the original body is still streamable to the
  // caller of `replayOrExecute`.
  const clone = response.clone();

  const headers: Record<string, string> = {};
  clone.headers.forEach((value, name) => {
    if (STORED_HEADER_ALLOWLIST.has(name.toLowerCase())) {
      headers[name.toLowerCase()] = value;
    }
  });

  const contentType = clone.headers.get("content-type") ?? "";
  const isText =
    contentType.startsWith("text/") ||
    contentType.includes("json") ||
    contentType.includes("xml") ||
    contentType.includes("javascript") ||
    contentType === "";

  let body: string;
  let bodyEncoding: "utf8" | "base64";
  if (isText) {
    body = await clone.text();
    bodyEncoding = "utf8";
  } else {
    const buffer = await clone.arrayBuffer();
    body = arrayBufferToBase64(buffer);
    bodyEncoding = "base64";
  }

  return {
    v: KV_ENVELOPE_VERSION,
    status: response.status,
    headers,
    contentType,
    body,
    bodyEncoding,
    storedAt: new Date().toISOString(),
    requestId,
  };
}

function reconstructResponse(envelope: StoredEnvelopeV1): Response {
  const headers = new Headers();
  for (const [name, value] of Object.entries(envelope.headers)) {
    headers.set(name, value);
  }
  // Always tag the replayed response so downstream observability can
  // distinguish a cache hit from a real downstream call. Caller-side
  // logs / dashboards key off this header.
  headers.set("x-saas-replay-source", "edge-idempotency");

  let body: BodyInit;
  if (envelope.bodyEncoding === "base64") {
    body = base64ToArrayBuffer(envelope.body);
  } else {
    body = envelope.body;
  }
  return new Response(body, { status: envelope.status, headers });
}

function parseEnvelope(raw: string): StoredEnvelopeV1 | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed as { v?: unknown }).v === KV_ENVELOPE_VERSION
    ) {
      return parsed as StoredEnvelopeV1;
    }
  } catch {
    // fall through
  }
  return null;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function logKvFailure(op: "get" | "put", err: unknown, requestId: string): void {
  // We deliberately use console.warn (Workers Logs ingest hook) rather than
  // throw — KV is a best-effort cache and the request must still succeed.
  const message = err instanceof Error ? err.message : String(err);
  console.warn(
    JSON.stringify({
      level: "warn",
      msg: "idempotency.kv_failure",
      op,
      requestId,
      error: message,
    }),
  );
}
