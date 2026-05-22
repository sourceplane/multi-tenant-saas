# Task 0009 Verifier

## Task ID
0009

## Agent
Verifier

## Current Repo Context
The reusable SaaS bootstrap specs are authoritative for this verification. Orun and Terraform provisioning are fully scaffolded.

### Repo State
- `main` is synced with `origin/main` at `dffdc4a` (post-verifier cleanup).
- Tasks 0001, 0001.1, 0002, 0003, 0003.1, 0004, 0005, 0006, 0006.1, 0007, 0007.1, and **0008** have landed.
- PR #35 (`feat: add database migration runner and Orun apply path`) was merged at `aee7d25`. The verifier applied fixes to: (1) Orun workdir path in the job template, (2) SQL migrations not copied to `dist/`, (3) offline plan mode, (4) Supabase Management API adapter for apply mode.
- Post-merge CI run `26229865114` passed. `db-migrate · stage · Migrate` and `db-migrate · prod · Migrate` both applied `000_control_baseline` successfully. The `_migrations` schema and `_migrations.applied` table now exist in both Supabase environments.
- stage project ref: `thielrrsejwhjkdluwqm`, prod project ref: `npbvrxkrlyrpnhrqucxa`.
- Supabase secret ARNs remain unchanged.
- `packages/db` owns the migration manifest. The runner (`SupabaseApiAdapter`) uses the Supabase Management API over HTTPS/IPv4 for apply; plan mode is fully offline.
- `dev` Supabase remains intentionally unprovisioned.
- Local Orun validation passes: `/Users/irineltson/.local/bin/kiox -- orun validate --intent intent.yaml`.

### Active Spec Pack
- Reusable SaaS starter under `specs/**`.
- `specs/orun-golden-path.md` is the short shared context for Orun repo structure, component manifests, composition contracts, and validation.
- `specs/access-and-infra.md` covers Cloudflare and infrastructure components.

### PR Information
- **PR #36**: Task 0009: Cloudflare Hyperdrive infrastructure component
- Branch: `impl/task-0009-hyperdrive`
- Status: OPEN, mergeable, mergeStateStatus = CLEAN
- Implementer report: `/ai/reports/task-0009-implementer.md`
- Files changed: 12 (9 created, 3 modified)
- Commits: 16 (from 7ba44d0 to f62bd0c)

## Objective
Verify that PR #36 correctly implements Task 0009: Cloudflare Hyperdrive infrastructure component according to the orchestrator standards and specifications.

## PR Boundary
One PR = one task. This verification covers only the changes in PR #36. No additional scope expansion.

## Read First
- `specs/access-and-infra.md` (Cloudflare component standards)
- `orchestrator.md` (Verifier Standard, sections 349-392)
- `specs/orun-golden-path.md` (Orun component contracts)
- Implementer report: `/ai/reports/task-0009-implementer.md`
- PR #36 diff and commits

## Required Outcomes
Produce a verifier report with:
1. **Result**: PASS or FAIL with clear justification
2. **Checks**: List of all verification checks performed
3. **Issues**: Any problems found, with severity
4. **Risk Notes**: Residual risks after verification
5. **Spec Proposals**: Links to any needed spec updates
6. **Recommended Next Move**: What should happen after verification

## Non-Goals
- Fix bugs or make improvements
- Expand scope to unrelated files
- Create new tasks (except to propose spec changes)
- Merge the PR unless ALL verification passes

## Constraints
- Must follow the Verifier Merge Protocol exactly (see orchestrator.md §349-392)
- Must inspect GitHub Actions logs, not just status summaries
- Must run local kiox/orun validation when available
- Must check for overreach/hidden coupling
- Must confirm the PR maps to exactly one task
- Must validate acceptance criteria from the implementer prompt

## Integration Notes
- This verification depends on Task 0006 (Supabase) being fully applied to stage and prod
- This verification depends on Task 0008 (migration runner) being fully applied and tested
- This verification may be blocked if Cloudflare API credentials are missing from GitHub Actions secrets

