# saas-bootstrap-factory — implementation status (as-built)

As-built record for the BF epic. Distinct from `implementation-plan.md` (intent)
and `README.md` (at-a-glance). One row per shipped milestone, newest first.

| Milestone | Status | What shipped | PR |
|-----------|--------|--------------|----|
| BF1 | ✅ Shipped | Encoded the real infra dependency DAG as `dependsOn` edges: `supabase → bootstrap`, `cloudflare-hyperdrive → supabase`, `db-migrate → supabase` (alongside existing `db-migrate → db`); `cloudflare-kv` left independent. Verified with `orun validate` + `orun plan --view dag` — edges resolve per-environment in stage and prod, no cycle. Confirmed the cross-env `dependsOn` limitation only affects components with no overlapping environments; recorded in `ai/context/decisions.md`. | _this PR_ |
| BF0 | ✅ Shipped | Docs truth pass: rewrote root `README.md` to the real component inventory + status (was claiming Workers/Hyperdrive/migrations unimplemented); removed the personal `/Users/irinelinson/.local/bin/kiox` path from all active docs in favor of `kiox`; made `kiox.yaml` the single source of truth for the Orun runtime version (dropped the stale `v2.3.0` literals in `orun-golden-path.md` and `access-and-infra.md`). `specs/_archive/` left frozen as historical record. | _this PR_ |

## Notes

- BF0 is docs-only: `specs/` and root docs are not Orun discovery roots, so the
  compiled plan DAG is unchanged and CI produces no component jobs.
- Follow-on milestones (BF1+) begin changing `component.yaml` and Stack Tectonic
  contracts and will produce real plan/verify jobs.
