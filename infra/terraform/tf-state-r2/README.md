# tf-state-r2

Cloudflare R2 state bucket — legacy Terraform state backend.

> **Migration Note:** This component is a migration target. The new backend
> direction is AWS S3 (see Task 0005). This component remains to document
> existing state and provide a clean migration path.

## Resources

| Resource | Description |
| --- | --- |
| `cloudflare_r2_bucket.tf_state` | R2 bucket `sourceplane-tf-state` |

## Parameters

| Parameter | Value | Source |
| --- | --- | --- |
| `orgName` | `sourceplane` | component |
| `stackName` | `tf-state-r2` | component |
| `terraformDir` | `.` | component |
| `terraformVersion` | `1.15.3` | component |

## Outputs

| Output | Description |
| --- | --- |
| `bucket_name` | Name of the R2 bucket |

## Dependencies

None (root component).

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

- The R2 bucket `sourceplane-tf-state` does not yet exist.
- Once AWS S3 state is available (Task 0005), this component will be
  decommissioned and state migrated.
- Do not use this bucket for new components; new state goes to S3.
