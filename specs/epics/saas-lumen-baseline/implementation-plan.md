# saas-lumen-baseline — implementation plan

Status: Normative. Milestone IDs LB0–LB6. Each is one PR with one reviewable
outcome, ordered so every step builds on the last. "Human help" is called out
per milestone; the consolidated register lives in
[`risks-and-open-questions.md`](risks-and-open-questions.md).

Phases:

- **A — Converge the platform posture:** LB0, LB1
- **B — Make every component declare itself:** LB2
- **C — Carry the bootstrap:** LB3
- **D — Say what it is:** LB4, LB5
- **E — Offer it:** LB6

Reference implementation throughout: `sourceplane/lumen` at `baseline-v24`.
Where this plan says "as Lumen does", the intent is to port rather than
reinvent — the divergences that remain are this repo's identity, not its
mechanics.

---

## Phase A — Converge the platform posture

### LB0 — Converge on the Lumen platform posture

**Why now.** Every later milestone edits component manifests and composition
jobs. Doing that while a second, vendored copy of the composition stack exists
in-tree means making each change twice and reconciling them.

**Scope.**
- Adopt the published composition stack: `intent.yaml` `compositions.sources`
  becomes `kind: oci`, `ref: oci://ghcr.io/sourceplane/stack-tectonic:0.18.2`,
  matching the pin Lumen runs. Pin an explicit version — a bare repository
  reference resolves to `:latest`, letting a catalog release change this repo's
  execution contracts with no commit here.
- Delete `stack-tectonic/` (the vendored copy) once the OCI pin resolves the
  same composition set. Confirm binding-for-binding before deleting, not after.
- Delete `tooling/secrets-sync/` and `tests/secrets-sync/` (design §1.5). Mark
  `specs/epics/saas-secrets-sync/` **Closed — superseded**, recording the
  reasoning in that epic's own `IMPLEMENTATION-STATUS.md`.
- Delete `infra/terraform/bootstrap/` — it provisions the AWS state backend and
  Secrets Manager namespace that LB1 removes from the loop.
- Delete `tooling/fork/components.mjs`. Its prerequisite graph and copy ordering
  become `dependsOn` edges in `repo-blueprint.yaml` (LB3); keeping both means
  two orderings that can disagree.

**Done when.** `orun plan` resolves every component through the OCI stack with
no composition-not-found, the deleted directories have no remaining referents
(`grep` clean across `intent.yaml`, manifests, CI, and specs), and the verify
lanes are green.

**Human help.** GHCR package read access for the CI identity, if not already
granted.

**Risk.** The OCI stack at `0.18.2` may not carry a composition the vendored
copy had. Check before deleting; if one is genuinely missing, that is a
stack-tectonic release, not a reason to keep the vendored tree.

---

### LB1 — Brokered credentials + Orun state backend (keystone)

**Why now.** This is the milestone that makes the repo instantiable at all
(design §1.1). Nothing after it can be proven without it, and a `flows/`
directory landed before it would be a bootstrap that cannot bootstrap.

**Scope.**
- `intent.yaml` `execution.state`: point at the Orun Cloud backend, declare the
  workspace claim, `requireOrg: true`, `autopushCatalog: true`. Declaring the
  claim implies strict mode — a non-interactive run that resolves no workspace
  fails fast rather than writing into the wrong tenant.
- Terraform components (`supabase`, `cloudflare-hyperdrive`, `cloudflare-kv`,
  `cloudflare-domain`): drop the AWS backend and the `awsAccountId` /
  `awsRegion` parameters; publish wiring as **workspace project secrets under
  lease** instead of `aws_secretsmanager_secret` resources.
- Add `adopt.tf` to `cloudflare-kv`, `cloudflare-hyperdrive`, and `supabase`
  (design §1.6) so a re-run after partial failure imports rather than collides.
- `infra/db-migrate`: read Supabase credentials from workspace secrets.
- Remove the AWS steps from the deploy path now that no lane reads Secrets
  Manager.

**Done when.** A plan and apply for every infra component completes with **no
AWS credential in the environment**; wiring secrets are published and readable
by their consumers; `grep -ri "secretsmanager\|AWS_REGION\|awsAccountId"`
returns nothing outside history and archived specs.

**Human help.** A workspace with Cloudflare and Supabase connected, and an
admin-role key to create the brokered secrets (design §1.3).

---

## Phase B — Make every component declare itself

### LB2 — Component contract parity

**Why now.** LB3's blueprint slices are built from the dependency graph, and
LB4's docs are reachable only if the manifests register them. Both read what
this milestone writes.

**Scope.** For every component manifest (`apps/*`, `packages/*`, `tests/*`,
`infra/*`):
- A `docs:` block naming `docs/overview.md` plus `architecture` and `runbook`
  pages. The files arrive in LB4; the registration is the contract.
