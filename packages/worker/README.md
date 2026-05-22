# Worker Binding Setup

This component provides the infrastructure for running Cloudflare Workers in the multi-tenant SaaS environment.

## Overview

The worker package includes:
- **Infrastructure**: Terraform configuration for provisioning worker resources
- **Code**: Initial worker implementation structure
- **Configuration**: Wrangler config and bindings

## Components

### 1. Infrastructure (Terraform)

The terraform directory contains:
- `main.tf` - Worker resource definition
- `variables.tf` - Configuration variables
- `outputs.tf` - Output values

### 2. Worker Code

The `src/worker.js` file contains the main worker implementation.

### 3. Configuration

- `wrangler.config.js` - Wrangler configuration
- `bindings.json` - Worker bindings configuration

## Usage

### Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the worker locally:
   ```bash
   npx wrangler dev
   ```

3. Access endpoints at http://localhost:8787

### Environment Variables

The worker uses these environment variables:

- `DB_CONNECTION_STRING`: Hyperdrive connection string
- `JWT_SECRET`: Secret for JWT validation

These are provided by the Supabase component and injected via Orun.

## API

The worker implements these endpoints:

- `GET /api/items?id=:id` - Get item by ID
- `POST /api/items` - Create new item
- `PUT /api/items?id=:id` - Update item
- `DELETE /api/items?id=:id` - Delete item

All endpoints require a valid JWT token in the `Authorization` header.

## Database Schema

The worker expects a table named `items`:

```sql
CREATE TABLE items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```
