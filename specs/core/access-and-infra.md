# Access And Infrastructure Spec

Status: Normative

## Intent

Define the access, Terraform, remote-state, and secret-storage model for this
repo. The governing principle is that **nothing credential-shaped is stored
anywhere**: Terraform state lives in the Orun Cloud HTTP backend under a
declared workspace claim, and every provider credential is brokered per run
from the workspace's own integration connections.

This is what makes the repo a baseline. A product instantiated from it connects
Cloudflare and Supabase in its workspace and has, at that moment, everything its
pipelines need — no cloud account to create, no role to trust, no secret to
seed by hand.

## Golden Path References

- `specs/core/orun-golden-path.md` explains how agents should reason about Orun
  repos.
- `intent.yaml` is the reference for environment shape: `dev`, `stage`, `prod`,
  promotion gates, `parameterDefaults.terraform`, and the workspace claim.
- The published composition stack (`oci://ghcr.io/sourceplane/stack-tectonic`)
  owns the `plan-only` / `apply` profile contracts. Components name a
  composition; they do not describe their own pipeline.
- `infra/terraform/**/component.yaml` and colocated `docs/` are the reference
  for component descriptor and documentation style.

## Agent Access

Agents may assume authenticated access to:

- `gh` for GitHub PRs, checks, logs, and repository inspection.
- `orun`, authenticated headlessly through `ORUN_TOKEN` / `ORUN_TOKEN_FILE`.
- `wrangler` and Supabase tooling only when a task explicitly needs to inspect
  or verify Cloudflare/Supabase resources — and then through credentials
  brokered for that run, never long-lived ones.

A refreshed platform credential arrives at `ORUN_TOKEN_FILE`. Read it; never
copy it (a copied token dies in 15 minutes) and never print any token.

When access is unclear, task agents must pause or record the blocker instead of
inventing account IDs, connection ids, project refs, or secret names.

## Tenancy Boundary

`intent.yaml` declares `execution.state.workspace`. That claim is sent on every
remote operation, including the credential-free CI OIDC exchange, so the
platform can enforce `claim ⊆ authorized`.

Declaring it implies **strict mode**: a non-interactive run that resolves no
workspace fails fast rather than writing into whatever tenant it happens to
reach. A fork that inherits this file and not its own workspace would claim
another tenant's workspace on every remote op, so the scaffold phase rewrites
the claim per product and refuses to guess when no value is supplied.

## CI Secrets And Identity

GitHub Actions authenticate to the platform by OIDC. There are no cloud
credentials in the CI environment and no long-lived secrets at rest.

The baseline CI environment needs:

- `ORUN_BACKEND_URL` for Orun remote execution state.
- GitHub token access supplied by Actions.

Everything else is brokered. Five workspace secrets are created once per
product from its connections — no value is typed, seen, or stored, because each
is a *template* the platform resolves at read time:

| Key | Provider | Template | Resolves to |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | cloudflare | `workers-deploy` | fresh per-run Workers deploy token |
| `CLOUDFLARE_HYPERDRIVE_TOKEN` | cloudflare | `hyperdrive-edit` | fresh per-run Hyperdrive token |
| `CLOUDFLARE_ACCOUNT_ID` | cloudflare | `account-id` | connection fact (non-secret) |
| `SUPABASE_ACCESS_TOKEN` | supabase | `management-access` | fresh per-run management token |
| `SUPABASE_ORG_ID` | supabase | `org-id` | connection fact (non-secret) |

`flows/common/create-secrets.sh <workspace>` creates them and is idempotent:
existing healthy keys are kept, and a key orphaned by a revoked connection is
revoked and recreated against the current one.

Creating them requires an **admin-role** workspace key. Builder and viewer keys
read fine, but their writes return `not_found` — resource-hiding masks the
denial as absence. This is the single most common bootstrap failure, so the
script special-cases the message rather than letting an operator chase missing
scopes.

Secret values must never be committed, echoed in logs, or copied into task
reports. Reports may include secret names and non-secret resource IDs.

## Wiring Documents

Infra components publish their resource identifiers as workspace project
secrets under lease, and consumers resolve them at deploy time. Nothing with a
real resource ID is ever committed.

```text
secret://<workspace>/<project>/<env>/WIRING_<COMPONENT>
```

A component declares what it needs in its own `component.yaml`, so the edge is
visible to `orun plan` instead of buried in a job template:

```yaml
secretEnv:
  WIRING_CLOUDFLARE_HYPERDRIVE_STAGE: "secret://halo/multi-tenant-saas/stage/WIRING_CLOUDFLARE_HYPERDRIVE"
```

Verify lanes render bindings from a committed fixture instead
(`wiring.fixture.json`) and are therefore offline by construction: a pull
request cannot obtain credentials or contact a state backend.

### Worker Runtime Secrets

Runtime secrets consumed by Workers (OAuth client secrets, `OAUTH_STATE_SECRET`,
billing provider tokens, `SECRET_ENCRYPTION_KEY`, the GitHub App bundle) live in
the workspace secret store and are declared as `optionalSecretEnv` references:

```yaml
optionalSecretEnv:
  GITHUB_OAUTH_CLIENT_SECRET: "secret://halo/multi-tenant-saas/{{ .environment }}/GITHUB_OAUTH_CLIENT_SECRET"
```

