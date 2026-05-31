export const BOUNDED_CONTEXTS = [
  "control",
  "identity",
  "membership",
  "projects",
  "billing",
  "events",
  "config",
  "webhooks",
  "metering",
  "notifications",
  "support",
] as const;

export type BoundedContext = (typeof BOUNDED_CONTEXTS)[number];

export interface MigrationEntry {
  id: string;
  context: BoundedContext;
  path: string;
  checksum: string;
  description: string;
}

export interface MigrationManifest {
  version: 1;
  migrations: MigrationEntry[];
}
