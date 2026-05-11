###############################################################################
# Terraform State Bootstrap – Cloudflare R2 Bucket
#
# This component provisions the R2 bucket used as the remote backend for all
# other Terraform components.  Because this is the bootstrap component it
# uses a local backend; after first apply the state file should be committed
# or migrated manually.
###############################################################################

terraform {
  required_version = ">= 1.5"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }

  # Bootstrap component – local backend until the bucket exists.
  # After first apply, migrate to the R2 backend.
  backend "local" {}
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

variable "state_bucket_name" {
  description = "R2 bucket name for Terraform remote state"
  type        = string
  default     = "sourceplane-tf-state"
}

###############################################################################
# Resources
###############################################################################

resource "cloudflare_r2_bucket" "tf_state" {
  account_id = var.cloudflare_account_id
  name       = var.state_bucket_name
}

###############################################################################
# Outputs
###############################################################################

output "state_bucket_name" {
  description = "Name of the R2 bucket holding Terraform state"
  value       = cloudflare_r2_bucket.tf_state.name
}
