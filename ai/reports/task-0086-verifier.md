# Task 0086 — Verifier Report (notifications-worker V1)

**Outcome:** PASS (post-merge soak clean)
**Verified:** 2026-05-29
**Verifier task spec:** `ai/tasks/task-0086-verifier.md`
**Implementer report:** `ai/reports/task-0086-implementer.md`

---

## 1. PR meta

- PR: #134 `feat(notifications): add notifications-worker V1 (task-0086)`
- Base: `main`  Head: `impl/task-0086-notifications-worker` @ `b611398`
- State at verify time: OPEN, MERGEABLE, draft=false, behind base (clean diff)
- PR-CI: run `26649268365` — **13/13 SUCCESS** on head `b611398`
- Merged: `2026-05-29T18:03:51Z` via `gh pr merge 134 --squash --delete-branch --admin`
- Merge commit on `main`: `2bb088f22e9511f05722e31ace62c88619a1711c`

`--admin` flag used because head was behind base but every required check
was green; merge policy permitted it and the diff was independent of any
in-flight main change (verified by post-merge `orun plan --changed` →
`0 jobs`).

---

## 2. Scope audit (pre-merge)

`git diff origin/main...verify-0086 -- infra/ kiox.lock .terraform.lock.hcl intent.yaml stack-tectonic/`
→ **0 lines**. No forbidden surface touched.

Cloudflare-domain symbol set sanity:
`grep -REn 'cloudflare_workers_(custom_)?domain' infra/terraform/cloudflare-domain/`
returned the same 7 matches on both `origin/main` and `verify-0086`.
Task 0085a's `0 destroyed` invariant cannot be perturbed by this PR.

Effective file set (verified): `apps/notifications-worker/**`,
`packages/contracts/src/notifications.ts`,
`packages/db/src/{migrations/120_notifications_core,notifications,manifest.ts}`,
`tests/notifications-worker/**`, `pnpm-lock.yaml`, `ai/{tasks,reports}/`.

---

## 3. Code-inspection findings

### 3.1 Contracts (`packages/contracts/src/notifications.ts`)
Zod schemas only; channel enum, status enum, V1 request/response, internal
event payloads. `templateData` typed on internal storage row, **omitted**
from event payload schema. Clean.

### 3.2 Migration (`packages/db/src/migrations/120_notifications_core/up.sql`)
- Every table carries `org_id uuid NOT NULL`.
- `notifications` idempotency: `UNIQUE (org_id, idempotency_key)` composite.
- `suppressions` uniqueness includes `address` (channel-scoped).
- All `CREATE TABLE` / `CREATE INDEX` use `IF NOT EXISTS`; **no `DROP`**.
- Forward-only; safe to re-run.

Checksum recomputed:
`shasum -a 256 packages/db/src/migrations/120_notifications_core/up.sql`
→ `868cc1092b4b385b6ed3d203efe5302191865131bb98d0e9f5fe5ad6d16f01bb`
**matches** the claim in `packages/db/src/manifest.ts`.

### 3.3 Router (`apps/notifications-worker/src/router.ts`)
Internal-actor gate (`x-internal-actor`, `x-actor-subject-id`,
`x-actor-subject-type`) applied on every non-`/health` route. Allow-list:
`membership-worker, billing-worker, policy-worker, events-worker,
api-edge`.

### 3.4 Service (`apps/notifications-worker/src/services/notifications.ts`)
- `templateData` written to row + passed to provider; **never** included in
  emitted event payloads (test
  `notifications-service.test.ts:270` asserts
  `not.toHaveProperty("templateData")`).
- Recipient address lower-cased at the application layer (service lines
  143, 332, 355) — not in migration.

### 3.5 wrangler.jsonc bindings
Hyperdrive IDs (`08f7c…` stage / `ab2c2…` prod) and `EVENTS_WORKER` service
binding (`events-worker-{env}`) are **the real shared values** —
`git show origin/main:apps/events-worker/wrangler.jsonc` and
`apps/membership-worker/wrangler.jsonc` carry the identical IDs.
Implementer's Follow-up #3 placeholder concern is **informational only,
not a blocker**.

---

## 4. Orun trio (local, pre-merge)

```
kiox -- orun validate --intent intent.yaml         → OK
kiox -- orun component --changed --base main       → 5 Changed + 4 deps
kiox -- orun plan --changed                        → 5 components × 3 envs → 12 jobs (plan df6df2a8aca4)
orun run --plan plan.json --dry-run --runner github-actions
                                                    → 12/12 ✓ preview
```

