# infra-terraform-core

Core Terraform component managing Cloudflare Hyperdrive configuration and
environment-level infrastructure bindings.

## Resources

| Resource | Description |
| --- | --- |
| `cloudflare_hyperdrive_config.sourceplane_db` | Adopts existing Hyperdrive `sourceplane-db` via import |

## Parameters

| Parameter | Value | Source |
| --- | --- | --- |
| `orgName` | `sourceplane` | component |
| `stackName` | `infra-terraform-core` | component |
| `terraformDir` | `.` | component |
| `terraformVersion` | `1.15.3` | component |

## Outputs

| Output | Description |
| --- | --- |
| `hyperdrive_id` | Hyperdrive configuration ID |

## Dependencies

| Component | Condition |
| --- | --- |
| `tf-state-r2` | State bucket must exist before init |

## Environments

| Environment | Default Profile | Apply Trigger |
| --- | --- | --- |
| dev | `plan-only` | `github-push-main` |
| stage | `plan-only` | `github-push-main` |
| prod | `plan-only` | `github-push-main` |

## Local Verification

```bash
kiox -- orun validate --intent intent.yaml
kiox -- orun plan --changed --intent intent.yaml --output plan.json
```

## Operational Notes

- Requires `TF_VAR_hyperdrive_origin_user` and `TF_VAR_hyperdrive_origin_password`
  at apply time. These must never be committed.
- The Hyperdrive config already exists (ID: `d9c62c4acf934dd7bb82f63ed02db564`).
  First apply imports it into state.
- After S3 migration (Task 0005), backend config will switch from R2 to S3.
