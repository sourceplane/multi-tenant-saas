# SS3 — Seeding the worker-secrets escrow (human runbook)

One-time (per environment) operator action that moves the manually-managed
worker secrets into the AWS Secrets Manager escrow. After this, the
`secrets-live` deploy step owns Cloudflare-side secrets — never run
`wrangler secret put` by hand again; rotate by updating the escrow and
letting the next deploy push it.

## Prerequisites

- AWS credentials with Secrets Manager write access to
  `sourceplane/multi-tenant-saas/*` (the aws-admin repo-scoped roles, or an
  operator with equivalent access).
- The live values for every secret in `secrets.manifest.json` with
  `required` entries. **Critical:** `SECRET_ENCRYPTION_KEY` values encrypt
  data at rest — escrow the values currently deployed, do NOT generate new
  ones (a regenerated key bricks stored webhook endpoints and integration
  tokens).

## Steps (per environment: stage, then prod)

1. Build the escrow document locally in a private shell (never in a repo
   checkout, never echoed). Shape — `worker → SECRET_NAME → value`:

   ```json
   {
     "identity-worker": {
       "GITHUB_OAUTH_CLIENT_SECRET": "…",
       "GOOGLE_OAUTH_CLIENT_SECRET": "…",
       "OAUTH_STATE_SECRET": "…"
     },
     "billing-worker": {
       "POLAR_ACCESS_TOKEN": "…",
       "POLAR_WEBHOOK_SECRET": "…"
     },
     "webhooks-worker": { "SECRET_ENCRYPTION_KEY": "…" },
     "config-worker": { "SECRET_ENCRYPTION_KEY": "…" }
   }
   ```

   (integrations-worker joins when its GitHub App lands — see the manifest's
   `deferred` block.)

2. Validate completeness offline before uploading (prints names and
   fingerprints only):

   ```bash
   mkdir -p /tmp/escrow && cp escrow-stage.json /tmp/escrow/worker-secrets__stage.json
   node tooling/secrets-sync/check.mjs --escrow-dir /tmp/escrow \
     --manifest tooling/secrets-sync/secrets.manifest.json
   # expect: "in sync" for the env you provided; ignore the missing-file
   # violation for the env you haven't built yet
   ```

3. Upload:

   ```bash
   aws secretsmanager create-secret \
     --name sourceplane/multi-tenant-saas/worker-secrets/stage \
     --secret-string file://escrow-stage.json
   # (use put-secret-value instead if the secret already exists)
   ```

4. Shred the local file: `shred -u escrow-stage.json` (or at minimum `rm`
   from an encrypted volume).

5. Trigger any worker deploy (or merge any PR touching a worker). The
   `secrets-live` step logs `changed`/`unchanged` per secret name and writes
   the fingerprint record. First run after seeding pushes everything.

6. Confirm: the deploy log shows `secrets-live: … pushing N secret(s)`, and
   a second deploy shows `in sync — nothing to push`.

## Rotation (after seeding)

Update the value in the escrow document (`put-secret-value` with the full
updated JSON), then deploy the affected worker. Do not touch Cloudflare
directly — `secrets-live` detects the fingerprint change and pushes.
