# Waiting For Input

## Context

No human input is currently requested.

## Ready To Proceed

Task 0083 Implementer is **complete** on branch
`impl/task-0083-domain-cutover` (PR **#129**, head
`28da48896cc3278cceae50dc83d28db676d0c0fa`). PR CI run `26631953781`
is in flight at orchestration time (16 pass / 17 pending / 0 fail) —
the `web-console-next.{dev,stage,prod} · Verify deploy` and
`cloudflare-domain.{stage,prod} · Terraform` jobs are the load-bearing
gates and have not finished yet.

Implementer scope landed cleanly: `cloudflare_pages_domain.console`
swapped for `cloudflare_workers_domain.console` (v4 resource name,
cloudflare provider pin bumped `~> 4.30` → `~> 4.52`), `dependsOn`
flipped from `web-console` to `web-console-next`, `apps/web-console/`
tree deleted, api-edge CORS scrubbed of legacy `*.pages.dev` console
origins, spec/README sweep complete. `pagesProjectPrefix` kept
read-only for one soak cycle. Implementer report on the PR branch at
`ai/reports/task-0083-implementer.md`.

Task 0083 **Verifier** is scoped at `ai/tasks/task-0083-verifier.md`.
It must:
1. Confirm the PR-boundary match (no `apps/web-console-next/**`
   change, no `intent.yaml` change, no migration/worker/policy churn).
2. Drive PR CI `26631953781` (or successor) to 33/33 SUCCESS.
3. Run local Orun (`validate` / `plan --changed` / `run --dry-run`)
   and Terraform (`fmt -check` / `init -backend=false` / `validate`)
   gates on the PR head.
4. Merge PR #129 (squash) when green.
5. Run the mandatory post-merge soak per the
   `post-merge-deploy-profile-gap` skill: Terraform apply logs show
   `cloudflare_workers_domain.console` creation + Pages-domain destroy
   on both stage and prod; `curl -sfL` against
   `https://{stage,prod}.sourceplane.ai/` returns 200 with body
   containing `Sourceplane Console`; CORS preflight from
   `https://stage.sourceplane.ai` to `api.stage.sourceplane.ai`
   returns the matching `access-control-allow-origin`; the
   `*.rahulvarghesepullely.workers.dev` shadow hostnames still serve
   200 as the rollback hatch.
6. Write `ai/reports/task-0083-verifier.md`, sync local `main`, and
   commit the state-file close-out (`state.json`, `current.md`,
   `task-ledger.md`, this file) directly to `main`.

## Needed To Continue

Nothing blocking. The verifier agent may proceed.
