# Task 0105 — Implementer Report (PASS)

**Agent:** Implementer
**Branch:** `impl/task-0105-webhook-verifier`
**Base:** `main` (`eb40bbb`, sealed snapshot `f01d61f`)
**Impl commit:** `3279119`
**Report commit:** appended on PR branch
**PR Number:** **#160** — https://github.com/sourceplane/multi-tenant-saas/pull/160
**PR-CI run:** `26701508678` — https://github.com/sourceplane/multi-tenant-saas/actions/runs/26701508678 — **4/4 SUCCESS**

## Summary

- Shipped a new workspace package `@saas/webhook-verifier` at
  `packages/webhook-verifier/` — a zero-dependency, WebCrypto-only HMAC-SHA256
  signature verifier for third-party consumers of Sourceplane outbound
  webhooks. Codifies the canonical signing scheme already locked in
  `apps/webhooks-worker/src/delivery.ts:45-61` so external integrators and
  console-side replay tooling stop reinventing it.
- Public surface: 5 constants (`SIGNATURE_HEADER`, `TIMESTAMP_HEADER`,
  `WEBHOOK_ID_HEADER`, `SIGNATURE_PREFIX`, `DEFAULT_TOLERANCE_SECONDS=300`),
  `verifyWebhookSignature(input)` returning a tagged
  `{ ok: true } | { ok: false; reason }` result with **6 enumerated failure
  reasons**, and `signWebhookPayload({secret,body,timestamp})` for fixtures
  and symmetric debugging.
- Constant-time signature comparison: full-length XOR-accumulator over the
  decoded byte arrays; no `return`/`break` mid-loop. Header lookup is
  case-insensitive for both `Record<string,string|string[]|undefined>` and
  `Headers` shapes.
- Zero runtime dependencies (`package.json#dependencies` empty). Zero
  `node:` imports anywhere under `packages/webhook-verifier/**` — runs
  verbatim on Cloudflare Workers, Bun, modern Node, and browsers.
- `component.yaml` mirrors `packages/notifications-client/component.yaml`
  byte-for-byte modulo `metadata.name: webhook-verifier`. Plan generated
  exactly the 3 expected `webhook-verifier · {dev,stage,prod} · Verify`
  lanes (turbo-package.quick-check), no unrelated lanes.

## Files Changed

`packages/webhook-verifier/**` (new):

- `package.json` — `@saas/webhook-verifier`, `private: true`, `type: module`,
  `exports: "./src/index.ts"`, empty `dependencies`, devDeps:
  `@saas/eslint-config`, `@saas/tsconfig`, `typescript`, `vitest`.
- `tsconfig.json` — extends `tooling/tsconfig/base.json`, lib `[ES2022,DOM]`.
- `tsconfig.build.json` — extends base, `outDir: dist`, `rootDir: src`,
  excludes `__tests__`.
- `eslint.config.js` — re-exports `tooling/eslint/index.js`.
- `component.yaml` — turbo-package, starter-shared, dev/stage/prod
  quick-check, layer/surface = shared.
- `README.md` — single integrator example + tolerance note (≤1.5 KB).
- `src/index.ts` — public surface (~7 KB, 0 deps, WebCrypto only).
- `src/__tests__/verify.test.ts` — 22 vitest cases.

Other:

