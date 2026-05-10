# infra/terraform/core

Core Terraform component. Provisions Supabase project, Cloudflare Hyperdrive,
Worker infrastructure, and environment configuration.

**This component does not provision any live resources in this PR.**
Resource provisioning is deferred to a later task after the workspace and Orun skeleton exist.

## Planned Resources

- Supabase project and database
- Cloudflare Hyperdrive: `sourceplane-db`
- Worker secrets and bindings
- Environment-specific Cloudflare configuration

## Implementation Deferred

See `ai/tasks/task-0001.md` Non-Goals and `ai/context/decisions.md` for rationale.
