# infra/terraform/state

Terraform backend bootstrap component. Provisions the Cloudflare R2 bucket used
as the Terraform remote state backend for all other infra components.

## Observed Baseline (Task 0002 Discovery)

| Item | Status |
|---|---|
| Cloudflare account ID | `f9270f828799775bebf9315248fdf717` (confirmed via `wrangler whoami`) |
| R2 bucket `sourceplane-tf-state` | **Does not exist yet.** Only `orun-storage` exists. |
| R2 bucket `orun-storage` | Exists (created 2026-05-02). Not managed by this component. |

## Resources

- `cloudflare_r2_bucket.tf_state` – Creates the `sourceplane-tf-state` R2 bucket.

## Adoption Status

The R2 state bucket does not exist yet, so this is a **create** (not import).

## Next Steps

1. Set `CLOUDFLARE_API_TOKEN` in CI secrets.
2. Run `terraform apply` via Orun to create the bucket.
3. After bucket exists, migrate `core/` backend from local to R2.
