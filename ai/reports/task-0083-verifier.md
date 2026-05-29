# Task 0083 — Verifier Report (re-verify on head `8703081`, post-merge soak)

## Result: FAIL

**The PR merged** (squash commit `927c5179`, 9/9 PR-CI SUCCESS and 9/9 post-merge main-CI SUCCESS at run `26637297242`), but the **mandatory post-merge soak failed**: the acceptance criteria for live apex hostnames are not met. The cloudflare-domain Terraform apply jobs ran with `CONSOLE_CUSTOM_DOMAIN = ""` on both stage and prod, so neither the new `cloudflare_workers_domain.console` resource nor the prior `cloudflare_pages_domain.console` resource was created. `stage.sourceplane.ai` and `prod.sourceplane.ai` resolve to NXDOMAIN. This is a Task 0082.2-class deploy-profile gap and requires a hotfix task.

PR head verified: `8703081bdf190ea485afc1acd5d99496718690e1`
Merge commit on main: `927c51795df869466f5c66e8eed40a9ab10a0bea`
PR-CI run: `26636510934` — 9/9 SUCCESS
Post-merge main-CI run: `26637297242` — 9/9 SUCCESS (all jobs green, but resources not created — see Soak section)

## Checks

| Check                                                              | Result | Notes |
|--------------------------------------------------------------------|--------|-------|
| PR Boundary union (original 14 categories + intent.yaml + kiox.yaml + ci.yml) | PASS   | All 30 changed paths fit the allowed union. |
| `apps/web-console/` removed                                        | PASS   | Directory absent on PR branch and main. |
| `git grep -nE 'sourceplane-web-console([^-]\|$)'` outside ai/      | PASS   | Only 4 deliberate residuals: 2 in component.yaml/main.tf for the soak-cycle `pagesProjectPrefix` default, 2 in CORS deny-list tests. All called out in implementer report. |
| Terraform `fmt -check` / `init -upgrade` / `validate`              | PASS   | Clean. Provider 4.52.7 resolved. |
| `kiox -- orun validate --intent intent.yaml`                       | PASS   | All validation passed. |
| `pnpm --filter @saas/api-edge-tests test`                          | PASS   | 261/261 across 9 suites. |
| Post-PASS commit `a7fe7cb` (orun v2.3.0 → v2.9.0)                  | ACCEPTED | In-flight toolchain bump; CI ran new version successfully. |
| Post-PASS commit `8703081` (intent.yaml drop stage→dev promotion)  | ACCEPTED | Both stage and prod cloudflare-domain jobs ran in the post-merge wave, validating the topology change does not silently drop prod. Justification posted on PR #129 as verifier comment. |
| PR-CI 26636510934                                                  | 9/9 SUCCESS | cloudflare-domain · {stage,prod} · Terraform, cloudflare-hyperdrive · {stage,prod} · Terraform, api-edge · {dev,stage,prod} · Verify deploy, api-edge-tests · dev · Verify, plan. web-console-next.{dev,stage,prod} · Verify deploy NOT in this run — already on main pre-PR (documented per addendum). |
| Post-merge main-CI 26637297242 status                              | 9/9 SUCCESS (apparent) | Same job matrix as PR-CI; all green. |
| Post-merge soak — apex hostnames live                              | **FAIL** | See below. |

## Post-Merge Soak (MANDATORY — FAILED)

### Apex probes
- `curl https://stage.sourceplane.ai/` → DNS resolution failure (NXDOMAIN at both 1.1.1.1 and 8.8.8.8). Expected: HTTP 200 with body containing `Sourceplane Console`.
- `curl https://prod.sourceplane.ai/` → DNS resolution failure (NXDOMAIN). Expected: HTTP 200 with `Sourceplane Console`.

### CORS preflight (stage)
- Not reachable — depends on apex resolving. Skipped.

### Rollback hatch (still alive — good news for recovery)
- `https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/` → HTTP 200, body contains `Sourceplane Console`. ✓
- `https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/` → HTTP 200, body contains `Sourceplane Console`. ✓

### Root cause — cloudflare-domain apply log evidence
Both `cloudflare-domain · {stage,prod} · Terraform` apply jobs in run `26637297242` reported:

