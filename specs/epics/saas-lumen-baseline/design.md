# saas-lumen-baseline — design

Status: Normative. Read before changing `infra/`, `intent.yaml`, or adding
`flows/`.

Two designs live here because they are the two things this epic actually
decides. Everything else — docs, README, catalog rows — follows from them.

1. [The credential and state posture](#1-the-credential-and-state-posture) (LB1)
2. [The blueprint and bootstrap model](#2-the-blueprint-and-bootstrap-model) (LB3)

---

## 1. The credential and state posture

### 1.1 What is there today, and why it cannot bootstrap

Three account-bound dependencies, all invisible until a fork tries to run:

| Surface | Today | Bound to |
|---|---|---|
| Terraform state | AWS backend, `region` parameter, `awsAccountId` per component | One AWS account |
| Wiring documents (Hyperdrive/KV IDs, Supabase URLs) | `aws_secretsmanager_secret` resources written by Terraform, read back by the deploy lane | The same AWS account |
| Runtime secret escrow | `worker-secrets__<env>` documents in Secrets Manager, synced by `tooling/secrets-sync` | The same AWS account |

An operator instantiating this baseline connects **Cloudflare and Supabase** in
their workspace. That is the whole consent surface the console offers. Nothing
in it produces an AWS account, an IAM role, an S3 bucket, or a Secrets Manager
namespace — so every one of the three rows above is a step the bootstrap would
have to ask a human to perform out of band, in an account they may not have.

This is not a gap that better documentation closes. It is the reason this repo
is not a baseline.

### 1.2 The target posture

Lumen's, adopted wholesale:

| Surface | Target | Bound to |
|---|---|---|
| Terraform state | Orun Cloud HTTP state backend, keyed by the workspace claim in `intent.yaml` | The workspace |
| Provider credentials | **Brokered per run** — `orun integrations <provider> secret create` mints a fresh, narrowly-scoped token from the workspace's connection at the moment a lane needs it | The workspace's connection |
| Wiring documents | Published as workspace **project secrets** by the infra components under lease; read via `secretEnv: secret://…` in each consumer's manifest | The workspace |
| Runtime secret escrow | Removed (see §1.5) | — |

The property that matters: **nothing credential-shaped is stored anywhere.**
A brokered token is minted for one run and expires; a revoked connection makes
its derived secrets `orphaned` rather than leaving a working credential behind.

### 1.3 The five brokered secrets

`flows/common/create-secrets.sh` creates exactly these from the workspace's
connections. No value is typed, seen, or stored — each is a *template* the
platform resolves at read time:

| Key | Provider | Template | Resolves to |
|---|---|---|---|
| `CLOUDFLARE_API_TOKEN` | cloudflare | `workers-deploy` | fresh per-run Workers deploy token |
| `CLOUDFLARE_HYPERDRIVE_TOKEN` | cloudflare | `hyperdrive-edit` | fresh per-run Hyperdrive token |
| `CLOUDFLARE_ACCOUNT_ID` | cloudflare | `account-id` | connection fact (non-secret) |
| `SUPABASE_ACCESS_TOKEN` | supabase | `management-access` | fresh per-run management token |
| `SUPABASE_ORG_ID` | supabase | `org-id` | connection fact (non-secret) |

Creation requires an **admin-role** workspace key. Builder and viewer keys read
fine and their writes come back `not_found` — resource-hiding masks the denial,
so the script names this explicitly rather than letting an operator chase
missing scopes. This is the single most common bootstrap failure and it is
worth the special-cased error message.

### 1.4 Wiring: from Secrets Manager documents to workspace secrets

The BF5/BF6 design is unchanged in shape — infra publishes, consumers resolve at
deploy time, nothing is committed. Only the **store** changes:

```
before:  terraform → aws_secretsmanager_secret  → deploy lane reads via `aws secretsmanager get-secret-value`
after:   terraform → orun secret (lease-published) → manifest `secretEnv: secret://<ws>/<project>/<env>/WIRING_*`
```

Each consumer declares what it needs in its own `component.yaml`, so the edge is
visible to `orun plan` instead of living in a job template:

```yaml
secretEnv:
  WIRING_CLOUDFLARE_HYPERDRIVE_STAGE: "secret://multi-tenant-saas/multi-tenant-saas/stage/WIRING_CLOUDFLARE_HYPERDRIVE"
  WIRING_CLOUDFLARE_HYPERDRIVE_PROD:  "secret://multi-tenant-saas/multi-tenant-saas/prod/WIRING_CLOUDFLARE_HYPERDRIVE"
```

### 1.5 Why the runtime escrow is removed rather than migrated

`tooling/secrets-sync` solved a real problem: the fleet's runtime secrets
(OAuth client secrets, the Polar token) had no single write path, and drift
between manifest and deployed reality was undetectable.

It solved it **in AWS Secrets Manager**, which LB1 removes from the loop. The
options were to retarget it at the workspace secret store or to drop it. It is
dropped, because:

- The secrets it manages are the *credential-blocked tail* — OAuth apps, Polar,
  Stripe. A freshly instantiated product has none of them; they arrive when an
  operator creates those apps, long after bootstrap.
- Its value is drift detection against a manifest. The workspace secret store is
  already the single write path, so the manifest would describe what the store
  already enumerates.
- Carrying it forward means every fork inherits tooling pointed at an AWS
  account it does not have, failing in a way that reads like a bug.

`specs/epics/saas-secrets-sync/` is marked **Closed — superseded by LB1**, with
this reasoning recorded there rather than only here. The escrow *contract* it
established (a partial seed hard-fails rather than half-configuring a Worker)
is preserved in the deploy lane and is not up for renegotiation.

### 1.6 `adopt.tf` — instantiation into accounts that are not empty

A fresh Cloudflare account may already carry a KV namespace or a Hyperdrive
config with the name Terraform wants, most often from a previous failed attempt.
A bare `create` fails on the collision and the phase cannot self-heal.

Each Terraform component gains an `adopt.tf` that imports a pre-existing
resource by name into state before planning to create it, making the
infrastructure phase re-runnable after a partial failure — the property phase
04 depends on when it retries.

---

## 2. The blueprint and bootstrap model

### 2.1 Two manifests, two audiences

They are easy to confuse and do different jobs:

- **`blueprint.yaml`** — the *card*. Small, presentational: display name,
  tags, required integrations, which inputs the console asks for versus which
  the agent asks for, and where the brief and umbrella live. This is what the
  bootstrap door reads.
- **`repo-blueprint.yaml`** — the *machine*. This repo described as a source
  for new ones: inputs, the rebrand map, the file-copy DAG with `dependsOn`
  edges, and per-phase slices. `tooling/blueprint/split-phases.py` derives the
  eight per-phase `blueprint.yaml` files from it, so a phase slice is never
  hand-edited.

### 2.2 The phase contract

Eight workflows, one contract each, all idempotent:

> **apply the blueprint slice → land it as a PR (merged immediately — the
> convergence is the gate) → watch the convergence, auto-resuming through
> transient failure → verify the result independently.**

| # | Phase | Lands | Verified by |
|---|---|---|---|
| 01 | scaffold | repo created; intent, CI, flows, tooling, identity | pushed + workspace-linked |
| 02 | foundation | the nine shared packages | verify lanes green |
| 03 | infrastructure | kv, supabase, hyperdrive, db-migrate | `WIRING_*` / `SUPABASE_*` published |
| 04 | workers | the twelve-worker fleet | convergence green, bindings restored |
| 05 | edge | api-edge | `/health` 200 on stage + prod |
| 06 | console | the Next.js console | console + edge live |
| 07 | domain | custom domain (optional) | convergence green |
| 08 | docs | live-deployment docs | committed manifest matches probed reality |

Phase 01 takes the product identity once and writes `.rebrand/values.json`;
every later phase reads it back and needs only `out`, `workspace`, and
optionally `dryrun`.

### 2.3 Why phases rather than one run

A single-run bootstrap was tried in Lumen and removed. Three reasons, all of
which apply here unchanged:

- **Resumability.** Supabase project creation takes five to ten minutes per
  environment and fails for reasons outside the repo (org capacity, provider
  incidents). A phase that failed partway resumes by re-running it; a monolith
  restarts.
- **Verification granularity.** "The console is live" is provable. "The
  bootstrap worked" is not, until every phase has asserted its own postcondition
  over HTTP.
- **Pacing.** An operator can run phase 03 today and phase 04 next week. Nothing
  expires between phases because each one re-verifies workspace readiness in its
  own preflight.

`00-all` is the umbrella that runs the sequence unattended, with per-phase
retry and an independent final verification. It resumes from a checkpoint when
the working directory survived, and **by probing reality** — repo content on
`main`, published wiring secrets, live endpoints — when it did not, so a fresh
container resumes as well as a warm one.

### 2.4 The redeploy marker, and why it is not a hack

CI plans on `--changed`. Re-applying identical content after a failed
convergence therefore yields an **empty plan** and deploys nothing — leaving
whatever the failed attempt left undeployed permanently undeployed, through
unlimited restarts.

Retries stamp a `# ci:` marker comment onto the phase's components to force them
into the changed set. It looks like a smell and is in fact the load-bearing
mechanism that makes retry work at all; removing it produces a bootstrap that
silently converges to a partial fleet.

### 2.5 What ships to a product, and what does not

Products receive **product-only content**: source, infra, CI, configs, and
their own docs. None of this baseline's machinery ships — not `flows/`, not the
rebrand tooling, not `ai/` state, not the forking docs — and nothing in a
product presents it as a copy of anything. A product's docs speak only about
that product.

The derived-output exclusion set (`node_modules`, `dist`, `.turbo`, build
artifacts) is declared in `repo-blueprint.yaml` rather than assumed, so the
copy is reproducible and Orun's core stays ecosystem-neutral: it excludes
exactly what the blueprint names, nothing more.
