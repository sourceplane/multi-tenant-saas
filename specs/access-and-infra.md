# Access And Infrastructure Spec

Status: Normative

## Intent

Define the access and provisioning model for Cloudflare, Supabase, Terraform, and CI.

## Agent Access

Agents may assume full authenticated access to:

- `gh`
- `wrangler`
- Supabase

Agents may inspect, create, update, and verify resources in task scope.

## CI Secrets

GitHub Actions must expose:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `SUPABASE_API_KEY`

Non-secret Terraform inputs, such as Supabase organization ID and resource names, may be committed as environment config.

## Provisioning Rule

All Cloudflare and Supabase resources must be created programmatically through Orun jobs in CI.

Manual console changes are allowed only for emergency repair or when the human provides an existing account/resource baseline. Existing resources must be discovered, verified, and reconciled into Terraform or repo config before later tasks depend on them.

Current baseline to preserve:

- Cloudflare account ID: `f9270f828799775bebf9315248fdf717`
- Primary Hyperdrive resource name: `sourceplane-db`
- A V1 Supabase Postgres database already exists behind that Hyperdrive resource.

Do not recreate the existing database or Hyperdrive resource blindly. Adoption work must inspect the live resource state first and record the observed IDs/configuration in the task report.

## Terraform Ownership

Use Terraform for:

- Cloudflare resources and worker bindings
- adoption/import metadata for existing Cloudflare Hyperdrive
- future Supabase resources when they are not already provided by the human baseline
- Worker bindings and infrastructure config

Terraform state must use Cloudflare R2 as the backend.

The primary database Hyperdrive resource name is `sourceplane-db`.

## Terraform Shape

Greenfield environments may use this shape. The current V1 environment already has the database and `sourceplane-db` Hyperdrive baseline, so adoption/import work must not apply this as a create-new-resources plan without explicit human approval.

```hcl
resource "random_password" "supabase_db" {
  length  = 32
  special = false
}

resource "supabase_project" "main" {
  organization_id   = var.supabase_org_id
  name              = "sourceplane"
  region            = "ap-southeast-1"
  database_password = random_password.supabase_db.result
}

resource "cloudflare_hyperdrive_config" "main" {
  account_id = var.cloudflare_account_id
  name       = "sourceplane-db"

  origin = {
    database = "postgres"
    host     = "db.${supabase_project.main.id}.supabase.co"
    port     = 5432
    user     = "postgres"
    password = random_password.supabase_db.result
    scheme   = "postgresql"
  }
}
```

## Orun Components

Infrastructure provisioning must be represented as Orun-discovered components under `infra/`.

Minimum components:

- `infra/terraform/state/component.yaml`
- `infra/terraform/core/component.yaml`
- `tests/infra/component.yaml`

CI must run Terraform plan and apply through Orun. Direct Terraform workflow steps are prohibited.

## Acceptance Criteria

- Terraform backend uses R2, or the missing R2 backend is explicitly recorded as the next provisioning step.
- Existing Supabase project/database baseline is discovered and recorded before dependent work begins.
- Existing `sourceplane-db` Hyperdrive baseline is discovered and recorded before dependent work begins.
- Newly created database credentials are generated once and retained in Terraform state; pre-existing credentials must not be rotated or exposed by adoption work.
- Cloudflare resources are Terraform-owned or have a documented Terraform import/adoption path.
- Worker infrastructure config is Terraform-owned.
- Orun can run infra plan locally and in GitHub Actions.
- Resource creation is verified after apply.
