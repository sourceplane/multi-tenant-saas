# saas-lumen-baseline — implementation status (as-built)

What actually shipped, kept distinct from the plan. Updated as each milestone
lands, not in advance of it.

| ID | Milestone | Status | Notes |
|----|-----------|--------|-------|
| LB0 | Converge on the Lumen platform posture | ✅ Shipped | Folded into LB1 — see below. |
| LB1 | Brokered credentials + Orun state backend | ✅ Shipped | Keystone. Verified against real providers (see *Evidence*). |
| LB2 | Component contract parity | ✅ Shipped | `docs:` registration moved to LB4 so blocks and files land together. |
| LB3 | The baseline machinery | ✅ Shipped | Plus a re-tenanting bug the reference implementation has. |
| LB4 | Component docs trio | ✅ Shipped | Generated, not hand-written; CI-verified. |
| LB5 | The front door | ✅ Shipped | `FORKING.md` reduced to what no script can do. |
| LB6 | Register, release, and prove | 🛠️ In progress | Registration open as orun-cloud#992; tag and instantiation pending. |

## Deviations from the plan, and why

**LB0 could not be separated from LB1.** The plan had them as two PRs. They are
one interlocked system: the deploy lane's secrets step calls
`tooling/secrets-sync/assemble.mjs` *by path*, `supabase` declared
`dependsOn: bootstrap`, and the composition's parameter contract is what made
`secretsWorker` meaningful — the published stack expects `runtimeSecrets` plus
`optionalSecretEnv` instead. Flipping to the OCI stack is what makes all of them
removable at once; splitting it would have left the deploy lane broken in
between.

**`tooling/fork/` deletion moved from LB0 to LB5**, so it lands with the
`FORKING.md` rewrite that describes it rather than leaving a document pointing
at a script that no longer exists.

**`docs:` registration moved from LB2 to LB4**, so the blocks and the files they
point at land together instead of leaving dangling pointers across two PRs.

## Beyond parity

Three things the reference implementation gets wrong that were not carried over:

1. **Component docs are generated** (`tooling/docs/render-component-docs.py`)
   rather than committed by hand, and `--check` runs in the plan job. The
   reference implementation's are static, so its dependency sections drift
   silently — a stale doc still renders.
2. **Its generated test pages read `Verification suite for `None``** — the
   target was never resolved. Derived here from the naming convention.
3. **The `secret://` workspace segment was only re-tenanted when the workspace
   happened to be named after the repo.** The reference regex anchors on
   `secret://<ws>/<repo>/`, but the repo slug is already renamed by the time
   that pass runs, so the pattern misses and the fork keeps the baseline's
   workspace — every secret read then fails with "Validation failed", long
   after the rebrand looked clean. Fixed by matching the workspace segment
   alone, adding `orunWorkspaceSlug` as a blueprint input, and having the
   scaffold resolve it from the workspace id. Verified across three cases:
   different workspace, same workspace, and no slug supplied.

## Evidence

From the LB1 CI run against workspace `ws_NDEXCDQS` (slug `halo`), with **no
AWS credential in the environment**:

| Component | stage | prod | What it proves |
|---|---|---|---|
| `cloudflare-kv` | ✅ | ✅ | brokered Cloudflare credentials authenticate against the live API |
| `supabase` | ✅ | ✅ | brokered Supabase management token authenticates against the live API |

Every remaining lane failed on `secret resolution failed: Secret not found`,
resolving `WIRING_*`. That is not a defect in the migration: wiring documents
are published by an infra **apply**, and this workspace has never had one. It
is the state a fresh bootstrap starts from, and the phase order (03
infrastructure before 04 workers) exists to sequence exactly it.

**Open consequence, unresolved:** this repo's own verify lanes stay red until
its infrastructure is applied once into `halo`, which provisions live Supabase
projects and a Hyperdrive config. Merging to `main` would perform that apply,
since `requireApproval` is now `false`. That is a decision for the owner of
those accounts, not one this epic takes on its own.

## Measured facts

Filled by LB6. Until then the registry carries Lumen's figures, recorded as
risk R5 rather than presented as measurement.

| Fact | Value | Source |
|------|-------|--------|
| End-to-end wall clock | _not yet measured_ | LB6 instantiation |
| Per-phase durations | _not yet measured_ | LB6 instantiation |
| Release tag | _not yet cut_ | LB6 |
