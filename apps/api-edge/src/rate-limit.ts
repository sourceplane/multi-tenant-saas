// Edge-side per-org / per-identity rate limiter (Task 0097).
//
// Sits in front of `replayOrExecute` so every facade picks it up uniformly.
// Independent buckets:
//
//   - `org`:      keyed on `orgId` extracted from `/v1/organizations/{orgId}/…`.
//                 Skipped when the URL has no org segment.
//   - `identity`: keyed on a SHA-256 fingerprint of the bearer token when one
//                 is present (same token ⇒ same bucket, regardless of which
//                 actor type `resolveActor` will eventually classify it as);
//                 otherwise falls back to `anon:<routeFamily>:<CF-Connecting-IP>`
//                 so abuse from a single IP cannot bypass the limit.
//
// Algorithm: token bucket with refill per second. State persisted in KV as
// compact JSON `{t, r}` (`t` = tokens float, `r` = refilledAt epoch seconds).
// Last-writer-wins under concurrent retry — acceptable for V1; documented in
// the implementer report.
//
// Backend: reuses `IDEMPOTENCY_KV` with a mandatory `rl:v1:` key prefix to
// avoid keyspace collision with the existing `idem:v1:` replay store. This
// ships the limiter without the chicken-and-egg of provisioning a new KV
// namespace + wiring its ID in the same PR.
//
// Failure-open: if the KV binding is missing, or `get`/`put` throws, the
// request is admitted without rate-limit headers (we have no real counters
// to publish under failure). Logged via `console.warn`.

import type { Env } from "./env.js";

export type RouteFamily =
  | "auth"
  | "org"
  | "project"
  | "config"
  | "webhooks"
  | "metering"
  | "billing"
  | "audit";

interface BucketLimits {
  /** Bucket capacity (max tokens). */
  limit: number;
  /** Window length in seconds; refill rate = limit / windowSec tokens/sec. */
  windowSec: number;
}

interface FamilyConfig {
  identity: BucketLimits;
  org: BucketLimits;
}

/**
 * Per-route-family caps. Picked to absorb legitimate burstiness while still
 * blunting abuse. Tunable; no per-tenant overrides yet (B5 territory).
 *
 *   - `auth`: tighter — login/logout flows are the brute-force target.
 *   - everything else (writes/reads): 60/300 per minute identity/org.
 *   - `audit` is read-only and trusted further; raised to 120/600.
 */
const LIMITS: Record<RouteFamily, FamilyConfig> = {
  auth: {
    identity: { limit: 10, windowSec: 60 },
    org: { limit: 60, windowSec: 60 },
  },
  org: {
    identity: { limit: 60, windowSec: 60 },
    org: { limit: 300, windowSec: 60 },
  },
  project: {
    identity: { limit: 60, windowSec: 60 },
    org: { limit: 300, windowSec: 60 },
  },
  config: {
    identity: { limit: 60, windowSec: 60 },
    org: { limit: 300, windowSec: 60 },
  },
  webhooks: {
    identity: { limit: 60, windowSec: 60 },
    org: { limit: 300, windowSec: 60 },
  },
  metering: {
    identity: { limit: 60, windowSec: 60 },
    org: { limit: 300, windowSec: 60 },
  },
  billing: {
    identity: { limit: 60, windowSec: 60 },
    org: { limit: 300, windowSec: 60 },
  },
  audit: {
    identity: { limit: 120, windowSec: 60 },
    org: { limit: 600, windowSec: 60 },
  },
};

const KV_PREFIX = "rl:v1";
const KV_TTL_SECONDS = 600;
const ORG_PATH_RE = /^\/v1\/organizations\/([^/]+)/;

/** Public result. `headers` is merged into the final response by the caller. */
export type RateLimitResult =
  | { kind: "allowed"; headers: Record<string, string> }
  | { kind: "denied"; response: Response };

interface BucketState {
  t: number;
  r: number;
}

interface BucketDecision {
  scope: "org" | "identity";
  limit: number;
  remaining: number;
  resetEpoch: number;
  retryAfterSec: number;
  allowed: boolean;
}

/**
 * Returns `allowed` (with headers to merge) or `denied` (with a complete
 * 429 response carrying the standard envelope and `Retry-After`).
 *
 * Never throws; KV failures degrade to admit-with-no-headers per the
 * fail-open contract.
 */
