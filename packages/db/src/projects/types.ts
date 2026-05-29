export type { SqlExecutor, SqlExecutorResult, SqlRow } from "../hyperdrive/executor.js";

export type ProjectsRepositoryError =
  | { kind: "not_found" }
  | { kind: "conflict"; entity: string }
  | { kind: "internal"; message: string };

export type ProjectsResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: ProjectsRepositoryError };

export interface Project {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  slugLower: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface Environment {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  slug: string;
  slugLower: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export interface CreateProjectInput {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  slugLower: string;
  createdAt: Date;
}

export interface CreateEnvironmentInput {
  id: string;
  orgId: string;
  projectId: string;
  name: string;
  slug: string;
  slugLower: string;
  createdAt: Date;
}

export interface CursorPosition {
  createdAt: string;
  id: string;
}

export interface PageQueryParams {
  limit: number;
  cursor: CursorPosition | null;
}

export interface PagedResult<T> {
  items: T[];
  nextCursor: CursorPosition | null;
}

export interface ProjectsRepository {
  createProject(input: CreateProjectInput): Promise<ProjectsResult<Project>>;
  getProjectById(orgId: string, projectId: string): Promise<ProjectsResult<Project>>;
  getProjectBySlug(orgId: string, slugLower: string): Promise<ProjectsResult<Project>>;
  listProjectsPaged(orgId: string, params: PageQueryParams): Promise<ProjectsResult<PagedResult<Project>>>;
  archiveProject(orgId: string, projectId: string, archivedAt: Date): Promise<ProjectsResult<Project>>;
  /**
   * Count of active (non-archived) projects for an organization. Used by
   * domain callers (e.g. projects-worker) to compare against entitlement
   * limits without loading a full page of projects.
   */
  countActiveProjects(orgId: string): Promise<ProjectsResult<number>>;

  createEnvironment(input: CreateEnvironmentInput): Promise<ProjectsResult<Environment>>;
  getEnvironmentById(orgId: string, projectId: string, environmentId: string): Promise<ProjectsResult<Environment>>;
  getEnvironmentBySlug(orgId: string, projectId: string, slugLower: string): Promise<ProjectsResult<Environment>>;
  listEnvironmentsPaged(orgId: string, projectId: string, params: PageQueryParams): Promise<ProjectsResult<PagedResult<Environment>>>;
  archiveEnvironment(orgId: string, projectId: string, environmentId: string, archivedAt: Date): Promise<ProjectsResult<Environment>>;
}
