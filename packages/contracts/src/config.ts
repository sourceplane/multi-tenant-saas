/**
 * Config, feature-flag, and secret-metadata contract types.
 *
 * These types define the public API request/response shapes for the config-worker
 * surface. Mutation types are included for settings and feature flags.
 * No secret value mutation types are included.
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
// Setting Mutation Requests
// ---------------------------------------------------------------------------

export interface CreateSettingRequest {
  key: string;
  value: unknown;
  description?: string | null;
}

export interface UpdateSettingRequest {
  value: unknown;
  description?: string | null;
}

export interface CreateSettingResponse {
  setting: PublicSetting;
}

export interface UpdateSettingResponse {
  setting: PublicSetting;
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
// Feature Flag Mutation Requests
// ---------------------------------------------------------------------------

export interface CreateFeatureFlagRequest {
  flagKey: string;
  enabled?: boolean;
  value?: unknown;
  description?: string | null;
}

export interface UpdateFeatureFlagRequest {
  enabled?: boolean;
  value?: unknown;
  description?: string | null;
}

export interface CreateFeatureFlagResponse {
  featureFlag: PublicFeatureFlag;
}

export interface UpdateFeatureFlagResponse {
  featureFlag: PublicFeatureFlag;
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
