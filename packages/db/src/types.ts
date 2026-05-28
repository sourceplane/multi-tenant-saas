export type BoundedContext =
  | "control"
  | "identity"
  | "membership"
  | "projects"
  | "billing"
  | "events"
  | "config";

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
