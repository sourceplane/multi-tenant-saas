# Deferred Candidates

Tasks the orchestrator has parked because they require human input or an
external decision. The orchestrator loop continues with the next safe candidate
instead of blocking on these. See `agents/orchestrator.md` → "Deferred
Decision Protocol".

When a deferred entry is unblocked (user answers, upstream lands, etc.),
remove it from this file and treat it as a normal candidate in the next
selection pass.

---

## Real notifications provider swap
- Deferred: 2026-05-30
- Blocking decision: Which transactional email provider does the user want
  wired behind `NOTIFICATIONS_PROVIDER` — Resend, Postmark, or SES? Each
  has different secrets, sender-identity setup, and billing posture.
- Unblock signal: user names a provider (and confirms a verified sender
  domain / API key path).
- Notes: notifications-worker V1 already ships an adapter seam
  (`apps/notifications-worker/src/providers/`) gated on
  `NOTIFICATIONS_PROVIDER`. Drop-in once the choice is made.

## Task 0085b — cloudflare-domain v4 → v5 + re-import
- Deferred: 2026-05-29 (explicit user defer, carried over from prior state)
- Blocking decision: user wants the Phase 2 provider bump + `import {}`
  re-adoption parked while the two live custom-domain attachments stay
  Cloudflare-managed only.
- Unblock signal: user lifts the defer.
- Notes: Two live attachment IDs to re-import — stage
  `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod
  `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`. No manual Cloudflare-dashboard
  or wrangler edits to these while parked. Task 0087 (and any task until
  0085b lands) must not touch `infra/terraform/cloudflare-domain/**` or
  the cloudflare provider pin.