## Acceptance Criteria
VERIFICATION PASSES IF:
- ✅ PR #36 corresponds exactly to Task 0009 as described in the implementer report
- ✅ All files follow Orun/Terraform conventions and are properly formatted
- ✅ Component descriptor (`component.yaml`) follows the golden path pattern
- ✅ Terraform code passes `terraform fmt -check` and `terraform validate`
- ✅ Orun component discovery works correctly for stage and prod instances
- ✅ Plan generation includes `cloudflare-hyperdrive` jobs (27 total jobs)
- ✅ Dry-run execution completes successfully for all jobs
- ✅ No secrets are logged in any command output or CI logs
- ✅ Sensitive outputs are marked with `sensitive = true` in Terraform
- ✅ Dependencies (supabase) are correctly declared and resolved
- ✅ All acceptance criteria from the Implementer Standard are met
- ✅ GitHub Actions logs show expected commands actually ran successfully
- ✅ Production-grade basics verified (no plaintext tokens, secrets safe, etc.)
- ✅ No overreach or hidden coupling with unrelated components
- ✅ MergeStateStatus is CLEAN and branch is up-to-date

If ANY check fails, the verification must FAIL and the PR must remain open with clear blockers.

## Verification Steps
Follow the Verifier Standard (orchestrator.md §349-392) in order:

1. **Inspect PR and Report**
   - Read the implementer report thoroughly
   - Review the PR diff: compare changes against Task 0009 description
   - Confirm exactly one task per PR

2. **Local Validation**
   - Run `kiox -- orun validate --intent intent.yaml` (if intent.yaml exists)
   - Run `kiox -- orun plan --changed --intent intent.yaml --output plan.json` (if Orun is scaffolded)
   - Run `kiox -- orun run --plan plan.json --dry-run --runner github-actions` (if plan produced)

3. **Terraform Checks**
   - `terraform fmt -check` on all new Terraform files
   - `terraform validate` on the component directory
   - Check that sensitive variables/outputs are marked correctly

4. **Component Discovery & Planning**
   - Run `orun discover` to verify component appears
   - Run `orun plan --intent intent.yaml` to verify plan includes correct jobs
   - Confirm 27 jobs total, including `cloudflare-hyperdrive · stage · Terraform` and `cloudflare-hyperdrive · prod · Terraform`

5. **GitHub Actions Inspection**
   - Use `gh pr checks` to list all CI jobs
   - Inspect logs of key jobs: `orun-validate`, `orun-plan`, `orun-run`
   - Verify commands actually ran and produced expected output
   - Check for any unexpected errors or warnings

6. **Production-Grade Basics**
   - Scan all files for plaintext secrets/tokens (should be none)
   - Verify secrets are read from AWS Secrets Manager (not hardcoded)
   - Confirm Terraform state will be stored in encrypted S3
   - Check that outputs do not expose sensitive data

7. **Overreach Detection**
   - Review all changed files: are any unrelated components affected?
   - Check for coupling with future tasks (Task 0010/0011) - should be minimal
   - Verify no unrelated refactors or formatting churn beyond what's needed

8. **Final Decision**
   - If ALL checks pass: ✅ PASS
   - If ANY check fails: ❌ FAIL with clear blocker description

## PR Creation Requirement
The verifier must either:
- PASS the verification and merge the PR following the merge protocol, OR
- FAIL the verification and leave the PR open with specific blockers

No other outcomes are acceptable.

## When Done Report
After completing verification, write a report at `/ai/reports/task-0009-verifier.md` following the verifier report format:
- **Result**: PASS|FAIL
- **Checks**: List of checks performed
- **Issues**: Any problems found
- **Risk Notes**: Remaining risks
- **Spec Proposals**: Any needed spec updates
- **Recommended Next Move**: What happens after verification

Then execute the Verifier Merge Protocol:
- If PASS: merge PR, checkout main, fast-forward pull, clean up branch
- If FAIL: leave PR open, document blockers clearly

## References
- Implementer report: `/ai/reports/task-0009-implementer.md`
- PR #36: `impl/task-0009-hyperdrive`
- Specs: `specs/access-and-infra.md`, `specs/orun-golden-path.md`
- Orchestrator standard: `agents/orchestrator.md` (Verifier sections)
- Task dependencies: 0006 (Supabase), 0008 (migration runner)