terraform {
  required_version = ">= 1.15.0"

  backend "s3" {
    encrypt              = true
    use_lockfile         = true
    workspace_key_prefix = "env"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# --- Providers ---

provider "aws" {
  region = var.awsRegion

  default_tags {
    tags = {
      ManagedBy   = "terraform"
      Repository  = "${var.owner}/${var.repo}"
      Component   = var.component
      Environment = var.environment
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --- Variables (standard Orun parameters) ---

variable "awsRegion" {
  type    = string
  default = "us-east-1"
}

variable "cloudflare_api_token" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Cloudflare API token (from CLOUDFLARE_API_TOKEN env var)"
}

variable "cloudflare_account_id" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Cloudflare account ID (from CLOUDFLARE_ACCOUNT_ID env var)"
}

variable "orgName" {
  type    = string
  default = "sourceplane"
}

variable "owner" {
  type    = string
  default = "sourceplane"
}

variable "repo" {
  type    = string
  default = "multi-tenant-saas"
}

variable "namespace" {
  type    = string
  default = "sourceplane"
}

variable "namespacePrefix" {
  type    = string
  default = ""
}

variable "lane" {
  type    = string
  default = "verify"
}

variable "environment" {
  type    = string
  default = "stage"
}

variable "component" {
  type    = string
  default = "cloudflare-domain"
}

variable "stackName" {
  type    = string
  default = "cloudflare-domain"
}

variable "terraformDir" {
  type    = string
  default = "terraform"
}

variable "terraformVersion" {
  type    = string
  default = "1.15.3"
}

# --- Domain variables (from intent.yaml env and component parameters) ---

variable "baseDomain" {
  type        = string
  default     = "sourceplane.ai"
  description = "Root domain to manage (from BASE_DOMAIN env or component parameter)"
}

variable "zoneMode" {
  type        = string
  default     = "existing"
  description = "Zone management mode: 'existing' adopts zone, 'managed' creates it"
  validation {
    condition     = contains(["existing", "managed"], var.zoneMode)
    error_message = "zoneMode must be 'existing' or 'managed'."
  }
}

variable "workerNamePrefix" {
  type        = string
  default     = "sourceplane-web-console-next"
  description = "Worker name prefix for the new console; full Worker service name is {prefix}-{environment}"
}

variable "CONSOLE_CUSTOM_DOMAIN" {
  type        = string
  default     = ""
  description = "Custom domain for the console (from CONSOLE_CUSTOM_DOMAIN env var via TF_VAR)"
}

# --- Locals ---

locals {
  console_custom_domain = var.CONSOLE_CUSTOM_DOMAIN
  worker_name           = "${var.workerNamePrefix}-${var.environment}"
  has_custom_domain     = local.console_custom_domain != ""
}

# --- Zone lookup (existing mode) ---
#
# v5 note: data.cloudflare_zone no longer accepts a bare `name` argument;
# lookup-by-name is expressed through the nested `filter` block. The
# returned attributes (id, status, name) are unchanged.

data "cloudflare_zone" "existing" {
  count = var.zoneMode == "existing" ? 1 : 0
  filter = {
    name = var.baseDomain
  }
}

# --- Zone creation (managed mode) ---
#
# v5 note: cloudflare_zone now nests account under an `account` block
# (`account.id` replaces the top-level `account_id`), uses `name` instead
# of `zone`, and drops the `plan` argument (plan is now managed via the
# separate `cloudflare_zone_subscription` resource). This component runs
# in `existing` mode in stage/prod, so `count = 0` and the resource is
# never actually created — but the block must still be schema-valid.

resource "cloudflare_zone" "managed" {
  count = var.zoneMode == "managed" ? 1 : 0
  account = {
    id = var.cloudflare_account_id
  }
  name = var.baseDomain
  type = "full"
}

locals {
  zone_id     = var.zoneMode == "existing" ? data.cloudflare_zone.existing[0].id : cloudflare_zone.managed[0].id
  zone_name   = var.baseDomain
  zone_status = var.zoneMode == "existing" ? data.cloudflare_zone.existing[0].status : cloudflare_zone.managed[0].status
}

# --- Worker custom domain attachment ---
#
# Renamed in the cloudflare provider v5 line from `cloudflare_workers_domain`
# to `cloudflare_workers_custom_domain`. The attribute shape is unchanged
# (hostname, service, environment, account_id, zone_id), so the migration
# is state-only: the `moved` block below carries the existing Cloudflare
# resource IDs across the rename so no resource is destroyed or recreated.
# Pre-rename live IDs (stage / prod) are preserved byte-identical:
#   stage: 052eaece5e989d5a7280b6c206e562c42950e3a6
#   prod:  31e5f2ed1b1e4a5700e8ae0678846a0d753840e1

resource "cloudflare_workers_custom_domain" "console" {
  count = local.has_custom_domain ? 1 : 0

  account_id  = var.cloudflare_account_id
  zone_id     = local.zone_id
  hostname    = local.console_custom_domain
  service     = local.worker_name
  environment = "production"
}

moved {
  from = cloudflare_workers_domain.console
  to   = cloudflare_workers_custom_domain.console
}

# --- Outputs (non-secret) ---

output "zone_id" {
  description = "Cloudflare zone ID"
  value       = local.zone_id
}

output "zone_name" {
  description = "Cloudflare zone name"
  value       = local.zone_name
}

output "zone_status" {
  description = "Cloudflare zone activation status"
  value       = local.zone_status
}

output "console_custom_domain" {
  description = "Console custom domain hostname"
  value       = local.console_custom_domain
}

output "worker_name" {
  description = "Worker service name bound to the custom domain"
  value       = local.worker_name
}

output "worker_custom_domain_id" {
  description = "Cloudflare Workers custom domain attachment ID"
  value       = local.has_custom_domain ? try(cloudflare_workers_custom_domain.console[0].id, "pending") : "not_configured"
}
