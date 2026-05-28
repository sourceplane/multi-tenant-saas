# Task 0065 Verifier

Agent: Verifier

## Current Repo Context

- Task 0064 is verified and merged via PR #107. Config-worker and api-edge now support metadata-only secret create, rotate, and revoke mutations at organization, project, and environment scope.
- Task 0065 Implementer opened PR #108: https://github.com/sourceplane/multi-tenant-saas/pull/108
- PR branch: `impl/task-0065-encrypted-secret-storage`
- Implementer report: `ai/reports/task-0065-implementer.md`
- Claimed outcome: config-worker now accepts write-only secret `value` fields on create/rotate, encrypts with AES-256-GCM before persistence, stores only `config.secret_metadata.ciphertext_envelope`, and returns only safe metadata.
- Local orchestrator smoke checks before verifier handoff passed:
  - `pnpm --filter @saas/config-worker-tests test` — PASS, 174 tests.
  - `pnpm --filter @saas/api-edge-tests test` — PASS, 230 tests.
  - `pnpm --filter @saas/contracts test` — PASS.
  - `pnpm --filter @saas/db test` — PASS.
  - `pnpm --filter @saas/config-worker typecheck` — PASS.
  - `pnpm --filter @saas/api-edge typecheck` — PASS.
  - `pnpm --filter @saas/contracts typecheck` — PASS.
  - `pnpm --filter @saas/db typecheck` — PASS.
  - `/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml` — PASS.
  - `/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json` — PASS, 6 components / 16 jobs.
  - `/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions` — PASS.

## Objective

Verify PR #108 against Task 0065 and the Verifier Standard. Confirm the implementation is production-safe for encrypted write-only config secret payload storage, does not expose plaintext/ciphertext through safe surfaces, preserves Task 0064 metadata mutation guarantees, and is ready to merge only if local checks and GitHub CI logs are acceptable.

## PR Boundary

The verifier must evaluate exactly this PR boundary:

1. Config-worker encryption adapter for secret payloads using Worker-compatible Web Crypto and configurable key binding/secret.
2. Config repository write-only ciphertext persistence while preserving safe read/list/get surfaces.
3. Config-worker create/rotate secret handlers accepting write-only secret payloads, encrypting before DB mutation, preserving authorization, exact-scope checks, and transaction-coupled event/audit writes.
4. Contract request types for write-only secret storage with metadata-only responses.
5. Focused config-worker/api-edge/contracts/db tests for encryption, secret-safety, fail-closed key behavior, api-edge forwarding, and no bearer forwarding.
6. Minimal deployment documentation/binding shape for encryption key prerequisite.

Non-goals remain out of scope: no reveal/read/decrypt API, no web-console UI, no Terraform/live key provisioning, no KV/effective config/versioning work, no unrelated docs or orchestrator policy changes.

## Read First

- `agents/orchestrator.md` — Verifier Standard and Verifier Merge Protocol, especially lines around sections 385-427.
- `ai/tasks/task-0065.md` — original Implementer task contract.
- `ai/reports/task-0065-implementer.md` — implementer claim and checks.
- PR #108 diff and commits via `gh pr diff 108` and `gh pr view 108 --json ...`.
- `specs/constitution.md` — secure-by-default, bounded contexts, events/audit, Definition of Done.
- `specs/product-overview.md` — SaaS starter and adapter boundaries.
- `specs/components/07-config-secrets-flags.md` — encrypted secret storage and write-only secret API expectations.
- `specs/contracts/api-guidelines.md` — public envelope/error conventions and API safety.
- `specs/contracts/tenancy-and-rbac.md` — tenant/project/environment scope and deny-by-default authorization.
- `ai/tasks/task-0064.md` and `ai/reports/task-0064-verifier.md` — verified metadata-only secret mutation behavior to preserve.

## Required Outcomes

- [ ] PR #108 corresponds exactly to Task 0065 and does not include unrelated scope.
- [ ] Implementer report is committed to PR #108 and includes real PR number `#108`, not `TBD`.
- [ ] Encryption adapter uses authenticated encryption with random nonce/IV per value and no hardcoded production key material.
- [ ] Missing or invalid `SECRET_ENCRYPTION_KEY` fails closed before DB mutation when a secret value is supplied.
- [ ] Secret create and rotate encrypt plaintext before persistence and persist only ciphertext envelopes.
- [ ] Repository safe read/list/get surfaces never select or expose `ciphertext_envelope`.
- [ ] `PublicSecretMetadata`, API responses, event payloads, audit payloads, and errors never expose plaintext, ciphertext, hashes, tokens, passwords, credentials, or bearer tokens.
- [ ] Existing Task 0064 exact route-scope enforcement and policy authorization remain intact.
- [ ] Production mutation + event/audit append remains transaction-coupled; event failure rolls back/throws.
- [ ] api-edge forwards create/rotate request bodies correctly and still does not forward raw Authorization bearer tokens downstream.
- [ ] Local targeted tests, typechecks, Orun validate, changed-plan, and dry-run pass.
- [ ] GitHub Actions CI for PR #108 passes, and logs show expected commands actually ran.

