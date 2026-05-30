# Task 0095 — Verifier Report (FAIL — request changes)

- **Task:** 0095 — Edge idempotency replay store (B3, partial)
- **PR:** #143 — `impl/task-0095-edge-idempotency-replay-store` @ `e47248e3ae4b81020204eeeaa200429b1e1a0a7f`
- **Base:** `origin/main` @ `f7f5d197df75d261312e55e685f59cf05f4f59f4`
- **Verdict:** **FAIL — do not merge.** One blocking gap, and it is the entire point of the task.
- **Verifier:** Hermes orchestrator, running `orun-saas-verifier` skill
- **Date:** 2026-05-30

---

## TL;DR

The code is well-shaped (good envelope design, identity-agnostic key, base64 fallback, 4xx-cached / 5xx-not-cached, KV-unbound degrade-open, 282 tests green, terraform validates). But the wrangler bindings ship with **sentinel placeholder KV namespace IDs** (`0000…000a` for stage, `0000…000b` for prod), and **no pipeline step exists anywhere in this repo to substitute the real Terraform-output KV IDs into `wrangler.jsonc` before `wrangler deploy` runs.**

If this is merged, the next main-CI run will:
1. Apply `cloudflare-kv` and create real KV namespaces (good).
2. Deploy api-edge against `wrangler.jsonc` with placeholder IDs `…000a`/`…000b` — Cloudflare will either reject the deploy outright (namespace not found in the account) or, worse, bind `IDEMPOTENCY_KV` to a phantom ID. Every replay read/write throws, the catch-all in `replayOrExecute` degrades open, and the new replay store is **silently never engaged in production.** The implementer's own report flags this as an open risk ("placeholder IDs … will be replaced post-terraform-apply by the deploy pipeline") — that pipeline does not exist.

This is a **deferred-path blocker** (per skill Constraint 3) and a hard FAIL. It is also fixable in <50 lines and one PR.

---

## Phase-by-phase

### Phase 1 — Repo & PR sanity ✅
- `git fetch origin` clean; `main` checked out, then PR #143 checked out at `e47248e3ae4b8…`.
- `ai/state.json`, `ai/context/current.md` clean vs origin/main.
- Three task doc files (`task-0094.md`, `task-0094-verifier.md`, `task-0095.md`) are present in PR #143 but absent on `origin/main`. Harmless, but suggests Task 0094's docs slipped into 0095. Note for future hygiene; not a blocker.
- `gh pr view 143`: state OPEN, mergeable=MERGEABLE, no merge conflicts.

### Phase 2 — Diff scan ✅
- `gh pr diff 143 | grep -E "eslint-disable|@ts-ignore|@ts-expect-error|as any"` → **0 hits.**
- Boundary scan on changed paths → **clean.** Edits are scoped to `apps/api-edge/`, `tests/api-edge/`, `infra/terraform/cloudflare-kv/` (new), and three `ai/tasks/*.md` doc files. No edits to `cloudflare-domain`, `notifications-worker`, `web-console-next`, `tooling/eslint`, `package.json`, or `pnpm-lock.yaml`.

### Phase 3 — Local install + gates ✅
- `pnpm install --frozen-lockfile` → already up to date, no lockfile drift.
- `pnpm --filter @saas/api-edge typecheck` → ✅
- `pnpm --filter @saas/api-edge lint` → ✅ (eslint clean on `src`)
- `pnpm --filter @saas/api-edge-tests test` → **282 passed, 0 failed, 11 suites.**
- `terraform fmt -check -recursive` on `infra/terraform/cloudflare-kv/terraform` → ✅
- `terraform init -backend=false && terraform validate` → ✅ "Success! The configuration is valid."

(Pre-existing unrelated failure in `tests/db/src/migrations.test.ts` confirmed identical on baseline; not introduced by this PR.)

### Phase 4 — `replayOrExecute` code-path inspection ✅

`apps/api-edge/src/idempotency.ts` is well-built:

- **Chokepoint substitution:** all 7 facades (auth, billing, config, metering, org, project, webhooks) now route mutations through `replayOrExecute(...)` — `validateIdempotencyKey` no longer gates them directly. ✅
- **Envelope v1:** versioned, JSON-shaped, includes `status`, `headers` (allowlisted), `body` (utf8 or base64-encoded), `bodyEncoding`, `createdAt`. Forward-compatible. ✅
- **Header allowlist** prevents leaking actor/auth headers into replay payloads. ✅
- **Base64 fallback** for non-UTF-8 bodies (binary/encoded responses). ✅
- **Status-code policy:** 4xx cached; 5xx **not** cached (Stripe parity); GET passthrough. ✅
- **TTL:** 24h on KV `put`. ✅
- **Identity-agnostic key:** key is namespaced by route + idempotency-key header only — actor identity is intentionally excluded so two callers replaying the same key on the same route get the same envelope (Stripe semantics). ✅
- **Degrade-open on KV failure:** `logKvFailure` swallows KV errors and lets the underlying handler run; replay layer fails *open*, never blocks the request. ✅ Test `idempotency-replay.test.ts:282` exercises this and passes.

12 cases in `tests/api-edge/src/idempotency-replay.test.ts` cover: hit replay, miss-then-store, GET passthrough, missing header, 4xx cache, 5xx no-cache, base64 round-trip, KV-unbound degradation, identity-agnostic key, header allowlist enforcement, TTL parameter, envelope shape.

### Phase 5 — Wrangler binding inspection ❌ **BLOCKER**

`apps/api-edge/wrangler.jsonc` declares:

```jsonc
"env": {
  "stage": {
    "kv_namespaces": [
      { "binding": "IDEMPOTENCY_KV", "id": "0000000000000000000000000000000a" }
    ]
  },
  "prod": {
    "kv_namespaces": [
      { "binding": "IDEMPOTENCY_KV", "id": "0000000000000000000000000000000b" }
    ]
  }
}
```

These are sentinel placeholder IDs. Real KV namespace IDs are 32-char hex strings emitted by the `cloudflare_workers_kv_namespace.api_edge_idempotency` resource in `infra/terraform/cloudflare-kv/terraform/main.tf` as the `api_edge_idempotency_kv_id` output.

**The substitution mechanism is missing.** Comprehensive search across the deploy plumbing turned up nothing:

| Location | What I looked for | Result |
|---|---|---|
| `.github/workflows/ci.yml` | `envsubst`, `sed`, `jq … id`, `terraform output`, `wrangler.jsonc` | none — orun-action just runs the orun plan |
| `stack-tectonic/compositions/cloudflare-worker-turbo/jobs/cloudflare-worker-turbo-verify-deploy.yaml` | KV ID injection step before `wrangler deploy` | none — deploy step is `pnpm exec wrangler deploy --config {{ .parameters.wranglerConfig }} --env {{ .orun.environment.name }}`, no pre-step |
| `apps/api-edge/component.yaml` | `preDeployCommand` | declared but set to `"echo 'No pre-deploy step configured.'"` |
| `apps/api-edge/scripts/verify-bindings.mjs` | KV binding validation | only validates Hyperdrive + Service bindings; doesn't even know `IDEMPOTENCY_KV` exists |
| `infra/terraform/cloudflare-kv/` | output→consumer wiring | Terraform emits the IDs, but nothing consumes them |

The orun composition does support `preDeployCommand` (schema confirms it; `cloudflare-worker-turbo-verify-deploy.yaml:83` runs it), so the architectural seam is there — it's just unused for api-edge.

**Consequence if merged as-is:** stage/prod deploys bind `IDEMPOTENCY_KV` to nonexistent namespace IDs. Either (a) Cloudflare rejects the deploy with "KV namespace not found" — at least loud, but ships api-edge in a broken-deploy state, or (b) the deploy succeeds with a phantom binding and every KV op throws, the catch-all degrades open, and **the entire B3 replay store is silently inert in production** while tests and dashboards say everything is fine. Either outcome defeats the task.

This is exactly the deferred-path failure mode Constraint 3 of the verifier skill is meant to catch: a feature that *looks* shipped but whose runtime substrate was never plumbed.

### Phase 6 — Merge decision ❌

**Not merging.** Phase 5 is a hard block.

Phases 7 (post-merge CI watch + KV resource verification), 8 (live evidence cases a–g on stage and prod), and 9 (console smoke + open-risks) are gated behind merge and are **not executed**.

### Phase 10 — State files

Not updating `ai/state.json` or `ai/context/current.md` to reflect a passing Task 0095 — the task is not verified. State files remain on Task 0094's last verified position. (If the user wants a "verifier-FAIL" entry recorded explicitly, say the word and I'll add it.)

---

## Required fix (suggested shape, implementer's call)

Add a `preDeployCommand` for api-edge that, post-terraform-apply, reads the KV ID from a known location and rewrites `wrangler.jsonc` (or, cleaner, switches to a `wrangler.template.jsonc` + generated `wrangler.jsonc`). Roughly:

1. In `infra/terraform/cloudflare-kv/terraform/outputs.tf`, ensure the KV ID is exported per environment (already is: `api_edge_idempotency_kv_id`).
2. In the orun pipeline, after the `cloudflare-kv` apply step writes its output JSON, have api-edge's `preDeployCommand` (in `apps/api-edge/component.yaml`) run a small node/jq script that:
   - reads `api_edge_idempotency_kv_id` from the terraform output for the current environment,
   - patches the `id` field of the `IDEMPOTENCY_KV` binding under `env.{environment}.kv_namespaces[0].id` in `wrangler.jsonc`,
   - leaves the rest of the file untouched.
3. Extend `apps/api-edge/scripts/verify-bindings.mjs` to assert the KV binding exists, has a non-placeholder ID (regex `^[0-9a-f]{32}$` and not `0000…000a`/`…000b`), and binding name is `IDEMPOTENCY_KV`. Run it as part of the verify lane.
4. Optional but recommended: add a CI guard that fails the PR if `wrangler.jsonc` contains `0000000000000000000000000000000a` or `…000b` outside of comments.

Once that's in, re-request verification and I'll resume from Phase 6.

---

## Summary table

| Phase | Result | Notes |
|---|---|---|
| 1 — Repo/PR sanity | ✅ | minor task-doc bleed-through, not a blocker |
| 2 — Diff scan (hazard + boundary) | ✅ | no eslint-disable / ts-ignore / boundary breaches |
| 3 — Local gates | ✅ | typecheck / lint / 282 tests / terraform validate all green |
| 4 — `replayOrExecute` code path | ✅ | envelope v1, allowlist, base64, 4xx cache, 5xx no-cache, degrade-open |
| 5 — Wrangler binding | ❌ | placeholder KV IDs + no substitution mechanism in pipeline |
| 6 — Merge | ❌ | gated by Phase 5 |
| 7 — Post-merge CI / KV resources | — | not run (gated) |
| 8 — Live evidence stage/prod | — | not run (gated) |
| 9 — Console smoke / open-risks | — | not run (gated) |
| 10 — State files | — | not updated; task remains unverified |

**Verdict: FAIL — request changes per Phase 5.**
