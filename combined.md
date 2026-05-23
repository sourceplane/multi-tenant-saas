
# FILE: ./composition.yaml

```yaml
apiVersion: sourceplane.io/v1alpha1
kind: Composition
metadata:
  name: cloudflare-worker-turbo
spec:
  type: cloudflare-worker-turbo
  description: Cloudflare Worker with Turborepo build, verify, and deploy pipeline

  schemaRef:
    name: cloudflare-worker-turbo-component

  defaultJob: verify-deploy
  defaultProfile: verify

  jobs:
    - name: verify-deploy
      templateRef:
        name: cloudflare-worker-turbo-verify-deploy

  profiles:
    - name: pull-request
      profileRef:
        name: cloudflare-worker-turbo-pull-request
    - name: verify
      profileRef:
        name: cloudflare-worker-turbo-verify
    - name: deploy
      profileRef:
        name: cloudflare-worker-turbo-deploy

```

# FILE: ./jobs/cloudflare-worker-turbo-verify-deploy.yaml

```yaml
apiVersion: sourceplane.io/v1alpha1
kind: JobTemplate
metadata:
  name: cloudflare-worker-turbo-verify-deploy
spec:
  description: Verify a Cloudflare Worker app and deploy it from the production branch
  runsOn: ubuntu-22.04
  timeout: 30m
  retries: 0

  labels:
    scope: delivery

  capabilities:
    - cloudflare-worker-turbo.setup-node
    - cloudflare-worker-turbo.setup-pnpm
    - cloudflare-worker-turbo.install
    - cloudflare-worker-turbo.pre-build
    - cloudflare-worker-turbo.verify-structure
    - cloudflare-worker-turbo.build
    - cloudflare-worker-turbo.typecheck
    - cloudflare-worker-turbo.deploy

  steps:
    - id: setup-node
      name: setup-node
      capability: cloudflare-worker-turbo.setup-node
      use: actions/setup-node@v4
      with:
        node-version: "{{.parameters.nodeVersion}}"

    - id: setup-pnpm
      name: setup-pnpm
      capability: cloudflare-worker-turbo.setup-pnpm
      use: pnpm/action-setup@v4
      with:
        version: "{{.parameters.pnpmVersion}}"

    - id: install-workspace-dependencies
      name: install-workspace-dependencies
      capability: cloudflare-worker-turbo.install
      run: pnpm install --no-frozen-lockfile
      onFailure: stop

    - id: pre-build
      name: pre-build
      capability: cloudflare-worker-turbo.pre-build
      shell: bash
      run: |
        {{if .preBuildCommand}}
        {{.parameters.preBuildCommand}}
        {{else}}
        echo "Skipping pre-build."
        {{end}}
      onFailure: stop

    - id: verify-worker-structure
      name: verify-worker-structure
      capability: cloudflare-worker-turbo.verify-structure
      shell: bash
      run: |
        test -f package.json
        {{if .wranglerConfig}}
        test -f "{{.parameters.wranglerConfig}}"
        {{else}}
        test -f wrangler.jsonc || test -f wrangler.toml
        {{end}}
      onFailure: stop

    - id: build-worker
      name: build-worker
      capability: cloudflare-worker-turbo.build
      run: "{{if .buildCommand}}{{.parameters.buildCommand}}{{else}}pnpm exec turbo run build --filter=./{{end}}"
      onFailure: stop

    - id: typecheck-worker
      name: typecheck-worker
      capability: cloudflare-worker-turbo.typecheck
      run: "{{if .typecheckCommand}}{{.parameters.typecheckCommand}}{{else}}pnpm exec turbo run typecheck --filter=./{{end}}"
      onFailure: stop

    - id: deploy-worker
      name: deploy-worker
      capability: cloudflare-worker-turbo.deploy
      shell: bash
      run: |
        if [ "{{.orun.environment.name}}" = "dev" ]; then
          echo "::notice::DRY-RUN: Running wrangler deploy --dry-run for {{.orun.component.name}} in dev environment."
          pnpm exec wrangler deploy --dry-run
          exit 0
        fi

        if [ "{{.orun.environment.name}}" != "production" ] || [ "${GITHUB_REF:-}" != "refs/heads/{{.parameters.productionBranch}}" ]; then
          echo "::notice::SKIPPED: Cloudflare Worker deploy for {{.orun.component.name}} in {{.orun.environment.name}} on ${GITHUB_REF:-local} (not production branch)."
          exit 0
        fi

        : "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID is required for deploy}"
        : "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is required for deploy}"

        {{if .preDeployCommand}}
        echo "::group::Pre-deploy"
        {{.parameters.preDeployCommand}}
        echo "::endgroup::"
        {{end}}

        {{if .migrationCommand}}
        echo "::group::Run migrations"
        {{.parameters.migrationCommand}}
        echo "::endgroup::"
        {{end}}

        echo "::notice::LIVE DEPLOY: Deploying {{.orun.component.name}} to Cloudflare from ${GITHUB_REF:-}."
        {{if .deployCommand}}{{.parameters.deployCommand}}{{else}}pnpm run deploy{{end}}

        {{if .smokeCommand}}
        echo "::group::Post-deploy smoke test"
        {{.parameters.smokeCommand}}
        echo "::endgroup::"
        {{end}}

        echo "::notice::DEPLOY SUCCESS: {{.orun.component.name}} deployed to Cloudflare."
      onFailure: stop

```

