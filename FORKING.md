# Operator checklist — what no script can do

The mechanical part of instantiating this baseline is **not** here any more.
Creating the repo, copying the tree, renaming every identity literal and
re-tenanting the workspace claim are the blueprint's job, run by the phased
bootstrap: start at **[BOOTSTRAP.md](BOOTSTRAP.md)**.

What remains is what a script genuinely cannot perform on your behalf — cloud
accounts and consents, OAuth applications, billing products, DNS — plus the
first-boot behaviour worth knowing before you meet it at 2am.

> Superseded and removed: the hand-run rebrand script invocation (now the
> blueprint's `rebrand` hook, which also re-tenants the `secret://` workspace
> segment a manual run would miss) and the per-component incremental fork
> tool (its prerequisite graph and copy ordering are now `dependsOn` edges in
> `repo-blueprint.yaml`, so one ordering exists instead of two that can
> disagree).

## 1. Operator checklist (per instance, by design)

Nothing here can be scripted from inside the repo; budget a working session
with the right account owners. Track progress in your generated
`ai/context/fork-from-baseline.md`.

- [ ] **GitHub Actions secrets**: `CLOUDFLARE_ACCOUNT_ID`,
      `CLOUDFLARE_API_TOKEN` (Workers+KV+Hyperdrive+DNS scopes),
      `SUPABASE_API_KEY`, **`SUPABASE_ORG_ID`** (the `supabase` Terraform
      reads it as `TF_VAR_supabaseOrgId` to create the projects; the first
      `supabase` apply fails without it).
- [ ] **Cloudflare account**: its own account is cleaner, but reusing the
      baseline's is now safe — `rebrand.mjs` brand-prefixes every worker name
      and the KV title self-brands (§2), so a fork no longer overwrites the
      baseline's live workers.
- [ ] **AWS** (via the org's `aws-admin` repo): GitHub-OIDC roles
      `<env>-github-<org>-<repoName>-{plan,production-deploy}` per
      environment, plus Secrets Manager write scope `<org>/<repoName>/*`.
      State buckets are shared org infra and already exist.
- [ ] **Supabase**: org access for the management token. The
      `<repoName>-stage` / `<repoName>-prod` projects are created by the
      `supabase` Terraform component on first apply — no manual creation.
- [ ] **Cloudflare**: account + real `workersDevSubdomain` (put it in the
      values file before rebranding, or rerun with it set), zone for
      `productDomain`, DNS delegation; `stage.<domain>`/`prod.<domain>`
      attach via the `cloudflare-domain` component.
- [ ] **OAuth apps** (GitHub + Google, per env): set the client IDs in
      `apps/identity-worker/wrangler.template.jsonc` vars (the committed
      baseline IDs are the baseline's; they are non-secret but useless to
      you) and load the secrets with `wrangler secret put`.
- [ ] **GitHub Apps** for the integrations cluster (per-env registration;
      see `specs/epics/saas-integrations/`).
- [ ] **Billing**: Polar (or Stripe) products and the env secrets the
      billing-worker expects.

## 2. First-boot expectations (learned the hard way)

- PR (verify) lanes plan Terraform only. The `cloudflare-hyperdrive` plan is
  **red on PRs until the first `main` apply** has written the Supabase
  credentials document to Secrets Manager. Expected; it converges after the
  first merge.
- After that first apply, workers deploy with bindings resolved from the
  wiring manifest — there are no committed resource IDs anywhere (BF6), so a
  fresh account needs no hand-pasted Hyperdrive/KV IDs.
- **Re-run the full workflow**, never "re-run failed jobs": orun's remote
  state keys on `<run>-<attempt>` and a partial re-run deadlocks.
- **Keep PRs to a few components.** Fleet-wide PRs fan out 30–70 CI jobs and
  starve the runner pool (the first instantiation split its rollout into
  four PRs for this reason). A batch of ~12–18 jobs (4–5 components) converges
  reliably; bring components up in dependency order (see the recovery playbook
  below). To re-converge a component without a code change, append a one-line
  `# ci: <reason> (<timestamp>)` comment to its `component.yaml` — orun's
  change-scoped planner re-plans only the touched components.
- **The console already declares `dependsOn: api-edge`.** Its deploy smoke
  curls `<brand>-api-edge-<env>/health`; the edge (in
  `apps/web-console-next/component.yaml`) keeps its deploy lane ordered after
  api-edge so the smoke does not race a 404.
- **`dev` lanes for data-bound workers are expected red.** `dev` has no
  Supabase/Hyperdrive/KV wiring, so the `*-dev` verify/deploy lanes for workers
  that need the data layer fail by design. Judge bring-up by `stage`/`prod`.
- `stage`/`prod` converge on merge to `main` behind `requireApproval: true`
  — someone has to approve the deploy lanes.

### Bootstrapping the service-binding cycle (two-pass)

The `{billing, membership, events, notifications}` cluster (§3) cannot deploy
on a fresh account: each worker binds another that does not exist yet, and
Cloudflare rejects the deploy (`10143`). Re-running does not help.
`tooling/bootstrap/cycle-break.mjs` automates the two-pass fix:

1. **Strip the feedback edges** — `node tooling/bootstrap/cycle-break.mjs
   --strip`. This removes the two minimal feedback bindings (`billing →
   membership`, `membership → notifications`, the edges in
   `ACKNOWLEDGED_BINDING_CYCLES`), replacing each with a self-describing
   marker. Commit, trigger the four cluster components, and merge — they now
   deploy in order `policy → billing → membership → events → notifications`.
2. **Restore the edges** — `node tooling/bootstrap/cycle-break.mjs --restore`,
   then commit + merge. `membership` and `notifications` now exist, so
   Cloudflare accepts the restored bindings; only `billing` + `membership`
   redeploy. `--restore` reproduces the templates byte-for-byte, so the cluster
   is back to its exact original topology. (`--check` reports current state.)

These are deploy-config bindings only — the worker `Env` types and the
(fetcher-mocking) tests are unaffected, and the `deployment-config` cycle test
only shrinks its checked set in pass 1.

### Recovering a partially-failed fleet convergence

When a large convergence partially fails (timeouts / runner starvation),
recover in small dependency-ordered batches rather than re-running the whole
fleet:

1. Identify what actually deployed (worker `/health`, Terraform state).
2. Re-trigger the rest layer by layer, one PR each: **infra → leaf workers
   (policy, admin) → the cycle cluster via the two-pass above →
   membership-dependents (config, metering, webhooks, projects, identity) →
   `api-edge` → console**. Each layer's dependencies must be live before it.
3. Verify each layer (`<brand>-api-edge-<env>/health` returns `ok`, including
   its database check) before starting the next.

## 3. Upstream syncs

A snapshot fork has no shared git history: sync by cherry-picking content
and re-recording it in `ai/context/fork-from-baseline.md`. The longer-term
answer (blueprint/instantiator with provenance lock and `factory upgrade`)
is specced as BF11–BF14 in `specs/epics/saas-bootstrap-factory/`.