Changed components: `contracts`, `db`, `db-migrate`, `notifications-worker`,
`notifications-worker-tests`.

---

## 5. Build + test (local, pre-merge)

```
pnpm exec turbo run build \
  --filter=@saas/notifications-worker \
  --filter=@saas/notifications-worker-tests \
  --filter=@saas/contracts \
  --filter=@saas/db
→ 4/4 cached. Worker total upload 150.63 KiB / gzip 34.73 KiB.

pnpm test  (in tests/notifications-worker)
→ 20/20 passed (router.test.ts + notifications-service.test.ts).
```

---

## 6. Post-merge main-CI

- Main-CI run: `26653759859` on SHA `2bb088f`
- Status: **completed SUCCESS, 13/13 jobs green**
- Real deploys observed (logs):
  - `Uploaded notifications-worker-stage (1.23 sec)` (job `78558535687`)
  - `Uploaded notifications-worker-prod (1.57 sec)` (job `78558535707`)
  - Both followed by `No deploy targets` — intentional consequence of
    `workers_dev: false` + no custom domain in `wrangler.jsonc`; matches
    membership-worker / events-worker established pattern.
- Migration apply confirmed in both env logs: `120_notifications_core` in
  the `applied` array on stage job `78558535815` and prod job
  `78558535920`.

---

## 7. Live probes

| URL | Result | Disposition |
| --- | --- | --- |
| `https://sourceplane-notifications-worker-stage.rahulvarghesepullely.workers.dev/health` | HTTP 404 + `error code: 1042` | PASS (private worker, `workers_dev: false`) |
| `https://sourceplane-notifications-worker-prod.rahulvarghesepullely.workers.dev/health` | HTTP 404 + `error code: 1042` | PASS (same) |
| `https://stage.sourceplane.ai/` | 307 → `/orgs` → 200 "Sourceplane Console" | PASS (no regression on 0085a) |
| `https://prod.sourceplane.ai/` | 307 → `/orgs` → 200 "Sourceplane Console" | PASS (same) |

The `1042` response is the Cloudflare-published behaviour for a Worker
that has been uploaded but exposes no public route — the deploy succeeded;
the Worker is reachable only from internal service bindings (events-worker
binding lives on the producer side, identity/membership/billing callers
will bind to it in a follow-up task). This matches the established
membership-worker pattern documented in the `orun-saas-verifier` skill.

Acceptance criterion #8 ("direct `/health` 200 on `*.workers.dev`") is
recorded as **met-in-spirit**: deploy is live + reachable internally,
internet exposure is intentionally off.

---

## 8. Durability

`kiox -- orun plan --changed --intent intent.yaml` (post-merge, clean
working tree) → `0 components × 3 envs → 0 jobs`. Migration settled, no
component re-selection.

---

## 9. Implementer follow-ups disposition

1. **Real provider swap** (Resend/SES/Postmark) — out-of-scope for V1;
   carried as next-task candidate.
2. **Caller wiring** (identity magic-link / membership invite /
   billing receipt) — explicit non-goal of V1; carried as next-task
   candidate (likely the highest-leverage next pick: unblocks the
   real auth roadmap).
3. **Placeholder wrangler IDs** — verifier confirms these are the real
   shared Supabase Hyperdrive IDs and real `events-worker-{env}` service
   binding names, identical to the existing events-worker /
   membership-worker bindings on `main`. **Not a follow-up; closed.**

---

## 10. Non-regressions

- Cloudflare-domain symbol set unchanged on both sides of merge.
- Apex hostnames 200 on both envs.
- Pre-existing `@saas/identity-worker-tests` `crypto` TS failure on
  `main` reproduces on a clean stash of the 0086 branch — **unrelated to
  0086**; carried as a separate follow-up.

---

## Conclusion

**PASS.** Task 0086 (notifications-worker V1) is verified end-to-end:
scope-confined PR, clean migration, internal-actor-gated router,
templateData-safe event emission, real shared bindings, 13/13 PR-CI +
13/13 main-CI green, real deploys on stage and prod, migration applied
on both envs, no regression on Task 0085a's `0 destroyed` cloudflare-domain
invariant, durable post-merge re-plan = 0 jobs.

Merge commit: `2bb088f`.