# FILE: ./profiles/cloudflare-worker-turbo-deploy.yaml

```yaml
apiVersion: sourceplane.io/v1alpha1
kind: ExecutionProfile
metadata:
  name: cloudflare-worker-turbo-deploy
spec:
  description: Full build, typecheck, and deploy pipeline for Cloudflare Worker with Turborepo

  jobs:
    verify-deploy:
      includeCapabilities:
        - cloudflare-worker-turbo.setup-node
        - cloudflare-worker-turbo.setup-pnpm
        - cloudflare-worker-turbo.install
        - cloudflare-worker-turbo.pre-build
        - cloudflare-worker-turbo.verify-structure
        - cloudflare-worker-turbo.build
        - cloudflare-worker-turbo.typecheck
        - cloudflare-worker-turbo.deploy

```

# FILE: ./profiles/cloudflare-worker-turbo-pull-request.yaml

```yaml
apiVersion: sourceplane.io/v1alpha1
kind: ExecutionProfile
metadata:
  name: cloudflare-worker-turbo-pull-request
spec:
  description: PR validation with Turborepo build and typecheck

  jobs:
    verify-deploy:
      includeCapabilities:
        - cloudflare-worker-turbo.setup-node
        - cloudflare-worker-turbo.setup-pnpm
        - cloudflare-worker-turbo.install
        - cloudflare-worker-turbo.pre-build
        - cloudflare-worker-turbo.verify-structure
        - cloudflare-worker-turbo.build
        - cloudflare-worker-turbo.typecheck

```

# FILE: ./profiles/cloudflare-worker-turbo-verify.yaml

```yaml
apiVersion: sourceplane.io/v1alpha1
kind: ExecutionProfile
metadata:
  name: cloudflare-worker-turbo-verify
spec:
  description: Full non-mutating verification of Cloudflare Worker with Turborepo

  jobs:
    verify-deploy:
      includeCapabilities:
        - cloudflare-worker-turbo.setup-node
        - cloudflare-worker-turbo.setup-pnpm
        - cloudflare-worker-turbo.install
        - cloudflare-worker-turbo.pre-build
        - cloudflare-worker-turbo.verify-structure
        - cloudflare-worker-turbo.build
        - cloudflare-worker-turbo.typecheck

```

# FILE: ./README.md

```md
# cloudflare-worker-turbo

`cloudflare-worker-turbo` is an exported Orun composition in the Stack Tectonic catalog.

## Purpose

Verify a Cloudflare Worker app and deploy it from the production branch

## Contract

- **Type:** `cloudflare-worker-turbo`
- **Path:** `compositions/cloudflare-worker-turbo`
- **Definition:** `compositions.yaml`

## Example fixtures

These sample assets are excerpted or adapted from `example-platform-repo` so the contract is documented with realistic consumer-repo shapes.

- `examples/api-edge`

## Test fixtures

- `tests/smoke`

## Verification

`./scripts/verify-composition.sh cloudflare-worker-turbo` checks that this composition keeps its contract, fixture, and generated-doc scaffolding intact.

```

# FILE: ./schema.yaml

```yaml
apiVersion: sourceplane.io/v1alpha1
kind: ComponentSchema
metadata:
  name: cloudflare-worker-turbo-component
spec:
  type: cloudflare-worker-turbo
  schema:
    $schema: http://json-schema.org/draft-07/schema#
    title: Cloudflare Worker Turbo Component
    type: object
    required:
      - name
      - type
      - parameters
    properties:
      name:
        type: string
      type:
        type: string
        const: cloudflare-worker-turbo
      parameters:
        type: object
        required:
          - nodeVersion
          - pnpmVersion
          - productionBranch
        properties:
          nodeVersion:
            type: string
          pnpmVersion:
            type: string
          productionBranch:
            type: string
          wranglerConfig:
            type: string
          preBuildCommand:
            type: string
          buildCommand:
            type: string
          typecheckCommand:
            type: string
          preDeployCommand:
            type: string
          migrationCommand:
            type: string
          deployCommand:
            type: string
          smokeCommand:
            type: string
        additionalProperties: false
    additionalProperties: true

```
