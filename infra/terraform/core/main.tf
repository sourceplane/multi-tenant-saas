###############################################################################
# Core Infrastructure – Cloudflare Hyperdrive & Supabase Adoption
#
# This component represents the existing Cloudflare and Supabase baseline.
# Resources that already exist use `import` blocks so Terraform can adopt
# them on first apply without recreating them.
###############################################################################

terraform {
  required_version = ">= 1.5"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # After the state bucket is provisioned, switch to R2 backend:
  # backend "s3" {
  #   bucket                      = "sourceplane-tf-state"
  #   key                         = "core/terraform.tfstate"
  #   region                      = "auto"
  #   skip_credentials_validation = true
  #   skip_metadata_api_check     = true
  #   skip_region_validation      = true
  #   skip_requesting_account_id  = true
  #   use_path_style              = true
  #   endpoints = {
  #     s3 = "https://f9270f828799775bebf9315248fdf717.r2.cloudflarestorage.com"
  #   }
  # }
}

provider "cloudflare" {
  # CLOUDFLARE_API_TOKEN supplied via environment
}

###############################################################################
# Variables
###############################################################################

variable "cloudflare_account_id" {
  description = "Cloudflare account ID"
  type        = string
  default     = "f9270f828799775bebf9315248fdf717"
}

###############################################################################
# Existing Hyperdrive – adopt, do not recreate
###############################################################################

# Import block: on first `terraform apply` this will adopt the existing
# sourceplane-db Hyperdrive config instead of creating a new one.
#
# To execute the import:
#   terraform apply  (with CLOUDFLARE_API_TOKEN set)
#
# The import block is declarative and safe – it is a no-op if the resource
# is already in state.
# import {
#   to = cloudflare_hyperdrive_config.sourceplane_db
#   id = "f9270f828799775bebf9315248fdf717/d9c62c4acf934dd7bb82f63ed02db564"
# }

resource "cloudflare_hyperdrive_config" "sourceplane_db" {
  account_id = var.cloudflare_account_id
  name       = "sourceplane-db"

  origin = {
    host     = "aws-1-ap-southeast-1.pooler.supabase.com"
    port     = 5432
    scheme   = "postgres"
    database = "postgres"

    # Credentials are sensitive – supply via TF_VAR_* environment variables
    # or a .tfvars file that is NOT committed.
    user     = var.hyperdrive_origin_user
    password = var.hyperdrive_origin_password
  }
}

variable "hyperdrive_origin_user" {
  description = "Postgres user for the Hyperdrive origin (Supabase pooler)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "hyperdrive_origin_password" {
  description = "Postgres password for the Hyperdrive origin"
  type        = string
  sensitive   = true
  default     = ""
}

###############################################################################
# Outputs
###############################################################################

output "hyperdrive_id" {
  description = "Hyperdrive config ID for sourceplane-db"
  value       = cloudflare_hyperdrive_config.sourceplane_db.id
}

output "hyperdrive_name" {
  description = "Hyperdrive config name"
  value       = cloudflare_hyperdrive_config.sourceplane_db.name
}