- `pnpm-lock.yaml` — workspace pickup + `vitest@2.1.9` resolution
  (link://workspace pkgs only; no new external runtime deps).

Untouched (per non-goals): `apps/webhooks-worker/**`, `packages/sdk/**`,
`packages/cli/**`, `packages/contracts/**`, `apps/web-console-next/**`,
`tooling/**`, `tests/**`, `kiox.lock`.

## Checks Run

| Gate | Command | Exit | Notes |
| --- | --- | --- | --- |
| install | `pnpm install` | 0 | 39 workspaces (was 38). |
| typecheck | `pnpm -r typecheck` | 0 | 38 of 39 (vanilla `multi-tenant-saas` root has no typecheck script). |
| lint | `pnpm -r --no-bail lint` | 0 (workspace), `tests/api-edge` reports `✖ 45 problems (0 errors, 45 warnings)` — same as main, all `@typescript-eslint/no-explicit-any`. **Zero new warnings under `packages/webhook-verifier/**`.** |
| build | `pnpm --filter @saas/webhook-verifier build` | 0 | tsc emit only. |
| test | `pnpm --filter @saas/webhook-verifier test` | 0 | **22/22 passing**, 12 ms test runtime. |
| orun validate | `./.workspace/bin/orun validate --intent intent.yaml` | 0 | `✓ Intent is valid`, `✓ All validation passed`. |
| orun plan | `./.workspace/bin/orun plan --changed --intent intent.yaml --output /tmp/plan-0105.json` | 0 | `1 components × 3 envs → 3 jobs`; jq confirms exactly `webhook-verifier · {dev,stage,prod} · Verify` (`turbo-package.quick-check`). |
| orun dry-run | `./.workspace/bin/orun run --plan /tmp/plan-0105.json --dry-run --runner github-actions` | 0 | `Preview ready in 0.0s · 3 selected`, all 3 simulated `✓`. |
| PR-CI | `gh run view 26701508678 --log` | success | plan + 3× verify all green; per-job `4 passed, 0 failed, 0 skipped`. Confirmed via full log, not summary. |

## Test Coverage (22 cases)

- Happy-path verify (1).
- Header-case-insensitivity on `Record` (1).
- `Headers` instance input (1).
- `Record<string,string|string[]|undefined>` array-value input (1).
- Each `VerifyFailureReason` branch — one dedicated test minimum:
  `missing_signature` (1), `missing_timestamp` (1),
  `malformed_timestamp` non-numeric (1), `malformed_timestamp` oversized (1),
  `timestamp_out_of_tolerance` default 300s (1), `toleranceSeconds: 0` drift (1),
  `malformed_signature` no `sha256=` prefix (1), `malformed_signature` non-hex (1),
  `signature_mismatch` wrong secret (1), body-byte tamper (1), timestamp tamper (1),
  first-byte tamper (1), last-byte tamper (1), truncated hex / hex-length mismatch (1).
- Default `now()` fallback (1).
- `signWebhookPayload` shape (sha256= + 64 lowercase hex) (1).
- `signWebhookPayload` round-trips through `verifyWebhookSignature` (1).
- **Byte-identity match against the canonical `computeSignature` scheme**
  (duplicated as test fixture — no import from `apps/webhooks-worker/**`) (1).

## Assumptions

- **WebCrypto only** is durable: every target runtime (Workers, Bun, modern
  Node ≥20, evergreen browsers) ships `crypto.subtle.importKey/sign`. No
  `node:crypto` fallback path needed; the prompt explicitly forbids one.
- **Codifying, not extending, the signing scheme**: the helper hardcodes
  `${timestamp}.${body}` + `sha256=` + lowercase-hex + `X-Webhook-*` header
  names because they are already shipped on main. Any future scheme change
  is a separate spec proposal with the worker as primary owner; this PR
  cannot be the place that breaks compatibility.
- **Helper is intentionally NOT routed through `@saas/sdk`**: external
  consumers of webhooks often run in environments where the SDK has no
  business (customer-side webhook receivers). Re-exporting from the SDK
  would couple an external utility to an internal API client.
- **Tolerance default 300s** matches the prompt and is loose enough for the
  typical clock-skew envelope; integrators with tight NTP can lower it.

## Spec Proposals

None. The webhook signing scheme is already documented across
`apps/webhooks-worker/src/delivery.ts` and
`specs/components/15-webhooks-integrations.md`; this PR consumes them
without contradicting either. No contract gap surfaced — keeping the
constants in the verifier helper (rather than `packages/contracts/`) is
consistent with the contracts file's stated exclusion of secret material.

## Remaining Gaps

- B5 surfaces still open after this PR: rotate-UX, replay UI, failure-budget
  alerts. Helper-library leg is closed.
- A possible follow-up `sourceplane webhooks verify` CLI command (consumes
  this helper from the CLI) is **out of scope** here per the prompt.
- Console-side replay tooling can now import this helper instead of
  duplicating the scheme; that migration is a separate task.

## Next Task Dependencies

- Unblocks the three remaining B5 surfaces (rotate-UX / replay / alerts).
- Unblocks an optional `sourceplane webhooks verify <secret> < body.json`
  CLI command.
- Unblocks console-side webhook replay tooling consuming
  `verifyWebhookSignature` rather than reimplementing HMAC.

## PR Number

**#160** (real, merged-state pending verifier).
