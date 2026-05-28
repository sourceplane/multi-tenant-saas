export interface Env {
  SOURCEPLANE_DB?: Hyperdrive;
  MEMBERSHIP_WORKER?: Fetcher;
  POLICY_WORKER?: Fetcher;
  ENVIRONMENT: string;
  /** Hex-encoded 256-bit key for signing-secret encryption (AES-256-GCM). */
  SECRET_ENCRYPTION_KEY?: string;
}
