# Foundation And Tooling

Status: Ready for implementation

Primary monorepo targets:

- repo root
- `tooling/*`
- `infra/*`
- `.github/workflows/ci.yml`
- `tests/*`
- initial scaffolds under `apps/*` and `packages/*`

Primary dependencies:

- `specs/constitution.md`
- `specs/product-overview.md`
- `specs/repo.md`
- `specs/access-and-infra.md`

## Intent

Bootstrap a production-grade Cloudflare monorepo that all later SaaS starter bounded contexts can safely build on without reworking the workspace layout.

## Scope

- `pnpm` workspace setup
- task runner setup
- TypeScript base config
- linting, formatting, testing, and typechecking setup
- Worker and Pages app scaffolds
- shared environment typing
- Supabase Postgres and Hyperdrive adapter conventions
- Terraform adoption/provisioning for the Supabase, Hyperdrive, Worker infra, and R2 backend baseline
- local development scripts
- Orun and Stack Tectonic CI/deploy pipeline skeleton
- root `intent.yaml`, `kiox.yaml`, committed `kiox.lock`, and local `stack-tectonic/`
- `component.yaml` scaffolds for apps, packages, infra, and test components
- contract-test harness wired to `packages/contracts`

## Out Of Scope

- domain business logic
- product UI implementation
- payment-provider integration

## Hard Contracts To Honor

- The repo shape in `specs/repo.md`
- The constitutional rule that bounded contexts must remain extractable

## Required Capabilities

### Workspace

- Root scripts for `dev`, `build`, `test`, `lint`, `typecheck`, and `deploy`.
- Per-app scripts for local Cloudflare development and deployment.
- Shared tsconfig and eslint configs that can be extended, not copied.
- Root scripts may wrap local tasks, but CI must call Orun instead of package scripts directly.

### Orun Structure

- `intent.yaml` discovers `apps/`, `packages/`, `tests/`, and `infra/`.
- `intent.yaml` points at the committed local `stack-tectonic/` directory.
- `stack-tectonic/` is refreshed deliberately with `kiox -- orun fetch ghcr.io/sourceplane/stack-tectonic:0.12.0 --overwrite` when adopting a new upstream stack baseline.
- `kiox.yaml` pins the Orun provider image and `kiox.lock` records the resolved digest.
- `.orun/` contains generated local plans, locks, and run state and is not committed.
- Each app, package, infra unit, and test suite has a colocated `component.yaml`.
- Test components start as `turbo-package` components with `labels.layer: test` unless the local stack provides a dedicated test type.

### Testing

- Unit, contract, integration, and smoke suites are represented as Orun test components under `tests/`.
- Contract tests load schemas from `packages/contracts`.
- Worker-to-Worker integration tests use a dedicated test component for each surface.
- App and package components that require tests declare `dependsOn` on their matching test component.
- No GitHub Actions job may run test commands directly.

### Environment Management

- Typed env bindings for Workers.
- Typed Hyperdrive bindings for Workers that need the primary Supabase Postgres database.
- Clear separation between local, preview, and production configuration.
- Local, preview, and production database targets must be selected through environment configuration, not hardcoded connection strings.
- Secrets must be referenced through Wrangler and Secrets Store conventions, not `.env` files committed to git.

### Infrastructure Provisioning

- Terraform adopts existing Supabase/Hyperdrive baseline resources when they are human-provided, and provisions future missing resources through Orun jobs.
- Terraform state uses Cloudflare R2 as backend.
- Infra provisioning is exposed as Orun components under `infra/terraform`.
- CI provides `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, and `SUPABASE_API_KEY`.
- No GitHub Actions job may run Terraform directly outside Orun.

### CI

- Run `orun plan --changed --intent intent.yaml --output plan.json` on every PR and push to main.
- Fan out `orun run --plan plan.json --runner github-actions --remote-state --job ...` from the immutable plan.
- Use `contents: read`, `packages: read`, and `id-token: write` workflow permissions.
- Support targeted validation and deploys by changed component.

## Agent Freedom

- The agent may choose `turbo`, `nx`, or a simpler task graph if it still supports selective execution well.
- The agent may choose `vitest` or another TypeScript-friendly test runner if Worker support is solid.
- The agent may choose exact folder helpers and codegen scripts as long as the repo shape remains compatible with `specs/repo.md`.

## Acceptance Criteria

- The first merged implementation task materializes the Orun repo structure before domain code.
- A fresh clone can install, typecheck, lint, and run tests through Orun components.
- At least one Worker and one Pages app scaffold run locally.
- `packages/contracts` can publish shared validators/types to other packages.
- New bounded contexts can be added without editing unrelated app internals.
- Local verification passes:

```bash
/Users/irinelinson/.local/bin/kiox -- orun compositions lock --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun validate --intent intent.yaml
/Users/irinelinson/.local/bin/kiox -- orun plan --changed --intent intent.yaml --output plan.json
/Users/irinelinson/.local/bin/kiox -- orun run --plan plan.json --dry-run --runner github-actions
```

- GitHub Actions uses the same Orun plan/run model and executes at least one test component.
- A test-only change produces a test component job in the Orun matrix.
- Infra changes run Terraform plan/apply through Orun with R2-backed state.
- Existing Supabase and `sourceplane-db` Hyperdrive adoption, or future creation, is verified against live provider state.

## Extraction Seam

This component must avoid hidden global assumptions. Later extractions should be able to move an app plus a small set of packages without rebuilding the entire workspace model.