```
Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
console_custom_domain = ""
```

Job env block on both stage and prod only contained `TF_VAR_cloudflare_api_token` and `TF_VAR_cloudflare_account_id`. The `CONSOLE_CUSTOM_DOMAIN` value from `intent.yaml` (`stage.sourceplane.ai`, `prod.sourceplane.ai`) was **never threaded through to Terraform as `TF_VAR_CONSOLE_CUSTOM_DOMAIN`**. Because `local.has_custom_domain = local.console_custom_domain != ""` evaluates to `false`, both `cloudflare_workers_domain.console` (new, count=0) and `cloudflare_pages_domain.console` (old, count=0 from the prior cycle as well — `pages_domain_status` was already `"not_configured"` before this PR) were skipped.

This is the same class of bug as Task 0082.2 — the deploy/apply runtime did not inject an env var the Terraform code depends on, but PR CI plan jobs passed because plan does not require the value to be non-empty (the `count` simply remains 0).

**Why this wasn't caught earlier:**
- The implementer plan output snippet in `ai/reports/task-0083-implementer.md` shows the same `Changes to Outputs:` block with `console_custom_domain` going from `""` to `""` — the planning output was already empty before this PR. The implementer report focused on the *delta* (Pages→Workers resource type) and did not flag the fact that **neither** resource was being planned for actual creation under the current env-var wiring. The pre-merge state was: legacy Pages projects existed (because `ensure-pages-project` created them imperatively), but `cloudflare_pages_domain.console` was never bound in Terraform state either. So the apex hostnames were live before the PR through some other mechanism (likely a manual Cloudflare DNS+Pages binding outside Terraform), and that mechanism is now broken — OR the apex hostnames were never live, and the Task 0083 prompt's pre-condition that "Custom domains `stage.sourceplane.ai` and `prod.sourceplane.ai` are currently bound to those OLD Pages projects" was incorrect.

NXDOMAIN at the apex (not a 4xx/5xx) supports the second reading: the hostnames were never DNS-resolvable to begin with, the prompt's pre-condition was wrong, and the Worker custom-domain attachment Task 0083 was supposed to perform never had a working baseline to swing from. Either way, the live acceptance criteria (`curl -sfL https://stage.sourceplane.ai/` → 200) fails today and Task 0083 cannot be marked PASS.

## Deviations from PR Boundary

1. **`cloudflare_workers_domain` (v4) instead of `cloudflare_workers_custom_domain` (v5)** — implementer chose to stay on the v4 cloudflare provider to minimize blast radius; bumped pin `~> 4.30 → ~> 4.52` (4.52.7 installed) because v4.30 lacked the resource. Accepted in original verifier pass; preserved here. Functional behavior is equivalent. **Not the cause of the soak failure** — the resource was never invoked (count=0) because the env var wasn't wired through.
2. **`orun v2.3.0 → v2.9.0` toolchain bump** (`a7fe7cb`) — in-flight coalescing on a green branch. CI exercised the new version end-to-end on the PR run; accepted per orchestrator stance in `ai/tasks/task-0083-verifier-addendum.md`.
3. **`intent.yaml` `environments.stage.promotion.dependsOn=[dev]` removal** (`8703081`) — accepted conditionally per addendum because both stage and prod cloudflare-domain apply jobs ran in the post-merge `github-push-main` wave (run `26637297242`), confirming prod-apply did not silently drop out. Justification posted as PR #129 comment. Independent of the soak failure.

## Issues

**Blocking (hotfix required):**

- **`CONSOLE_CUSTOM_DOMAIN` env var from `intent.yaml` is not threaded to Terraform as `TF_VAR_CONSOLE_CUSTOM_DOMAIN` in the `cloudflare-domain` component apply step.** As a result, the new `cloudflare_workers_domain.console` resource is never created on stage or prod, and the apex hostnames remain DNS-unresolvable. Look at how `cloudflare-hyperdrive` (which uses a different env-var wiring pattern and successfully creates per-env resources) threads its parameters, and replicate that pattern in `cloudflare-domain/component.yaml` (likely needs an explicit `parameterMappings` or `envMapping` block that converts `CONSOLE_CUSTOM_DOMAIN` from environment env to `TF_VAR_CONSOLE_CUSTOM_DOMAIN`).

