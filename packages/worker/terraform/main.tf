# Worker infrastructure bindings
# This component will provision necessary resources for worker applications

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# Worker secrets and bindings will be defined here
