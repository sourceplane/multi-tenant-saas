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

## The workers.dev subdomain, read from the Cloudflare connection (2026-10-21, `baseline-v4`)

`subdomain` was the one input a console build still asked for that the
platform could answer. It belongs to the Cloudflare account the same way the
account id does and has exactly one right answer, so a typed value could only
be wrong — and wrong surfaced only after deploy, in CORS, OAuth origins, the
smoke checks and the verify URLs. As cirrus-baseline did in `baseline-v23`:

- `blueprint.yaml` declares `from: connection.cloudflare.workersSubdomain`.
  The Cloudflare integration reads the subdomain from the account at connect
  and on its hourly health check; the bootstrap door fills the input from the
  connection the build is bound to — the same one `CLOUDFLARE_ACCOUNT_ID` and
  the deploy tokens mint from — and refuses an account with no workers.dev
  subdomain before anything is created. The console renders no field for it.
- `testing/manifest.test.sh` accepts the new source and requires its provider
  in `spec.requires.integrations` (the card lists `cloudflare`).
- `repo-blueprint.yaml`, `BOOTSTRAP.md`, `docs/phases/01-scaffold.md` and
  `docs/phases/README.md` say a hand-run build still passes `--set subdomain`.

> **Superseded (2026-10-21).** This page never recorded `subdomain` as typed,
> but `BOOTSTRAP.md`'s console section did ("only `productname`,
> `productdomain` and `subdomain` are typed"). It is read from the connection
> now; no probe and no orun action was needed, because the platform already
> held the fact.
>
> **Since then (2026-10-22).** `productdomain` is not asked either: the card
> asks for `productname` alone, and the domain is set later (below).

Verified: the manifest, phases, coverage and rebrand contract tests pass; a
**mutation check** — `cloudflare` deleted from the card's
`spec.requires.integrations` — fails `manifest.test.sh` (exit 1) naming
`inputs[subdomain].from`, and passes again once restored; leak and placement
(orun 2.58.11, the CI pin) pass with 1083 files, unchanged.

## The `domain` input, removed (2026-10-21, `baseline-v4`)

`07-domain` was the one conditional phase: `when: inputs.domain`, off by
default, landing a single component, `cloudflare-domain`. That component
ships PARKED — `subscribe.environments: []` — so CI plans no lanes for it and
the phase's convergence was a green run with nothing in it. A landing that
deploys nothing, behind a switch that turns on a component which is already
off, was one more question and one more PR for no effect. As cirrus-baseline
did (where it folded into `01-product`, its only landing):

### What shipped

- `repo-blueprint.yaml`: the `domain` input is gone, and so is its key in the
  `.rebrand/values.json` template; `cloudflare-domain` joins `06-console`'s
  modules — the last landing that converges a deploy, and the one that places
  the console the custom domain routes; the `07-domain` phase is deleted.
  Nine phases remain under seven milestones. The numbering keeps its gap, so
  `08-docs` keeps its name; it already required `06-console`.
- `blueprint.yaml`: the programme drops the conditional `07-domain`
  milestone.
- `tasks/07-domain.TaskContract.yaml` and `docs/phases/07-domain.md` are
  deleted. What the page said that is still true — the component ships
  parked, the zone must exist in the account first, wiring it is restoring
  the commented-out `subscribe` block and finishing the provider-v5
  re-import — is now a section of `docs/phases/06-console.md`, and
  `ai/context/operations.md` (which ships) says the same without naming a
  factory path.
- `06-console`'s task contract leaves `cloudflare-domain` out of `affects`:
  that list is what the convergence deploys, and a parked component deploys
  nothing.
- `tests/fixtures/acme.json` loses `"domain": false`.

### What the tests had to become

- `testing/phases.test.sh` records `07-domain` as FOLDED into `06-console`
  (`WAS["07-domain"]` stays as history), so the partition gate still proves
  the component moved whole and nothing moved with it. Mutation-checked:
  dropping `cloudflare-domain` from `06-console` fails it.
- `testing/leak.test.sh` and `testing/placement.test.sh` no longer force
  `domain` on: `06-console` places the component on every build, so the
  gates cover it without help. The placement tier's phased sequence now ends
  with `08-docs` after the rebrand — it requires the drifted `06-console`,
  the case BE-O12 fixed.

