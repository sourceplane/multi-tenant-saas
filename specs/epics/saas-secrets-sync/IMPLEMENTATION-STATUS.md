# Implementation Status — saas-secrets-sync

As-built record for the SS cluster. Design intent is in
`implementation-plan.md`; trust code over this doc — re-derive from `git`/PRs
on boot.

## Summary

| ID | Status | Evidence / notes |
|----|--------|------------------|
| SS0 | ✅ Shipped (#342) | Escrow convention documented (`access-and-infra.md` § Worker runtime secrets); `tooling/secrets-sync/secrets.manifest.json` committed — names derived from the `wrangler secret put` comments across the five secret-bearing worker templates (identity, billing, webhooks, config, integrations-deferred). |
| SS1 | ✅ Shipped (#342) | `tooling/secrets-sync/check.mjs` + `escrow.fixture.json` committed; enforced in verify lanes by the `tests/secrets-sync` quick-check component (jest suite covers green/missing/typo/empty/strict/deployed paths and manifest↔template coverage). |
| SS2 | 🛠️ In progress | `secrets-live` step in `cloudflare-worker-turbo` deploy profile (after `deploy`, before `smoke`); pure decision tool `tooling/secrets-sync/sync.mjs` + 7 jest cases; `secretsWorker` parameter set on the five secret-bearing workers. |
| SS3 | ⛔ Blocked | Needs SS0 merged + human-seeded values (see risks register). |
| SS4 | 🗓️ Planned | Needs Secrets Store entitlement confirmation. |
| SS5 | 🗓️ Planned | Pairs with BF9 preflight doctor. |

## Decisions taken

- SS2 ordering: secrets-live runs **after** `wrangler deploy` — a first-boot
  worker must exist before `wrangler secret bulk` can target it; the bulk
  push rolls a new version immediately and `smoke` runs after it.
- SS2 fingerprint record lives in Secrets Manager
  (`<org>/<repo>/worker-secrets-fingerprints/<env>`), not as a worker var:
  Cloudflare-side state is awkward to read back; the SM record is readable
  by the same checkers that read escrow.
- Pre-SS3: absent escrow document = clean skip; present-but-incomplete
  escrow = hard failure.

- Escrow path: `sourceplane/multi-tenant-saas/worker-secrets/<env>` (one JSON
  doc per environment, `worker → SECRET_NAME → value`), shaped to be fetchable
  by the same composition mechanism as BF6 wire-live payloads.
- AWS Secrets Manager is the system of record; Cloudflare worker secrets /
  Secrets Store are deploy-time copies. Workers never read AWS at runtime.
- Baseline-first: the epic ships here; forks consume it via fork-sync and
  seed their own escrow values under their own `<org>/<repo>` namespace.
