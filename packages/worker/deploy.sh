#!/bin/bash
# Deployment script for Task 0012

set -e

echo "Deploying worker to production..."

# Install dependencies
npm install

# Deploy with Wrangler
npx wrangler deploy --env prod

echo "Worker deployed successfully!"
