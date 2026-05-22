terraform {
  backend "s3" {
    bucket = "sourceplane-<env>"
    key    = "infra/terraform/worker/terraform.tfstate"
    region = "us-east-1"
  }
}
