# infra/terraform/core

Core Terraform component. Adopts existing Cloudflare Hyperdrive and will
eventually manage Supabase project, Worker bindings, and environment config.

Depends on `infra-terraform-state` (the R2 state bucket must exist first).

## Observed Baseline (Task 0002 Discovery)

| Resource | Status | Details |
|---|---|---|
| Hyperdrive `sourceplane-db` | **Exists** | ID: `d9c62c4acf934dd7bb82f63ed02db564` |
| Hyperdrive origin host | — | `aws-1-ap-southeast-1.pooler.supabase.com:5432` |
| Hyperdrive origin user | — | `postgres.kfgwglxvxoiisoakkndm` (Supabase pooler format) |
| Hyperdrive origin database | — | `postgres` |
| Hyperdrive `oruncloud-db` | Exists (unrelated) | ID: `d8cada8abda7451aaa1e2ce189dc8a17` – not managed here |
| Supabase project ref | Inferred | `kfgwglxvxoiisoakkndm` (from pooler username) |
| Supabase region | Inferred | `ap-southeast-1` (from pooler hostname) |

## Resources

- `cloudflare_hyperdrive_config.sourceplane_db` – Adopts the existing Hyperdrive via `import` block.

## Adoption Status

The Hyperdrive config already exists. An `import` block is declared so that
`terraform apply` will adopt it into state without recreating it.

**Credentials required at apply time** (via `TF_VAR_hyperdrive_origin_user` and
`TF_VAR_hyperdrive_origin_password`):
- The Supabase pooler user and password. These must NOT be committed.

## Next Steps

1. Provision the R2 state bucket (state component).
2. Set `TF_VAR_hyperdrive_origin_user` and `TF_VAR_hyperdrive_origin_password` in CI.
3. Run `terraform apply` via Orun to import the existing Hyperdrive.
4. Verify state matches live config with `terraform plan` (expect no changes).
5. Add Supabase project resource once Supabase Terraform provider credentials are available.
