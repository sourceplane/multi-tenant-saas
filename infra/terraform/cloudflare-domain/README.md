# cloudflare-domain

Manages the Cloudflare zone and attaches custom domains to environment-specific
Pages projects. Domain configuration is driven by environment variables declared
in `intent.yaml`.

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
| `CONSOLE_CUSTOM_DOMAIN` | Custom domain for the console Pages project | `stage.sourceplane.ai` |

These are exported as `TF_VAR_*` by the Orun job template and consumed by
Terraform. The same variables are available to Workers (via `wrangler.jsonc`
vars) for runtime CORS decisions.

## Resources Managed

| Resource | Description |
|----------|-------------|
| `data.cloudflare_zone.existing` | Looks up the existing zone (when `zoneMode: existing`) |
| `cloudflare_zone.managed` | Creates a new zone (when `zoneMode: managed`) |
| `cloudflare_pages_domain.console` | Attaches `CONSOLE_CUSTOM_DOMAIN` to `{pagesProjectPrefix}-{environment}` |

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `baseDomain` | yes | Root domain (e.g. `sourceplane.ai`) |
| `zoneMode` | yes | `existing` or `managed` |
| `pagesProjectPrefix` | yes | Pages project name prefix (e.g. `sourceplane-web-console`) |
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
6. Subsequent applies will attach Pages custom domains.

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
2. Pages custom domains show `active` status in Cloudflare.
3. `https://stage.sourceplane.ai/` serves the stage console.
4. `https://prod.sourceplane.ai/` serves the prod console.
5. SSL certificates are provisioned (automatic via Cloudflare).

## Outputs

- `zone_id` — Cloudflare zone identifier
- `zone_name` — Domain name
- `zone_status` — Zone activation status
- `console_custom_domain` — The custom domain hostname for this environment
- `pages_project_name` — The Pages project name for this environment
- `pages_domain_status` — Custom domain activation status