- `dependsOn` edges for **bundled workspace packages**. Without them
  `orun plan --changed` keys on `path:` alone and a Worker can ship a
  months-old copy of a package that has since changed underneath it. This is a
  correctness fix, not bookkeeping.
- `secretEnv` wiring entries replacing Secrets Manager reads (design §1.4).
- Drop the `awsAccountId` / `awsRegion` parameters.

**Done when.** `orun plan --view dag` shows the bundle edges; a change to
`packages/contracts` marks every bundling Worker changed; no manifest names an
AWS parameter.

**Human help.** None.

---

## Phase C — Carry the bootstrap

### LB3 — The baseline machinery

**Why now.** Everything it needs now exists: a workspace-claimed state backend,
brokered credentials, and manifests that declare their real edges.

**Scope.**
- `flows/` ported from Lumen and retargeted to `sourceplane/multi-tenant-saas`:
  `phases/00-all` … `phases/08-docs`, `common/` (the twelve shared scripts),
  `agent/BASELINE-TASK.md`, `AGENT-PROMPT.md`, `testing/`.
- `repo-blueprint.yaml` — this repo as a source for new ones: inputs, rebrand
  map, copy DAG, exclusions (design §2.1, §2.5).
- `blueprint.yaml` — the card the bootstrap door reads.
- `tooling/blueprint/split-phases.py` — derives the eight phase slices from
  `repo-blueprint.yaml`. Phase slices are generated, never hand-edited.
- `BOOTSTRAP.md` — the operator's front door for instantiation.
- Retarget every `sourceplane/lumen` reference: the `ORUN_FLOW_SOURCE_REPO`
  fallback in each phase workflow, and the documented remote-reference commands.

**Done when.** `python3 tooling/blueprint/split-phases.py repo-blueprint.yaml
flows/phases` regenerates the committed slices byte-identically; every phase
runs under `--set dryrun=true` without side effects; no `sourceplane/lumen`
reference remains outside prose that is deliberately citing Lumen.

**Human help.** None (dry runs only; the live rehearsal is LB6).

---

## Phase D — Say what it is

### LB4 — Component docs trio

**Why now.** LB2 registered the pages; a manifest pointing at a missing file is
worse than one that points at nothing.

**Scope.** For every component, three documents in three distinct voices:

- `docs/overview.md` — what this component is for, and its place in the
  platform. Written for someone who has not seen it before.
- `docs/architecture.md` — how it is built: boundaries, dependencies, the
  decisions that constrain change.
- `docs/runbook.md` — how to operate it: deploy, verify, diagnose, roll back.

Plus `ai/context/deployment.md` and `ai/context/operations.md` as the seeded
targets phase 08 fills from probed state.

**Done when.** Every `docs:` block resolves; each document is written from the
component's actual code rather than a template with the name substituted — a
runbook that says "restart the service" for a Worker is a failed milestone.

**Human help.** None.

---

### LB5 — The front door

**Scope.**
- `README.md` rewritten to lumen grade: a `<!-- 08-docs -->` live-deployment
  block, an "Instantiating products" section pointing at `BOOTSTRAP.md`, and a
  status section that matches what the repo actually does after LB0–LB4.
- `FORKING.md` reconciled: the phased bootstrap is the supported path. What
  survives is the part no script performs — cloud accounts, OAuth apps, the
  operator checklist. The mechanical-rename instructions are superseded by the
  blueprint's rebrand hook and are removed rather than left as a second,
  diverging path.
- `specs/epics/README.md` register row and `specs/roadmap.md` entry.

**Done when.** No document describes a path the repo no longer supports.

**Human help.** None.

---

## Phase E — Offer it

### LB6 — Register, release, and prove

**Scope.** In `sourceplane/orun-cloud`:
- `apps/agents-worker/src/blueprints.ts` — the registry entry. The console's
  `/baselines` gallery renders from this, so the catalog item follows.
- `apps/website-orunbase/baselines/data.mjs` — the public catalog entry, and
  the hand-authored landing teaser in `public/index.html` that `build.mjs`
  cross-checks. A tag or duration right in one place and stale in the other
  fails the website's verify lane by design.
- Regenerate `public/baselines/`.

In this repo:
- Tag `baseline-v1` — the pinned ref the bootstrap runs. Never a branch.
- Link the repo to the target workspace's allow-list.

**Done when.** `/baselines` offers the baseline, its readiness check passes for
a workspace with Cloudflare and Supabase connected, and an instantiation into a
fresh workspace reaches a live console.

**Human help.** **Yes** — a workspace with both integrations connected, and an
operator to run the instantiation this milestone is verified by.

**Note on the residual gap.** CI plans on changed components, so bumping the
registry tag in `agents-worker` without touching the website app will not
schedule the cross-check. The generated pages carry the tag, so a mismatch
surfaces on the next website change. Closing it properly needs the registry and
the catalog to share one source — a follow-up, recorded in
`risks-and-open-questions.md`, not something this epic invents a second
mechanism for.