**Non-blocking observations:**

- Implementer's Acceptance Criteria check listed "Live curl evidence for `https://{stage,prod}.sourceplane.ai/` after the post-merge apply" as a reporting requirement, but the report did not include actual curl output — it only included plan-time output. If actual curl was attempted post-merge, it would have surfaced the NXDOMAIN before the orchestrator scoped a verifier. Recommend implementer-side gate that requires real curl evidence committed before requesting verification on infra-deploy tasks.

## Risk Notes

- **Rollback hatch is healthy**: both Workers are reachable on their `*.workers.dev` shadows with the expected response body. Users with bookmarks to the workers.dev URLs are unaffected; only consumers expecting `{stage,prod}.sourceplane.ai` are broken.
- **api-edge CORS allow-list has been narrowed** in this PR to remove `*.pages.dev` console origins. If anyone is still hitting the legacy `sourceplane-web-console-{stage,prod}.pages.dev` URLs (which still serve static content because the Pages projects exist), their cross-origin calls to api-edge will now fail. This is intentional per Task 0083 but worth flagging during the hotfix window.
- **Topology change in intent.yaml** (`stage.promotion.dependsOn=[dev]` removed) is now live. No other component appeared to silently depend on dev-applying-first in this run, but Task 0084-C audit (recommended below) should confirm across the full component graph.

## Spec Proposals

None required — the spec changes in this PR (`specs/components/12-web-console.md`, `specs/components/01-edge-api.md`, `specs/repo.md`, `specs/components/16-admin-support.md`) accurately describe the **intended** deployment shape. The current production state simply doesn't match the spec because of the env-var wiring bug; the hotfix should make reality catch up to the already-merged spec.

## Live Deployment Status

- Merge commit: `927c51795df869466f5c66e8eed40a9ab10a0bea` at `2026-05-29T12:30:01Z`
- Post-merge main-CI run: `26637297242` — all 9 jobs `success`
- cloudflare-domain · stage · Terraform apply: `0 added, 0 changed, 0 destroyed` (no-op due to empty `CONSOLE_CUSTOM_DOMAIN`)
- cloudflare-domain · prod · Terraform apply: `0 added, 0 changed, 0 destroyed` (no-op due to empty `CONSOLE_CUSTOM_DOMAIN`)
- Cloudflare Workers (rollback hatch): both stage and prod web-console-next deployments serve HTTP 200 with `Sourceplane Console` on their `*.workers.dev` URLs
- Apex DNS: NXDOMAIN for both `stage.sourceplane.ai` and `prod.sourceplane.ai`

## Recommended Next Move

**Hotfix immediately. Task 0083.1 candidate:** wire `CONSOLE_CUSTOM_DOMAIN` → `TF_VAR_CONSOLE_CUSTOM_DOMAIN` in `infra/terraform/cloudflare-domain/component.yaml` so the apply step actually creates the `cloudflare_workers_domain.console` resource on stage and prod. Acceptance criteria identical to Task 0083: `curl -sfL https://stage.sourceplane.ai/` and `https://prod.sourceplane.ai/` return 200 with `Sourceplane Console`. Set `repo_health: yellow` until this lands and the apex probes pass.

Follow-up tasks unchanged from original verifier prompt:
- Task 0084 candidate A: drop `pagesProjectPrefix` after soak + delete legacy Pages projects imperatively.
- Task 0084 candidate B: v5 cloudflare provider migration (`cloudflare_workers_domain` → `cloudflare_workers_custom_domain`).
- Task 0084 candidate C: audit deploy-promotion topology across all environments after the `stage.promotion.dependsOn=[dev]` removal — confirm no other component silently relied on dev applying first.
- **New Task 0084 candidate D**: add an implementer-side gate requiring real curl evidence (not just plan output) for any task whose Acceptance Criteria lists live HTTP probes.

## PR Number

**#129** — https://github.com/sourceplane/multi-tenant-saas/pull/129 — **MERGED** at `2026-05-29T12:30:01Z` as squash commit `927c5179`. Hotfix PR forthcoming as Task 0083.1.
