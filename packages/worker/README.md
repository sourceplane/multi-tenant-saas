# Worker Package

This package contains the worker application infrastructure and binding configuration.

## Overview
The worker package establishes the runtime environment for Cloudflare Workers. It includes:
- Terraform infrastructure for worker resources
- Binding configuration for Hyperdrive connections
- Initial worker code structure

## Architecture
Workers → Hyperdrive → Supabase Postgres

## Components
- **Terraform module**: Provisions worker resources
- **Binding configuration**: Configures Hyperdrive connections
- **Worker code**: Application logic (implemented in Task 0011)

## Dependencies
- Task 0009: Cloudflare Hyperdrive infrastructure (provides Hyperdrive IDs)
- Task 0006: Supabase provisioning (provides database credentials)

## Configuration
- Cloudflare API token (from GitHub Actions secret CLOUDFLARE_API_TOKEN)
- Cloudflare account ID (from GitHub Actions secret CLOUDFLARE_ACCOUNT_ID)

## Usage
1. Set Cloudflare credentials in GitHub Actions
2. Run Orun plan to generate infrastructure plan
3. Review plan and apply
4. Worker code can then be deployed

## Local Development
- Run `kiox -- orun validate --intent intent.yaml` to validate
- Run `orun plan --intent intent.yaml` to generate plan
- Run `orun run --plan plan.json --dry-run` to simulate execution
