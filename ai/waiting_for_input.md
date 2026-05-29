# Waiting For Input

None. Orchestrator loop is unblocked and proceeding.

Per the new Deferred Decision Protocol in `agents/orchestrator.md`,
candidates that would require human input are parked in
`/ai/deferred.md` instead of pausing the loop. The orchestrator
continues with the next safe, human-independent candidate. This file
only carries content when **every** candidate is blocked on a human
decision — which is not the case right now.

Active state:

- Task 0087 (identity-worker magic-link → notifications-worker wiring)
  is scoped at `ai/tasks/task-0087.md`. Implementer can begin.
- Deferred backlog (`/ai/deferred.md`): real notifications provider
  swap (Resend/Postmark/SES choice), and Task 0085b cloudflare-domain
  v4→v5 re-import. Neither blocks 0087.

Live invariants holding (unchanged since 0086 merge):
- `https://stage.sourceplane.ai/` → 200 `<title>Sourceplane Console</title>`
- `https://prod.sourceplane.ai/`  → 200 `<title>Sourceplane Console</title>`
- `https://sourceplane-web-console-next-stage.rahulvarghesepullely.workers.dev/` → 200
- `https://sourceplane-web-console-next-prod.rahulvarghesepullely.workers.dev/`  → 200
- Stage custom-domain attachment id: `052eaece5e989d5a7280b6c206e562c42950e3a6`
- Prod  custom-domain attachment id: `31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`
- Notifications-worker stage/prod: internal-only, NOTIFICATIONS_PROVIDER=local-debug.
