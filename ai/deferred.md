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
  `NOTIFICATIONS_PROVIDER`. Drop-in once the choice is made. Task 0089
  will leave this seam untouched.

## Task 0085b — cloudflare-domain v4 → v5 + re-import
- Deferred: 2026-05-29 (explicit user defer, carried over from prior state)
- Blocking decision: user wants the Phase 2 provider bump + `import {}`
  re-adoption parked while the two live custom-domain attachments stay
  Cloudflare-managed only.
- Unblock signal: user lifts the defer.
- Notes: Two live attachment IDs to re-import — stage
  `052eaece5e989d5a7280b6c206e562c42950e3a6`, prod
  `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`. No manual Cloudflare-dashboard
  or wrangler edits to these while parked. Task 0089 must not touch
  `infra/terraform/cloudflare-domain/**` or the cloudflare provider pin.

## notifications-worker-dev provisioning + dev binding
- Deferred: 2026-05-30 (parked behind Task 0089, not blocked on user input —
  scoped as a narrow follow-up so 0089 can stay focused on the third-caller
  wire + shared-package extraction)
- Blocking decision: none (technical follow-up, will be selected after 0089
  merges).
- Unblock signal: Task 0089 verified + merged.
- Notes: After 0089 lands, identity-worker dev block AND both
  membership-worker handler dev blocks remain bindings-less because no
  `notifications-worker-dev` exists. Single-PR follow-up will provision
  `notifications-worker-dev` and add the `NOTIFICATIONS_WORKER` service
  binding to all three consumer wrangler dev blocks in one change,
  closing the dev enqueue gap for the entire V1 caller set at once.