These are **wire-now, seed-later**: an unseeded key is skipped at resolve, so
the block is inert until a value is stored. That is what lets a freshly
instantiated product deploy before anyone has created its OAuth apps.

The component's `runtimeSecrets` parameter names which of them the deploy lane
pushes to Cloudflare. Cloudflare worker secrets are deploy-time copies only —
write-only, never the source of truth, never read back. A **partial seed
hard-fails** the lane rather than leaving a Worker half-configured.

Config keys are non-secret and may be logged or appear in plan output; secret
keys never are. Instance *branding* constants (product name, CLI binary, sales
email) stay in the source `app-config` seam, and orchestration parameters
(domains, prefixes) stay in `intent.yaml` — neither belongs in a secret store.

## Terraform State

Terraform state lives in the **Orun Cloud HTTP backend**. There is no S3
bucket, no AWS role, and no Terraform workspaces.

Every Terraform component declares an empty backend block:

```hcl
backend "http" {}
```

The runner exports `TF_HTTP_*` per job — the address is
`…/state/tfstate/{component}/{environment}` and the password is the run token —
so the environment is carried in the address rather than in a workspace prefix.
State is scoped by the workspace claim, which is what makes one workspace
unable to read another's.

### Adoption

A component's `adopt.tf` looks the resource up by name at plan time with the
job's brokered credentials and imports it when the platform state does not yet
track it. Fresh products resolve to `id = ""` and create normally; a resource
already in state short-circuits the lookup.

This exists for exactly one case — a create colliding with a resource left by a
previous partial run (Cloudflare's duplicate-title guard, error 10014) — and is
inert everywhere else. It is what makes the infrastructure phase re-runnable
after a failure, which the bootstrap's retry depends on.

## Terraform Components

Infrastructure provisioning must be represented as Orun-discovered Terraform
components under `infra/terraform/**`.

The components:

- `supabase` — creates the `stage` and `prod` projects and publishes their
  credentials as wiring secrets;
- `cloudflare-hyperdrive` — pooled Postgres connectivity for the Workers
  runtime, originating from the connection `supabase` published;
- `cloudflare-kv` — the KV namespace backing edge idempotency and rate limits;
- `cloudflare-domain` — the zone and the per-environment custom-domain attach.

Terraform components must follow the shared component style:

- `spec.type: terraform`
- `spec.domain` aligned with the repo's intent groups
- typed values under `spec.parameters`
- `terraformDir: terraform`
- pinned `terraformVersion`
- `secretOutputs` naming the wiring document the apply publishes
- `secretEnv` naming the brokered credentials the provider authenticates with,
  declared at component level because plan-only lanes refresh against the live
  provider API too, not just apply

## Supabase Ownership

Supabase Postgres is the primary relational database for product-owned state.
Environment projects are created by Terraform through Orun jobs.

- The Supabase **organization comes from the workspace's connection**, resolved
  through the `SUPABASE_ORG_ID` template. It is deliberately not hardcoded: a
  product instantiated from this baseline provisions into whichever org its own
  consent selected.
- `stage` and `prod` each get a separate Supabase project, and therefore a
  separate primary Postgres database. Do not use branches or a shared project
  for these environments.
- `dev` is intentionally not provisioned — it is verify-only by design.
- Project names follow `<repo>-<env>`.
- Project refs are assigned by Supabase during creation and must be recorded as
  non-secret outputs after apply.

The Supabase infrastructure component must:

- generate database credentials through Terraform;
- authenticate through the brokered `SUPABASE_ACCESS_TOKEN`;
- avoid logging generated passwords or API keys;
- publish connection details as a wiring secret under lease;
- expose only non-secret outputs in Terraform outputs and reports.

Supabase project creation is the long pole of the infrastructure phase — budget
five to seven minutes per environment.

## Orun Execution

All infrastructure plan/apply behavior must run through Orun. Direct Terraform,
Supabase, or Wrangler commands in GitHub Actions are prohibited unless they are
emitted by an Orun composition job.

Required validation for infrastructure changes:

```bash
kiox -- orun validate --intent intent.yaml
kiox -- orun plan --intent intent.yaml --view dag
kiox -- orun plan --intent intent.yaml --output plan.json
kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

Use `--changed` when proving PR scoping, and full plans when validating
environment promotion or cross-component dependency behavior.

## Acceptance Criteria

- This repo uses the Orun runtime pinned in `kiox.yaml` (authoritative;
  `kiox.lock` records the resolved digest) and the composition stack pinned in
  `intent.yaml`.
- `intent.yaml` uses the `dev`, `stage`, `prod` environment shape and declares
  the workspace claim.
- Terraform state resolves through the Orun HTTP backend; no component names an
  S3 bucket, an AWS role, or a Terraform workspace prefix.
- A plan and apply for every infra component completes with **no AWS credential
  in the environment**.
- Wiring secrets are published by the infra components and readable by the
  components that declare them.
- Supabase `stage` and `prod` are separate Terraform-created projects in the
  organization the workspace's connection selects, and their generated
  credentials are published as wiring secrets rather than committed.
- CI and local `kiox -- orun ...` behavior are verified from rendered plans, not
  inferred from file names.
- Resource creation or permission changes are verified against live provider
  state before merge.
