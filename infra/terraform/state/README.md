# infra/terraform/state

Terraform backend bootstrap component. Provisions the Cloudflare R2 bucket used
as the Terraform remote state backend for all other infra components.

**This component does not provision any live resources in this PR.**
Resource provisioning is deferred to a later task after the workspace and Orun skeleton exist.

## Planned Resources

- Cloudflare R2 bucket: `sourceplane-tf-state`
- R2 bucket CORS and lifecycle rules

## Implementation Deferred

See `ai/tasks/task-0001.md` Non-Goals and `ai/context/decisions.md` for rationale.
