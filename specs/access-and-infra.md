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

Manual console changes are allowed only for emergency repair and must be reconciled back into Terraform or repo config.

## Terraform Ownership

Use Terraform for:

- Supabase project
- Supabase database password generation
- Cloudflare Hyperdrive
- Worker bindings and infrastructure config

Terraform state must use Cloudflare R2 as the backend.

The primary database Hyperdrive resource name is `sourceplane-db`.

## Terraform Shape

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

- Terraform backend uses R2.
- Supabase project is Terraform-owned.
- Database password is generated once and retained in Terraform state.
- Cloudflare Hyperdrive is Terraform-owned.
- Worker infrastructure config is Terraform-owned.
- Orun can run infra plan locally and in GitHub Actions.
- Resource creation is verified after apply.
