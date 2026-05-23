# Open Risks

Last updated: 2026-05-24

## Active Risks

- Supabase provisioning must not log generated database passwords, API keys,
  service keys, or connection strings. Reports may include project refs, secret
  names, and non-secret ARNs only.
- `dev` Supabase remains intentionally unprovisioned. Tasks must not add a dev
  database/project unless a later prompt explicitly changes scope.
- `infra/terraform/cloudflare-hyperdrive/component.yaml` does not currently
  declare an explicit `dependsOn` edge to `supabase`; Task 0009 verification
  treated this as non-blocking because current Orun behavior and live state are
  stable. Revisit if future dependency ordering issues appear.
- The `_migrations.applied` table is bootstrapped in both `stage` and `prod`.
  Future domain migrations must be idempotent because the `SupabaseApiAdapter`
  sends statements in autocommit mode without true per-migration rollback.
  Advisory locks are a no-op in the adapter; concurrent runs are safe via
  `ON CONFLICT DO NOTHING` only.
- Orun does not currently express environment-scoped `dependsOn` edges. The
  `db` component cannot safely depend on `db-tests` while `db` subscribes to
  `dev`/`stage`/`prod` and `db-tests` subscribes only to `dev`; proposal
  `ai/proposals/task-0007.1-spec-update.md` is deferred.
- Ignored generated outputs from the draft exist locally (`dist`,
  `node_modules`, TypeScript build info, `.orun`, Terraform working dirs, and
  `plan.json`). They must not be staged or committed.
- Local AWS CLI credentials are unavailable in this checkout. Tasks that need
  AWS provider inspection must use CI logs, `gh`, or an authenticated role path
  and record any local access blocker clearly.
- GitHub Actions logs from run `26209010693` warn that Node.js 20 actions are
  deprecated and will move toward Node.js 24 defaults. This is not currently
  blocking, but it is a near-term CI maintenance item.
- The deploy trust subject from Task 0004 is
  `repo:sourceplane/multi-tenant-saas:environment:production`. This repo still
  has no GitHub environments configured, so the deploy-role trust path remains
  unexercised end-to-end.
- The orphaned R2 bucket `sourceplane-tf-state` and historical Hyperdrive
  adoption scaffold from Task 0002 remain live historical resources and are not
  owned by current repo source.
- Dead `dryRunCommand` and `deployCommand` parameters in
  `apps/identity-worker/component.yaml` point to `--env prod` but are
  overridden by the composition template. Non-blocking; recommend cleanup.
- Tests in `tests/identity-worker` re-implement auth service logic rather than
  importing from Worker source. Low risk since live deployment proves behavior,
  but a future maintenance task should improve import structure.
- Until the follow-up api-edge facade task lands, `api-edge` still does not
  route `/v1/auth/*`. The identity-worker is reachable directly at its own URL
  but not through the edge gateway.

## Resolved Risks

- Task 0008 is complete. The migration runner is operational. The
  `_migrations.applied` table is bootstrapped in `stage` and `prod` via
  post-merge CI run `26229865114`.
- Task 0009 is complete. Hyperdrive infrastructure is applied and stable in
  `stage` and `prod`.
- Orun `v2.3.0` spec drift is resolved. Active specs now reference `v2.3.0` as
  the verified runtime baseline via Task 0009.1.
- Task 0013 UUID/public-ID mismatch is resolved. The Worker generates proper
  UUIDs for database storage and maps to/from prefixed public IDs at the API
  boundary. Live stage auth flow confirmed correct UUID persistence.
- Task 0013 prod debug-delivery boundary is verified. Prod `DEBUG_DELIVERY=false`
  is enforced; live prod `/v1/auth/login/start` returns no raw code.

## Watch Items

- Keep `.github/workflows/ci.yml` Orun-only.
- Verify that local `kiox -- orun ...` behavior and GitHub Actions behavior use
  the same rendered plan.
- Keep reusable SaaS starter work separate from product-specific `specs-v2`
  work.
- Any live AWS, Cloudflare, Supabase, S3, Secrets Manager, or Hyperdrive
  mutation must be independently verified by the verifier before merge.
