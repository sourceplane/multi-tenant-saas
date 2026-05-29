     1|# Current Context
     2|
     3|Last updated: 2026-05-29 (Task 0088 Verifier PASS — PR #136 merged at
     4|`d9968ad`, post-merge main-CI `26659213313` 5/5 SUCCESS, both
     5|`membership-worker-stage` and `membership-worker-prod` redeployed with
     6|`env.NOTIFICATIONS_WORKER` binding active)
     7|
     8|## No active task
     9|
    10|Task 0088 (membership-worker → notifications-worker `invitation.created`
    11|wire) is verified and merged. Awaiting next orchestrator tick.
    12|
    13|### Next-task candidates
    14|
    15|1. **Provision `notifications-worker-dev` + dev binding** — closes the
    16|   dev-wire gap exposed in Tasks 0087 and 0088 (both identity-worker
    17|   AND membership-worker dev blocks are intentionally bindings-less
    18|   because no `notifications-worker-dev` exists). Single
    19|   wrangler/component change unblocks the dev enqueue path for both.
    20|2. **`accept-invitation` → `invitation.accepted` wire** — second
    21|   invitation-category template; third overall caller of
    22|   notifications V1, which earns the shared
    23|   `@saas/notifications-client` package extraction (currently
    24|   duplicated in identity-worker and membership-worker).
    25|3. **Real notifications provider swap** — Resend / Postmark / SES into
    26|   `apps/notifications-worker/src/providers/`. Currently deferred
    27|   awaiting user choice.
    28|4. **Pre-existing `identity-worker-tests` Fetcher/crypto TS-type fix**
    29|   — pre-existing, reproduces on clean `main`. Small follow-up.
    30|5. **Revive Task 0085b** when the user lifts the defer
    31|   (cloudflare-domain v4 → v5 + `import {}` re-adoption).
    32|
    33|## Repo health: green
    34|
    35|Apex hostnames `stage.sourceplane.ai` and `prod.sourceplane.ai` live on
    36|the original Cloudflare Workers custom-domain attachments (stage id
    37|`052eaece5e989d5a7280b6c206e562c42950e3a6`, prod id
    38|`31e5f2ed1b1e4a5700e8ae0678846a0d753840e1`). Provider pin holds at
    39|`cloudflare ~> 4.52` (Task 0085b deferred). `kiox.lock` pinned at orun
    40|v2.9.0. `main` tip on `origin/main` is `d9968ad` (post Task 0088
    41|squash merge).
    42|
    43|notifications-worker V1 stays deployed on stage + prod (private,
    44|`workers_dev: false`, `NOTIFICATIONS_PROVIDER=local-debug`). It now has
    45|TWO real callers:
    46|
    47|- identity-worker prod fires `auth.magic_link` enqueues on every
    48|  non-debug login (Task 0087).
    49|- membership-worker prod fires `invitation.created` enqueues after
    50|  every successful `executor.transaction()` commit on
    51|  `POST /v1/organizations/:id/invitations` (Task 0088). Stage continues
    52|  to short-circuit on `DEBUG_DELIVERY=true`.
    53|
    54|## Recently completed — Task 0088 (membership → notifications invitation.created wire, PASS)
    55|
    56|- **PR #136** (`impl/task-0088-membership-notifications-wire`), squash
    57|  `d9968ad` at 2026-05-29T19:59:13Z. Files: `apps/membership-worker/{wrangler.jsonc,src/env.ts,src/handlers/create-invitation.ts,src/notifications-client.ts}`,
    58|  2 new test files, ai/ tasks + reports.
    59|- PR-CI run `26658570311` (original head) and `26659125466` (with
    60|  verifier report commit `94f75ac`) both 5/5 SUCCESS.
    61|- Post-merge main-CI run `26659213313` = 5/5 SUCCESS. Worker deploys
    62|  logged `env.NOTIFICATIONS_WORKER (notifications-worker-stage)` /
    63|  `(notifications-worker-prod)` bindings:
    64|  `membership-worker-stage` @ `ad86086a-4d93-434a-991c-c0531f2d1784`,
    65|  `membership-worker-prod` @ `ed626b76-6d3b-4126-81a6-3df608b15ef5`.
    66|  Total upload 231.21 KiB / 43.51 KiB gzip.
    67|- Live curl post-merge: `https://stage.sourceplane.ai/` and
    68|  `https://prod.sourceplane.ai/` → 200 (redirected to `/orgs`);
    69|  notifications-worker private `1042` invariants intact on both envs.
    70|- All five implementer deviations accepted by verifier with
    71|  documented reasoning: `templateKey="invitation.created"`, in-place
    72|  client duplication (deferred shared-package extraction), DEBUG
    73|  short-circuit, dev block bindings-less, kiox.lock revert.
    74|- Reports: `ai/reports/task-0088-implementer.md`,
    75|  `ai/reports/task-0088-verifier.md`.
    76|
    77|## Recently completed — Task 0087 (identity → notifications magic-link wire, PASS)
    78|
    79|- **PR #135** (`impl/task-0087-identity-notifications-wire`), squash
    80|  `5192ffd` at 2026-05-29T19:19:59Z. Identity-worker prod now fires an
    81|  `auth.magic_link` enqueue on every non-debug login. Best-effort
    82|  contract held: notifications failure cannot 5xx login.
    83|- Reports: `ai/reports/task-0087-implementer.md`,
    84|  `ai/reports/task-0087-verifier.md`.
    85|
    86|## Recently completed — Task 0086 (notifications-worker V1, PASS)
    87|
    88|- **PR #134** (`impl/task-0086-notifications-worker`), squash `2bb088f`
    89|  at 2026-05-29T18:03:51Z. Notifications-worker V1 deployed on
    90|  stage+prod, internal-only, `NOTIFICATIONS_PROVIDER=local-debug`.
    91|- Reports: `ai/reports/task-0086-implementer.md`,
    92|  `ai/reports/task-0086-verifier.md`.
    93|
    94|## Deferred — Task 0085b (cloudflare-domain v4 → v5, Phase 2)
    95|
    96|User has explicitly deferred 0085b. The narrow Terraform-tracking risk
    97|window from Task 0085a remains open: the two live custom-domain
    98|attachments are **not** Terraform-managed between the 0085a merge and
    99|the eventual 0085b apply. Mitigation: no manual Cloudflare-dashboard
   100|or wrangler edits to those attachments while 0085b is parked. Tasks
   101|0086, 0087, and 0088 were verified post-merge to NOT touch
   102|`infra/terraform/cloudflare-domain/**` so the window does not widen.
   103|
   104|When the user lifts the defer, scope 0085b as previously laid out:
   105|bump `required_providers.cloudflare.version` from `~> 4.52` to
   106|`~> 5.0`; replace the fenced v4 `cloudflare_workers_domain.console`
   107|block with v5 `resource cloudflare_workers_custom_domain.console`;
   108|add `import {}` blocks keyed by `var.environment` re-adopting the
   109|two known immutable IDs; restore `output worker_custom_domain_id`
   110|to the real attachment ID; refresh `.terraform.lock.hcl` to
   111|cloudflare 5.x multi-arch; drop the `removed {}` block and Phase 1
   112|fence comments.
   113|
   114|## Orchestrator Policy — Deferred Decision Protocol
   115|
   116|Per `agents/orchestrator.md`, candidates that would require human input
   117|are **deferred to `/ai/deferred.md`** instead of pausing the loop.
   118|`waiting_for_input` only flips to `"true"` if EVERY candidate is
   119|genuinely blocked on a human decision. Currently deferred:
   120|
   121|- Real notifications provider swap (Resend / Postmark / SES) — awaiting
   122|  user provider choice. Notifications-worker stays on `local-debug`;
   123|  Tasks 0087 and 0088 are unaffected (best-effort enqueue + local-debug
   124|  emission).
   125|- Task 0085b cloudflare-domain v4→v5 + import — explicit user defer.
   126|
   127|## Roadmap Position
   128|
   129|- Baseline cluster: B2 (notifications worker) shipped in Task 0086.
   130|- B1 (real auth) progressed in Task 0087: identity magic-link wired
   131|  to notifications V1. Task 0088 added a second real caller
   132|  (membership-worker invitation-email). Real provider swap is the next
   133|  big leap when the user picks one.
   134|
   135|## Repo Reality
   136|
   137|- Tasks 0001–0088 verified and merged.
   138|- Task 0085 split into 0085a (Phase 1, DONE) + 0085b (Phase 2,
   139|  EXPLICITLY DEFERRED by user).
   140|- Active spec pack: reusable SaaS starter under `specs/**`.
   141|- Console is live at `https://{stage,prod}.sourceplane.ai`.
   142|- Notifications-worker V1 is internal-only, deployed on stage/prod;
   143|  identity-worker prod (auth.magic_link) AND membership-worker prod
   144|  (invitation.created) are both live callers (local-debug provider).
   145|- `notifications-client.ts` currently duplicated in identity-worker
   146|  AND membership-worker. Extract to a shared
   147|  `@saas/notifications-client` package on the next (third) caller.