### Verification

| check | result |
|---|---|
| manifest, phases, coverage, rebrand | all pass — 7 milestones agree; 58 narration lines resolve; 44 of 44 components placed |
| component docs `--check` | 44 up to date |
| `orun new --status` (orun 2.58.11, the CI pin) | parses; nine phases |
| `testing/leak.test.sh` (orun 2.58.11) | pass — 1083 files, 2 context files, no factory paths |
| `testing/placement.test.sh` (orun 2.58.11) | pass — 1083 product files, the same count as with `domain` forced on before; `01 → 08` place through the rebrand; `--resume` keeps the branding |

## The domain is set later (2026-10-22, `baseline-v4`)

The console card asked for the product's domain, with help text that said it
did not need to exist — and nothing in the build needed one: the product
answers on workers.dev from its first deploy, every phase probes workers.dev,
and the one component that attaches a domain, `cloudflare-domain`, ships
parked. The owner asked for the domain to stop being an input at bootstrap,
with the logic that uses it kept where it is so it can be set later. As
turso-starter did (its #9). Ships in `baseline-v4` with #364: the tag was
never pushed, and the owner pushes it at this PR's merge commit, so the one
release carries the subdomain source, the removed `domain` switch and this.

### What shipped

- `blueprint.yaml` declares no `productdomain` and no `apibaseurl`. The card
  derived `apibaseurl` as `https://api.{productdomain}`, and a card can only
  derive from inputs it declares, so it left with the domain. The console's
  Product step asks for the display name alone.
- `repo-blueprint.yaml`: `productdomain` is optional, default `""`, and its
  description names where the domain goes and how it is set later;
  `apibaseurl`'s description states the CLI rule below. The values template
  still writes `"productdomain": ""`. A hand-run build may pass
  `--set productdomain=` for a product that already has its domain.
- `tooling/rebrand/rebrand.mjs` no longer requires `productdomain`. Empty, it
  brands the reserved placeholder `<reponame>.example.com` (RFC 2606) where
  `sourceplane.ai` stood as the product domain — intent's `BASE_DOMAIN` and
  `CONSOLE_CUSTOM_DOMAIN` (the parked `cloudflare-domain`'s parameters, and
  the component's own `baseDomain`), api-edge's `CONSOLE_CUSTOM_DOMAIN`
  (CORS), identity-worker's `OAUTH_ALLOWED_CONSOLE_ORIGINS` (which also lists
  the workers.dev console, so sign-in works without a domain), the
  notifications sender `no-reply@mail.<domain>`, billing's
  `POLAR_SUCCESS_URL`, and the edge's CORS test fixtures. Company mailboxes
  (`@sourceplane.ai`) stay protected. No component logic changed. The
  Supabase root configures no auth URLs, so nothing there names the domain.
- The CLI's default API. `apibaseurl` fell back to `https://api.<domain>`,
  which with the placeholder is a host that can never answer. With no domain
  it is now the product's own prod edge on workers.dev,
  `https://<brandSlug>-api-edge-prod.<subdomain>.workers.dev` — the worker
  rule's name for `api-edge` deployed `--env prod`, live from the first
  deploy. With a domain it is `https://api.<domain>`; an explicit
  `apibaseurl` still wins.
- `cloudflare-domain`'s README examples named `multi-tenant-saas.app` and
  `multi-tenant-saas-web-console-next`, which the rebrand turns into
  `<reponame>.app` and `<reponame>-web-console-next` — not the product's
  placeholder, and not its console Worker when `brandSlug` differs. They now
  name `sourceplane.ai` and `sourceplane-web-console-next`, like the
  component's `baseDomain` / `workerNamePrefix` and their Terraform defaults,
  which already did (the bug cirrus-baseline fixed in its #32). All of them
  follow the placeholder and the console Worker; nothing asks an owner to set
  them by hand.
- `hooks/render-deployment-docs.sh` already probed the custom domain only
  when `.rebrand/values.json` records one, so the empty value skips it; it
  now also treats the `*.example.com` placeholder as no domain, and its
  narration no longer names the removed `07-domain`.
- The shipped `ai/context/operations.md` gains "Setting the domain later":
  every place the domain goes, then replace the placeholder
  (`git grep -lF`), create the zone and restore `cloudflare-domain`'s
  commented-out `subscribe` block, verify the mail domain, Supabase auth URLs
  (none configured), re-point the CLI default if wanted, merge, run the docs
  flow. It names the baseline's `sourceplane.ai`, which the rebrand turns
  into the product's own placeholder, and no factory path.
- `BOOTSTRAP.md`, `docs/phases/README.md`, `docs/phases/01-scaffold.md` and
  the required-inputs sentence of five phase pages: three required inputs
  (`reponame`, `productname`, `githuborg`); `productdomain` NOT ASKED;
  `06-console.md` and `08-docs.md` say the custom domain is the placeholder
  until set. The troubleshooting row for a missing input names
  `productname`.

### What the tests had to become

- `tests/fixtures/acme.json` carries no domain, so the leak gate and the
  placement tier exercise exactly what a console build supplies.
- `testing/placement.test.sh` read the card's `derive` and exited "gone
  blind" without it. It now checks the value a no-domain product gets: its
  `DEFAULT_API_URL` must be the PLACED, BRANDED api-edge's wrangler name plus
  `-prod` on the fixture's subdomain (with `--env prod` read from its
  `component.yaml`), and every `BASE_DOMAIN` / non-empty
  `CONSOLE_CUSTOM_DOMAIN` in its `intent.yaml` must be the placeholder. It
  refuses to pass on nothing: a fixture with a domain or an `apibaseurl`, a
  missing worker name, deploy env, `DEFAULT_API_URL` or `BASE_DOMAIN` each
  fail it.
- `testing/rebrand.test.sh` gains nine checks: no domain and an empty domain
  brand the placeholder; the OAuth origins keep the workers.dev console; the
  no-domain CLI default is the prod edge, follows `brandSlug`, and survives
  three passes; a given domain brands itself and `https://api.<domain>`; an
  explicit `apibaseurl` wins.
- `testing/manifest.test.sh` (comment only): the derive-agreement check has
  nothing to hold today and stays for the next derived input.
- `baseline.yml`'s blueprint read sets no domain, so CI proves the document
  resolves without one.

### Verification

| check | result |
|---|---|
| manifest, phases, coverage, rebrand | all pass — 7 milestones agree; 9 phases, 65 modules, 58 narration lines resolve; 44 of 44 components placed; rebrand 24 checks (15 before) |
| component docs `--check` | 44 up to date |
| `orun new --status` with no `productdomain` (orun 2.58.11, the CI pin) | parses; nine phases |
| `testing/leak.test.sh` (orun 2.58.11) | pass — 1083 files derived, unchanged; 2 context files, no factory paths |
| `testing/placement.test.sh` (orun 2.58.11) | pass — 1083 product files, unchanged; `DEFAULT_API_URL` is `https://acme-cloud-api-edge-prod.acme.workers.dev`; the placeholder `acme-cloud.example.com` in `BASE_DOMAIN` ×3 and `CONSOLE_CUSTOM_DOMAIN` ×2, 10 files carry it; `01 → 08` place through the rebrand |
| mutation: the old CLI rule (`https://api.<domain>` always) | `rebrand.test.sh` fails 3 checks, `placement.test.sh` fails naming `https://api.acme-cloud.example.com`; restored, both pass |
| mutation: no placeholder (empty domain stays empty) | `rebrand.test.sh` fails 3 checks, `placement.test.sh` fails on `BASE_DOMAIN ''`; restored, both pass |
| `cloudflare-domain`, branded with no domain | `baseDomain: acme-cloud.example.com`, `workerNamePrefix: acme-cloud-web-console-next` (= the console Worker), the same in the Terraform defaults and README; with `brandSlug: acme`, `acme-web-console-next` = the console Worker |
| the documented replacement, on a placed product | `git grep -lF acme-cloud.example.com` lists 10 files; the `perl` one-liner leaves 0, and `BASE_DOMAIN` / `baseDomain` read `acme.dev` |
| a second rebrand pass over the placed product | 0 files affected; `DEFAULT_API_URL` unchanged |
