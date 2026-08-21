# Epic: saas-lumen-baseline

**Make this repo a baseline the platform can build from.** Raise
`multi-tenant-saas` to the bar Lumen already meets — a repo that carries its
own bootstrap, births a live product from two tokens in about an hour, and is
registered in Orun Cloud so an operator can pick it off `/baselines` and watch
an agent build it.

## Status

| Field | Value |
|-------|-------|
| Status | **In progress** |
| Cluster | **LB** (LB0–LB6) |
| Owner(s) | `flows/` (new), `infra/terraform/*`, all `component.yaml` surfaces, `intent.yaml`, `specs/`, and `sourceplane/orun-cloud` (registration) |
| Target branch | `main` |
| Builds on | [`saas-bootstrap-factory/`](../saas-bootstrap-factory/) (BF0–BF6 shipped here), `sourceplane/lumen` (the proven implementation) |
| End-state target | A live product instantiated into a fresh workspace from `/baselines → multi-tenant-saas`, headless, with no step this repo cannot perform |

## Thesis

`saas-bootstrap-factory` got the hard half right: identity is config, binding
IDs are resolved at deploy time, and the dependency DAG is real (BF0–BF6). What
it never reached was phases D–E — the Blueprint contract, the instantiator, and
a proven rehearsal. In the meantime **Lumen shipped exactly that**, forked from
this repo, and proved it end to end on `nimbus`, `vela`, and `ambient`.

So this epic does not design an instantiator. It **adopts the one that works**
and closes the gap that makes this repo unable to run it.

That gap is not the bootstrap machinery — porting `flows/` is mechanical. It is
the **credential and state posture underneath it**. This repo still writes its
wiring and escrow documents to AWS Secrets Manager and keeps Terraform state on
an AWS backend. Both are account-bound: a fresh workspace has neither, and no
consent an operator can give in the console creates them. Lumen's posture —
Terraform state in the Orun Cloud HTTP backend, provider credentials **brokered
per run** from the workspace's own Cloudflare and Supabase connections, wiring
published as workspace secrets — is what makes a bootstrap possible at all.

Hence the order below: posture first, machinery second, catalog last. A `flows/`
directory landed before LB1 would be a bootstrap that cannot bootstrap.

## Scope decisions

Two questions were settled before work started, and they shape every milestone:

- **Position: match Lumen exactly.** This repo vendored the composition stack
  in `stack-tectonic/` while Lumen consumes it as a pinned OCI artifact. The
  vendored copy is dropped and the OCI pin adopted. Two baselines that differ
  only in how they obtain their CI compositions is a distinction operators
  cannot act on, and a second copy of the stack is a second thing to patch.
- **`tooling/secrets-sync` is dropped from the baseline.** Its manifest, drift
  detector, and sync path are built on the AWS Secrets Manager escrow that LB1
  removes. Retargeting it at the workspace secret store is real work with no
  consumer once wiring is brokered; the `saas-secrets-sync` epic is closed as
  superseded rather than carried forward as dead machinery a fork would inherit
  pointed at an account it does not have.

Neither is a judgement that the dropped work was wrong. Both were correct for a
single instance bound to one AWS account; neither survives contact with a repo
whose whole purpose is to be instantiated into accounts it has never seen.

## What "Lumen grade" means, concretely

Six properties, each a milestone's acceptance test:

1. **Provider credentials are brokered, never stored.** No AWS account in the
   loop, no long-lived secret at rest, state in the Orun backend under a
   declared workspace claim.
2. **Every component declares its docs and its real edges.** A `docs:` block,
   `dependsOn` edges for bundled workspace packages, and `secretEnv` wiring
   read from workspace secrets rather than Secrets Manager documents.
3. **The repo carries its own bootstrap.** Eight idempotent phase workflows,
   the shared scripts they compose, and a blueprint that describes this repo as
   a source for new ones.
4. **Every component is documented in three registered voices** — overview,
   architecture, runbook — reachable from the component manifest.
5. **The front door tells the truth**, including what is live, generated from
   probed state rather than intent.
6. **The platform can offer it.** Registered in the blueprint registry, present
   on the public catalog, pinned to a release tag.

## Read order

1. `README.md` (this file) — thesis, scope decisions, milestones at a glance.
2. [`design.md`](design.md) — the posture migration and the blueprint model
   (the normative detail; read before touching `infra/` or `flows/`).
3. [`implementation-plan.md`](implementation-plan.md) — LB0–LB6 with scope and
   "done when".
4. [`risks-and-open-questions.md`](risks-and-open-questions.md) — the decision
   points, and the human-help register.
5. [`IMPLEMENTATION-STATUS.md`](IMPLEMENTATION-STATUS.md) — as-built.

## Milestones at a glance

| ID | Milestone | Human help? | Status |
|----|-----------|-------------|--------|
| LB0 | Converge on the Lumen platform posture (OCI stack, drop vendored + superseded machinery) | No | 🗓️ Planned |
| LB1 | Brokered credentials + Orun state backend (the keystone) | Workspace integration consents | 🗓️ Planned |
| LB2 | Component contract parity: `docs:`, bundle edges, `secretEnv` wiring | No | 🗓️ Planned |
| LB3 | The baseline machinery: `flows/`, blueprints, `BOOTSTRAP.md` | No | 🗓️ Planned |
| LB4 | Component docs trio for every component | No | 🗓️ Planned |
| LB5 | Front door: README, `FORKING.md` reconciliation, live-deployment block | No | 🗓️ Planned |
| LB6 | Register in Orun Cloud, tag `baseline-v1`, verify an instantiation | **Yes — a workspace with Cloudflare + Supabase connected** | 🗓️ Planned |

LB1 is the keystone in the same sense BF6 was: everything after it is
mechanical, and nothing before it can be proven.
