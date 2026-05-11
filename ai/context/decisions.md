# Decisions

Last updated: 2026-05-11

## Active Decisions

- Use `specs/**` as the authoritative spec pack for current work. Do not read or apply `specs-v2/**` unless the task is product-specific Git catalog or CI intelligence work.
- Treat the repo-relative `ai/` directory as the active planning state location for this checkout. The orchestrator text uses `/ai/...` paths conceptually, while `agents/agent-loop.sh` reads `ai/state.json` and `ai/waiting_for_input.md` relative to the workspace.
- The first implementation PR must establish Orun-discovered repo structure before domain code.
- Do not create or mutate live Cloudflare/Supabase resources in Task 0001. Infrastructure provisioning will be a later PR after the workspace and Orun skeleton exist.
- Use committed `stack-tectonic/` as the repo-owned local composition catalog. `intent.yaml` points at it with `kind: dir` / `path: stack-tectonic/`.
- Treat `.orun/` as generated local Orun state; do not commit plans, component trees, or composition locks from `.orun/`.
- Cloudflare account `f9270f828799775bebf9315248fdf717`, Hyperdrive `sourceplane-db`, and the V1 Supabase database are human-provided baseline resources. Adoption tasks must inspect and reconcile them rather than recreating them.

## Pending Decisions

- None currently block Task 0002.
