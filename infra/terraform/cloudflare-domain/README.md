# cloudflare-domain

Manages the Cloudflare zone and attaches Workers Custom Domains to
environment-specific console Workers. Domain configuration is driven by
environment variables declared in `intent.yaml`.

## Purpose

Provides Cloudflare custom domain management as a first-class Orun component.
The zone already exists in the Cloudflare account (`zoneMode: existing`), so
this component adopts it without creating a duplicate.

## Environment Variables

Custom domain configuration flows from `intent.yaml` environment-level `env:`
declarations:

| Variable | Description | Example |
|----------|-------------|---------|
| `BASE_DOMAIN` | Root domain for the zone | `sourceplane.ai` |
| `CONSOLE_CUSTOM_DOMAIN` | Custom domain for the console Worker | `stage.sourceplane.ai` |

These are exported as `TF_VAR_*` by the Orun job template and consumed by
Terraform. The same variables are available to Workers (via `wrangler.jsonc`
vars) for runtime CORS decisions.

## Resources Managed

| Resource | Description |
|----------|-------------|
| `data.cloudflare_zone.existing` | Looks up the existing zone (when `zoneMode: existing`) |
| `cloudflare_zone.managed` | Creates a new zone (when `zoneMode: managed`) |
| `cloudflare_workers_domain.console` | Attaches `CONSOLE_CUSTOM_DOMAIN` to `{workerNamePrefix}-{environment}` (Worker Custom Domain) |

> Note: the resource is named `cloudflare_workers_domain` in the Cloudflare
> Terraform provider v4.x. (The equivalent v5 name is
> `cloudflare_workers_custom_domain` — we have not migrated to v5.)

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `baseDomain` | yes | Root domain (e.g. `sourceplane.ai`) |
| `zoneMode` | yes | `existing` or `managed` |
| `workerNamePrefix` | yes | Worker name prefix (e.g. `sourceplane-web-console-next`); fully-qualified service name is `{workerNamePrefix}-{environment}` |
| `pagesProjectPrefix` | legacy | Retained read-only for one soak cycle post task-0083; no resource consumes it. Slated for removal in a follow-up task. |
| `stackName` | yes | Terraform stack identifier |
| `terraformDir` | yes | Path to Terraform root |
| `terraformVersion` | yes | Terraform CLI version |

## Changing the Base Domain (another context)

1. Update `intent.yaml` → each environment's `env.BASE_DOMAIN` to the new domain.
2. Update `intent.yaml` → each environment's `env.CONSOLE_CUSTOM_DOMAIN` with new hostnames.
3. If the domain is NOT already in Cloudflare, set `zoneMode: managed` in
   `component.yaml`. Terraform will create the zone.
4. After the first apply with `managed` mode, add the NS records at your
   registrar pointing to the Cloudflare nameservers shown in the output.
5. Wait for zone activation (Cloudflare verifies NS delegation).
6. Subsequent applies will attach Workers custom domains.

## Zone Modes

### existing (adopt)

- Uses `data.cloudflare_zone` to look up by domain name.
- No zone creation or deletion.
- Safe for domains already managed in Cloudflare.

### managed (create)

- Creates `cloudflare_zone` resource.
- Full lifecycle management (including potential deletion on `terraform destroy`).
- Requires NS delegation at the registrar after first apply.

## Post-Merge Verification

After merge to main, verify:

1. `terraform apply` succeeds in CI (`github-push-main` trigger).
2. Workers custom domains show `active` status in Cloudflare (Workers → the
   `sourceplane-web-console-next-{env}` Worker → Triggers → Custom Domains).
3. `https://stage.sourceplane.ai/` serves the stage console (web-console-next).
4. `https://prod.sourceplane.ai/` serves the prod console (web-console-next).
5. SSL certificates are provisioned (automatic via Cloudflare).

## Outputs

- `zone_id` — Cloudflare zone identifier
- `zone_name` — Domain name
- `zone_status` — Zone activation status
- `console_custom_domain` — The custom domain hostname for this environment
- `pages_project_name` — Legacy Pages project name (read-only output retained one soak cycle; slated for removal)
- `worker_custom_domain_id` — ID of the `cloudflare_workers_domain.console` resource
