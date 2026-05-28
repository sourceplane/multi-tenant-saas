/**
 * Config, feature-flag, and secret-metadata read-only contract types.
 *
 * These types define the public API response shapes for the config-worker
 * read-only surface. No mutation types are included in this iteration.
 */

// ---------------------------------------------------------------------------
// Public Setting
// ---------------------------------------------------------------------------

export interface PublicSetting {
  id: string;
  orgId: string;
  projectId: string | null;
  environmentId: string | null;
  scopeKind: string;
  key: string;
  value: unknown;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListSettingsResponse {
  settings: PublicSetting[];
}

// ---------------------------------------------------------------------------
// Public Feature Flag
// ---------------------------------------------------------------------------

export interface PublicFeatureFlag {
  id: string;
  orgId: string;
  projectId: string | null;
  environmentId: string | null;
  scopeKind: string;
  flagKey: string;
  enabled: boolean;
  value: unknown | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListFeatureFlagsResponse {
  featureFlags: PublicFeatureFlag[];
}

// ---------------------------------------------------------------------------
// Public Secret Metadata
// ---------------------------------------------------------------------------
// NOTE: No plaintext value, ciphertext envelope, hash, token, or raw secret
// material may ever appear in this type.

export interface PublicSecretMetadata {
  id: string;
  orgId: string;
  projectId: string | null;
  environmentId: string | null;
  scopeKind: string;
  secretKey: string;
  displayName: string | null;
  status: string;
  version: number;
  rotationPolicy: string | null;
  lastRotatedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListSecretMetadataResponse {
  secrets: PublicSecretMetadata[];
}