## Non-Goals

- Do not add new feature scope as verifier cleanup.
- Do not provision live Cloudflare Worker secrets in this verifier task.
- Do not add web-console secret UI, reveal/decrypt APIs, Terraform/KMS/Secrets Store, KV/effective config, or versioning work.
- Do not merge if CI is failing or if any secret-safety blocker remains unresolved.

## Constraints

1. Never print, invent, or persist real secret values. Use placeholder references only.
2. Treat plaintext, ciphertext envelopes, hashes, and bearer tokens as sensitive. Reports may name fields, not values.
3. If verifier makes a small required fix, commit it to the PR branch, push, then wait for CI again before PASS/merge.
4. Merge only after both local checks and PR CI logs are acceptable.
5. If implementation intentionally allows metadata-only create/rotate in addition to write-only payload storage, decide whether that is a compatible behavior or a blocker against Task 0065’s wording; document the decision clearly.

## Acceptance Criteria

✅ PR #108 diff is scoped to encrypted config secret payload storage and required task/report/context files only.

✅ Local checks pass:

```bash
pnpm --filter @saas/config-worker-tests test
pnpm --filter @saas/api-edge-tests test
pnpm --filter @saas/contracts test
pnpm --filter @saas/db test
pnpm --filter @saas/config-worker typecheck
pnpm --filter @saas/api-edge typecheck
pnpm --filter @saas/contracts typecheck
pnpm --filter @saas/db typecheck
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

✅ GitHub PR CI checks pass, and `gh` log inspection confirms the expected config-worker, api-edge, contracts, db/tests, and Orun jobs ran.

✅ Code inspection proves no plaintext/ciphertext/secret material exposure through public responses, event/audit payloads, safe repository reads, errors, reports, or logs.

✅ Deployment prerequisite for `SECRET_ENCRYPTION_KEY` is documented without committed key material.

✅ If PASS: merge PR #108, checkout `main`, fast-forward pull from `origin/main`, delete/clean up the task branch if possible, and leave the worktree clean except pre-existing unrelated untracked carryover files explicitly documented.

✅ If FAIL: leave PR #108 open and document exact blockers in the verifier report.

## Verification

Follow the Verifier Merge Protocol from `agents/orchestrator.md`:

1. Confirm repo state and PR metadata:
   - `git status --short --branch`
   - `gh pr view 108 --json number,title,state,headRefName,mergeStateStatus,statusCheckRollup,commits,files,url`
   - `gh pr diff 108 --name-only`
2. Inspect changed code paths:
   - `apps/config-worker/src/encryption.ts`
   - `apps/config-worker/src/handlers/create-secret.ts`
   - `apps/config-worker/src/handlers/rotate-secret.ts`
   - `packages/db/src/config/repository.ts`
   - `packages/db/src/config/types.ts`
   - `packages/contracts/src/config.ts`
   - `apps/config-worker/src/env.ts`
   - `apps/config-worker/wrangler.jsonc`
   - focused tests under `tests/config-worker` and `tests/api-edge` if changed.
3. Search for accidental sensitive exposure:
   - `ciphertext_envelope` should appear only in write-only DB/envelope contexts, not public response mappers.
   - `value` should not appear in secret response types, event payloads, or audit payloads.
   - No committed real `SECRET_ENCRYPTION_KEY` values.
4. Run local checks listed in Acceptance Criteria.
5. Inspect PR CI status and logs:
   - `gh pr checks 108 --watch` if checks are still running.
   - `gh run list --branch impl/task-0065-encrypted-secret-storage --limit 5`
   - `gh run view <run-id> --json name,conclusion,jobs`
   - Use `gh run view <run-id> --log` or `--log-failed` as needed to verify expected commands.
6. Write `ai/reports/task-0065-verifier.md` with PASS or FAIL.
7. If PASS, merge PR #108 and sync local main:
   - `gh pr merge 108 --squash --delete-branch`
   - `git checkout main`
   - `git pull --ff-only origin main`
   - `git status --short`
8. If FAIL, do not merge; keep the PR open and document blockers.

## When Done Report

Write `/ai/reports/task-0065-verifier.md` with sections:

- Result: PASS or FAIL
- Summary
- Checks
- Code Path Inspection
- Secret Handling Review
- CI Log Review
- Issues
- Risk Notes
- Spec Proposals
- Recommended Next Move
- Merge Action
