# saas-lumen-baseline — risks and open questions

Status: Normative register. Decisions that were made, risks that remain, and
the consolidated human-help list.

## Decisions taken

| # | Question | Decision | Why |
|---|---|---|---|
| D1 | Vendored `stack-tectonic/` or the published OCI stack? | **OCI**, pinned at `0.18.2` | Two baselines differing only in how they obtain CI compositions is a distinction no operator can act on, and a vendored copy is a second thing to patch. Settled before LB0. |
| D2 | Retarget `tooling/secrets-sync` or drop it? | **Drop** | Built on the AWS escrow LB1 removes; the secrets it manages arrive long after bootstrap; a fork would inherit tooling pointed at an account it does not have. Full reasoning in [`design.md` §1.5](design.md#15-why-the-runtime-escrow-is-removed-rather-than-migrated). |
| D3 | Build an instantiator, or adopt Lumen's? | **Adopt** | Lumen's phased bootstrap is proven on three instantiations. `saas-bootstrap-factory` phases D–E are closed as superseded rather than built twice. |
| D4 | Keep `infra/terraform/bootstrap`? | **Delete** | It provisions the AWS state backend and Secrets Manager namespace that LB1 removes from the loop. |

## Open risks

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | The OCI stack at `0.18.2` is missing a composition the vendored copy carried. | Medium | LB0 blocks | Compare binding-for-binding **before** deleting `stack-tectonic/`. A genuine gap is a stack-tectonic release, not a reason to keep the vendored tree. |
| R2 | Terraform state migration strands existing `stage`/`prod` resources — this repo has live infrastructure, unlike a fresh fork. | Medium | High: orphaned Cloudflare/Supabase resources billed and unmanaged | `adopt.tf` (design §1.6) imports by name rather than creating. Migrate and verify one component (`cloudflare-kv`, the smallest) before the rest. |
| R3 | Two catalog entries (Lumen, this repo) describing near-identical platforms confuses buyers. | High | Commercial, not technical | Out of scope for this epic to resolve — but recorded, because it is the predictable consequence of decision D1 and someone will ask. The honest differentiator after D1 is brand and lineage, not capability. |
| R4 | Registry/catalog drift: bumping the tag in `agents-worker` without touching the website app does not schedule the cross-check (CI plans on changed components). | Medium | A page that lies about a version | Known and accepted for this epic; the generated pages carry the tag so a mismatch surfaces on the next website change. Proper fix — registry and catalog sharing one source — is a follow-up, not a second mechanism invented here. |
| R5 | `expectedMinutes` in the registry is inherited from Lumen's measurement rather than measured here. | High | A duration that misleads an operator mid-bootstrap | LB6's instantiation is the measurement. Publish the observed figure, not the borrowed one — and if it differs materially, correct the catalog before announcing. |
| R6 | The brokered-secret write silently fails on a non-admin key, masked as `not_found`. | High (it is the most common bootstrap failure) | An operator chasing missing scopes | `create-secrets.sh` special-cases the message. Preserve it verbatim on port — it is load-bearing, not decoration. |

## Human help register

| Milestone | What is needed | Why no script can do it |
|---|---|---|
| LB0 | GHCR package read for the CI identity | Package permissions are an org-level grant |
| LB1 | A workspace with Cloudflare + Supabase connected; an **admin-role** key | OAuth consent is a human act; admin role is the floor for brokered secret writes |
| LB6 | An operator to run the instantiation into a fresh workspace | The milestone's acceptance test is a live product, and repo allow-listing is the one console action a workspace-scoped token cannot self-heal |

## Questions still open

- **Q1 — Does this repo keep its live `stage`/`prod` deployment through the LB1
  migration, or is it re-provisioned?** Adoption (R2) assumes keeping it. If
  re-provisioning is acceptable the milestone is materially simpler, but the
  decision belongs to whoever owns those environments, not to this epic.
- **Q2 — What is the release cadence for `baseline-v*`?** Lumen is at `v24`;
  this repo starts at `v1`. Whether the tags move together, or independently as
  each baseline's own content changes, is unsettled. Independent is the
  assumption until someone decides otherwise.
