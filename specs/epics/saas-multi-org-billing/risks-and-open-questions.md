# saas-multi-org-billing — Risks & Open Questions

Live register of the product/architecture decisions and human-gated items that
block **paid** multi-org (MO2+). MO1 (the dormant seam) is safe to build before
any of these are resolved. When an entry is answered, record the decision in
`core/decisions` / `ai/context/decisions.md` and treat the milestone as a normal
candidate.

## ⛔ Human-input / product gates (do NOT auto-pick)

| Item | Blocking decision | Unblock signal |
|------|-------------------|----------------|
| **Merchant-of-Record posture** | The provider sub-epic's first adapter (Polar) makes **Polar the legal seller of record** (handles tax/VAT). Acceptable, or must the seller be Sourceplane (→ a PSP like Stripe + own tax)? Drives which adapter ships first. | User confirms MoR-vs-PSP. (Also gates `billing-provider-abstraction` BP1 vs BP3 ordering.) |
| **Self-serve vs sales-gated multi-org** | Datadog gates multi-org behind support. Do we sell it self-serve via checkout, or behind "contact sales"/admin enablement? | Product decides; changes whether MO2 ends in checkout or a lead form. |
| **Provider credentials** | The chosen provider's API token + webhook secret (per env). | User supplies creds (same gate as B6). |

## Architecture decisions (resolve before MO3/MO4)

| Item | Options | Recommendation |
|------|---------|----------------|
| **Limit semantics across the account** | (a) per-org inherited limits (each child gets the plan's `limit.projects` etc.; only `limit.organizations` is parent-level); (b) pooled quotas shared across all orgs. | **(a)** — keeps the per-org `check-entitlement` hot path and matches Datadog (pool only usage/billing). Build (b) only on demand. |
| **Downgrade below the org limit** | (a) block creating new children only (grandfather existing); (b) force-detach the newest children to free; (c) freeze children read-only. | Lean **(a) grandfather + block-new**; least destructive, fully auditable. Confirm with product. |
| **Parent role / ownership transfer** | Can the billing parent be reassigned to another org in the account? What happens to the parent's own projects? | Defer to a follow-up; MO1–MO6 assume the first/default org stays the parent. |
| **Cross-org membership & RBAC** | Does an account admin automatically administer all child orgs, or is membership still per-org? | Default: **membership stays per-org** (preserves the audit/isolation boundary in `core/domain-model.md`); account-level roles are a `components/04` follow-up, out of scope here. |

## Notes / non-blocking

- **No live-data migration risk:** every existing org is standalone
  (`parent_org_id NULL`); the feature is dormant until purchased (see
  `design.md` §8). MO1 carries near-zero blast radius.
- **Isolation invariant holds:** child orgs keep their own `org_id` scope, audit,
  and project isolation — multi-org changes *who pays*, not the tenancy boundary.
- **Usage rollup is read-only:** MO4 aggregates existing `metering` rollups; it
  does not add metering ownership or new write paths.
</content>