export async function enforceRateLimit(
  request: Request,
  requestId: string,
  env: Env,
  routeFamily: RouteFamily,
): Promise<RateLimitResult> {
  const config = LIMITS[routeFamily];
  const kv = env.IDEMPOTENCY_KV;

  // Backend missing → fail open. No counters to publish.
  if (!kv) {
    return { kind: "allowed", headers: {} };
  }

  const url = new URL(request.url);
  const orgId = extractOrgId(url.pathname);
  const identityKey = await deriveIdentityKey(request, routeFamily);

  const buckets: Array<{
    scope: "org" | "identity";
    key: string;
    limits: BucketLimits;
  }> = [];
  if (orgId) {
    buckets.push({
      scope: "org",
      key: `${KV_PREFIX}:org:${routeFamily}:${orgId}`,
      limits: config.org,
    });
  }
  buckets.push({
    scope: "identity",
    key: `${KV_PREFIX}:identity:${routeFamily}:${identityKey}`,
    limits: config.identity,
  });

  const decisions: BucketDecision[] = [];
  let failureOpen = false;
  for (const b of buckets) {
    try {
      const decision = await consumeToken(kv, b.key, b.limits, b.scope);
      decisions.push(decision);
    } catch (err) {
      logKvFailure(err, requestId);
      failureOpen = true;
      // Failure-open synthetic decision: full bucket, no real counter.
      const now = Math.ceil(Date.now() / 1000);
      decisions.push({
        scope: b.scope,
        limit: b.limits.limit,
        remaining: b.limits.limit,
        resetEpoch: now + b.limits.windowSec,
        retryAfterSec: 0,
        allowed: true,
      });
    }
  }

  const headers = buildHeaders(decisions);

  // Under failure-open we do NOT deny even if a partial decision said no —
  // the fail-open contract supersedes the partial counter.
  if (failureOpen) {
    return { kind: "allowed", headers };
  }

  const denied = decisions.find((d) => !d.allowed);
  if (denied) {
    const retry = Math.max(1, denied.retryAfterSec);
    const responseHeaders: Record<string, string> = {
      ...headers,
      "content-type": "application/json",
      "Retry-After": String(retry),
    };
    const body = JSON.stringify({
      error: {
        code: "rate_limited",
        message: `Rate limit exceeded for ${denied.scope} scope. Retry after ${retry} seconds.`,
        details: { scope: denied.scope, retryAfterSeconds: retry },
        requestId,
      },
    });
    return {
      kind: "denied",
      response: new Response(body, { status: 429, headers: responseHeaders }),
    };
  }

  return { kind: "allowed", headers };
}

/**
 * Merge rate-limit headers into an existing response without reading its body.
 * Used by `replayOrExecute` to decorate every allowed response.
 */
export function mergeRateLimitHeaders(
  response: Response,
  headers: Record<string, string>,
): Response {
  if (Object.keys(headers).length === 0) return response;
  const merged = new Headers(response.headers);
  for (const [name, value] of Object.entries(headers)) {
    merged.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
}

// --- Internals ---

async function consumeToken(
  kv: KVNamespace,
  key: string,
  limits: BucketLimits,
  scope: "org" | "identity",
): Promise<BucketDecision> {
  const now = Date.now() / 1000;
  const refillRate = limits.limit / limits.windowSec;

  const raw = await kv.get(key, "text");
  let state: BucketState;
  if (raw) {
    const parsed = parseState(raw);
    state = parsed ?? { t: limits.limit, r: now };
  } else {
    state = { t: limits.limit, r: now };
  }

  // Refill since last touch, capped at limit.
  const elapsed = Math.max(0, now - state.r);
  const refilled = Math.min(limits.limit, state.t + elapsed * refillRate);

  if (refilled >= 1) {
    const newState: BucketState = { t: refilled - 1, r: now };
    await kv.put(key, JSON.stringify(newState), {
      expirationTtl: KV_TTL_SECONDS,
    });
    const remaining = Math.floor(newState.t);
    const tokensToFull = limits.limit - newState.t;
    const resetEpoch = Math.ceil(now + tokensToFull / refillRate);
    return {
      scope,
      limit: limits.limit,
      remaining,
      resetEpoch,
      retryAfterSec: 0,
      allowed: true,
    };
  }

  // Deny. Persist refilled state (refilledAt update only) so subsequent
  // requests see the same wall-clock origin.
  const denyState: BucketState = { t: refilled, r: now };
  try {
    await kv.put(key, JSON.stringify(denyState), {
      expirationTtl: KV_TTL_SECONDS,
    });
  } catch {
    // Non-fatal: the deny is still correct, we just won't update the touch.
  }
  const needed = 1 - refilled;
  const waitSec = needed / refillRate;
  const retryAfterSec = Math.max(1, Math.ceil(waitSec));
  const tokensToFull = limits.limit - refilled;
  const resetEpoch = Math.ceil(now + tokensToFull / refillRate);
  return {
    scope,
    limit: limits.limit,
    remaining: 0,
    resetEpoch,
    retryAfterSec,
    allowed: false,
  };
}

function parseState(raw: string): BucketState | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as { t?: unknown }).t === "number" &&
      typeof (parsed as { r?: unknown }).r === "number"
    ) {
      return { t: (parsed as BucketState).t, r: (parsed as BucketState).r };
    }
  } catch {
    // fall through
  }
  return null;
}

function buildHeaders(decisions: BucketDecision[]): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const d of decisions) {
    headers[`X-RateLimit-Limit-${d.scope}`] = String(d.limit);
    headers[`X-RateLimit-Remaining-${d.scope}`] = String(d.remaining);
    headers[`X-RateLimit-Reset-${d.scope}`] = String(d.resetEpoch);
  }
  return headers;
}

function extractOrgId(pathname: string): string | null {
  const m = ORG_PATH_RE.exec(pathname);
  if (!m || !m[1]) return null;
  return m[1];
}

async function deriveIdentityKey(
  request: Request,
  routeFamily: RouteFamily,
): Promise<string> {
  const auth = request.headers.get("authorization");
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice("Bearer ".length).trim();
    if (token.length > 0) {
      const hash = await sha256Hex(token);
      return `bearer:${hash.slice(0, 32)}`;
    }
  }
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  return `anon:${routeFamily}:${ip}`;
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

function logKvFailure(err: unknown, requestId: string): void {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(
    JSON.stringify({
      level: "warn",
      msg: "rate_limit.kv_failure",
      requestId,
      error: message,
    }),
  );
}

// Test-only export: allows unit tests to introspect the configured limits
// without needing to mirror the table.
export const __rateLimitConfigForTest: Record<RouteFamily, FamilyConfig> = LIMITS;
