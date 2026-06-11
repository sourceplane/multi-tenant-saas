# saas-integrations — Implementation Status

As-built record. Epic promoted from the P5 holding register on 2026-06-11
(#302) after a verified-live stage walkthrough confirmed the rails (B1 OAuth,
B5 outbound webhooks, B11 entitlements, console shell).

## Summary

| ID | Status |
|----|--------|
| IG0 | ✅ Shipped (#307) — dormant foundation: spec 17, contracts, `180_integrations_foundation`, repo layer, worker skeleton; stage `/health` + migration apply verified post-merge |
| IG1 | 🗓️ Planned — human-independent parts can proceed; live connect path gated on D1 (GitHub App per environment) |
| IG2 | 🗓️ Planned |
| IG3 | 🗓️ Planned |
| IG4 | 🗓️ Planned |
| IG5 | 🗓️ Planned |
| IG6 | 🗓️ Planned |
| IG7 | 🗓️ Planned (optional tail) |

## Notes

- 2026-06-11: IG0 deploy follow-up — the first main-push deploy failed
  attaching the worker's cron schedule: the Cloudflare account is at its
  **5-cron-trigger limit** (webhooks-worker + metering-worker × stage/prod).
  Cron removed from `wrangler.jsonc` (the IG0 worker is dormant and does not
  need it). **The IG2 inbox drain requires a cron slot** — operator must
  upgrade the Workers plan or free a slot before IG2 ships.

- 2026-06-11: IG0 (#307, task 0138) landed the bounded context with zero live
  behavior. No public route beyond `/health`; provider credentials are
  per-environment worker secrets (all unset — worker reports
  `githubApp.configured: false` on `/health`). Migration applies via the
  standard db-migrate apply profile on main push.
- Human gates outstanding (risks-and-open-questions.md): **D1** App
  registration per environment (blocks IG1+ live paths), **D2** App permission
  set (blocks the registration form), **D3** broker exposure posture (IG4),
  **D4** plan placement for `feature.integrations.github` / `limit.repo_links`
  (blocks IG1 gate wiring — until decided, gates evaluate against whatever the
  catalog ships, defaulting closed).
