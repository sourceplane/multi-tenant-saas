# saas-lumen-baseline — implementation status (as-built)

What actually shipped, kept distinct from the plan. Updated as each milestone
lands, not in advance of it.

| ID | Milestone | Status | Notes |
|----|-----------|--------|-------|
| LB0 | Converge on the Lumen platform posture | ✅ Shipped | Folded into LB1 — see *Deviations*. |
| LB1 | Brokered credentials + Orun state backend | ✅ Shipped | Keystone. Two follow-up fixes; see *Corrections*. |
| LB2 | Component contract parity | ✅ Shipped | `docs:` registration moved to LB4 so blocks and files land together. |
| LB3 | The baseline machinery | ✅ Shipped | Plus two re-tenanting bugs the reference implementation carries. |
| LB4 | Component docs trio | ✅ Shipped | Generated from the manifests; `--check` gates the plan job. |
| LB5 | The front door | ✅ Shipped | `FORKING.md` reduced to what no script can do. |
| LB6 | Register, release, and prove | 🛠️ In progress | Registration open as orun-cloud#992 (green, held on the tag). Tag pending — see *Blocked*. |

## Evidence

### The posture works, against live providers

From the merge-to-main convergence into workspace `ws_NDEXCDQS` (slug `halo`),
with **no AWS credential anywhere in the environment**:

| Component | stage | prod |
|---|---|---|
| `cloudflare-kv` | ✅ applied | ✅ applied |
| `supabase` | ✅ applied | ✅ applied |
| `cloudflare-hyperdrive` | ✅ applied | ✅ applied |

Published on both environment rungs afterwards: `WIRING_CLOUDFLARE_KV`,
`WIRING_CLOUDFLARE_HYPERDRIVE`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`,
`SUPABASE_DB_URL`. Every provider credential was minted per run from the
workspace's own connections.

### The bootstrap works, including headless

Phase 01 dry-run against the live workspace, from a baseline checkout:

```
scaffold: workspace slug -> halo
rebrand: 41 file(s) affected · leftover sweep clean
intent.yaml workspace -> ws_NDEXCDQS project -> acme-probe
repo / link steps: succeeded
```

Passing with both a **kept** and a **changed** workers.dev subdomain.

The `00-all` umbrella runs all ten steps, the scaffold executing for real and
every later phase honouring the dry-run guard.

And the mode that matters most — **remote reference from an empty directory**,
which is what the platform's sandbox agent runs:

```
orun workflow run 'github:sourceplane/multi-tenant-saas@main//flows/phases/01-scaffold/workflow.yaml'
→ fetched the baseline, rendered, rebranded clean, re-tenanted intent.yaml, succeeded
```

## Corrections

Three things shipped wrong and were fixed after measurement rather than left
standing. Recorded because a status page that only lists successes is not a
status page.

1. **The migration runner still called AWS** (#357). LB1 claimed the account was
   out of the loop; `packages/db/src/runner/secrets.ts` still imported
   `@aws-sdk/client-secrets-manager` at migrate time, and both `db-migrate`
   lanes failed on it. The sweep backing that claim covered manifests,
   terraform and CI — not application code. The runner now reads the wiring
   secrets `db-migrate` already declared.

2. **A kept workers.dev subdomain was treated as a failed rename** (#356). It is
   explicitly supported, and flagging it made `rebrand --verify` exit 1 in the
   middle of the scaffold's hook chain, silently skipping the workspace
   re-tenant, the restage and the lockfile.

3. **Bundle edges do not propagate the changed set.** LB2's manifests, the
   generated architecture pages and this epic's own acceptance test claimed a
   `dependsOn` edge on a bundled package marks the consumer changed and
   redeploys it. Measured on orun v2.53.2 it does not: a `packages/db`-only
   commit plans `db` alone (1 component, 3 jobs) and `plan` warns that it
   dropped the edges whose other side was unselected. Confirmed locally with an
   explicit `--base` and independently by #357's own CI. The edges buy ordering
   and visibility; forcing a redeploy needs the `# ci:` marker, which is why the
   bootstrap stamps them on retry (design §2.4).

## Beyond parity

Carried further than the reference implementation, in three places:

1. **Component docs are generated** (`tooling/docs/render-component-docs.py`)
   with `--check` in the plan job, rather than committed by hand. The reference
   implementation's are static, so its dependency sections drift silently — and
   a stale doc still renders.
2. Its generated test pages read ``Verification suite for `None` `` — the target
   never resolved. Derived here from the naming convention.
3. **The `secret://` workspace segment was only re-tenanted when the workspace
   happened to be named after the repo.** The reference pass anchors on
   `secret://<ws>/<repo>/`, but the repo slug is already renamed by the time it
   runs, so the pattern misses and the fork keeps the baseline's workspace —
   failing every secret read with "Validation failed" long after the rebrand
   looked clean. Fixed by matching the workspace segment alone, adding
   `orunWorkspaceSlug` as a blueprint input, and having the scaffold resolve it
   from the workspace id. This would have broken the first real instantiation,
   since a new workspace's slug is essentially never the product's repo name.

## Deviations from the plan

- **LB0 could not be separated from LB1.** The deploy lane's secrets step called
  `tooling/secrets-sync/assemble.mjs` *by path*, `supabase` declared
  `dependsOn: bootstrap`, and the composition's parameter contract is what made
  `secretsWorker` meaningful. Flipping to the OCI stack is what makes all of
  them removable at once.
- `tooling/fork/` deletion moved to LB5, landing with the `FORKING.md` rewrite
  that describes it.
- `docs:` registration moved to LB2 → LB4, so blocks and files land together.

## Blocked

**The `baseline-v1` tag is not cut.** The session that did this work is denied
both tag pushes (403) and the releases API, so it needs a human:

```bash
git fetch origin
git tag -a baseline-v1 <sha> -m "baseline-v1"
git push origin baseline-v1
```

It must point at the #357 merge or later — a tag without that fix ships the
AWS-based migration runner and fails a product's first migration.

orun-cloud#992 registers the baseline and is held as a draft until the tag
exists, because the registry pins a tag and never a branch.

## Measured facts

| Fact | Value | Source |
|------|-------|--------|
| End-to-end wall clock | _not yet measured_ | LB6 instantiation |
| Per-phase durations | _not yet measured_ | LB6 instantiation |
| Release tag | _not yet cut_ | blocked, above |

`expectedMinutes: 75` in the registry and catalog is Lumen's measured figure,
labelled as inherited in both places (risk R5), and is replaced by this
baseline's own first instantiation.
