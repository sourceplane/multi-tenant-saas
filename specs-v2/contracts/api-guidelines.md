# Product V2 API Guidelines

Status: Product V2 baseline

## Public API Shape

- Public routes are prefixed with `/v2` unless deployed behind a product-specific hostname that already version-scopes the API.
- JSON is the default wire format.
- Success envelope:

```json
{
  "data": {},
  "meta": {
    "requestId": "req_123",
    "cursor": null
  }
}
```

- Error envelope:

```json
{
  "error": {
    "code": "forbidden",
    "message": "You do not have access to this resource.",
    "details": {},
    "requestId": "req_123"
  }
}
```

## Routes

- `POST /v2/catalog/sync`
- `GET /v2/organizations/{orgId}/repositories`
- `POST /v2/organizations/{orgId}/repositories`
- `GET /v2/organizations/{orgId}/repositories/{repositoryId}`
- `PATCH /v2/organizations/{orgId}/repositories/{repositoryId}`
- `GET /v2/organizations/{orgId}/catalog/components`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}/history`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}/runs`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}/dependencies`
- `GET /v2/organizations/{orgId}/catalog/components/{componentId}/scorecard`
- `GET /v2/organizations/{orgId}/runs`
- `GET /v2/organizations/{orgId}/runs/{runId}`
- `GET /v2/organizations/{orgId}/plans/{planId}`
- `GET /v2/organizations/{orgId}/deployments`
- `GET /v2/organizations/{orgId}/deployments/{deploymentId}`
- `POST /v2/organizations/{orgId}/catalog/components/{componentId}/actions/{actionId}/run`

`POST /v2/catalog/sync` may be top-level because the server resolves the organization from verified repository installation claims or a scoped capability token before accepting the upload.

## Security

- All organization-scoped reads and actions require an authenticated subject or service principal.
- Upload payload tenant fields are not trusted until provider identity and repository mapping are verified.
- Approved actions must be explicit product capabilities, not arbitrary command execution.
- Mutating routes must emit audit events with subject, organization, target, request ID, and result.

