// `@saas/sdk` — Sourceplane TypeScript SDK.
//
// Stable public surface:
//   - `Sourceplane`              → the client class
//   - `OrganizationsClient` /     → resource clients (also reachable via
//     `ProjectsClient`              `client.organizations` / `client.projects`)
//   - typed error hierarchy from `./errors`
//   - request/response types re-exported from `@saas/contracts`
//
// The transport (`Transport`, `generateRequestId`) is exported for advanced
// callers (custom retry middleware, alt resource fan-out) but the typical
// integration path is the `Sourceplane` class.

import { OrganizationsClient } from "./organizations.js";
import { ProjectsClient } from "./projects.js";
import { Transport, type ClientOptions } from "./transport.js";

export class Sourceplane {
  readonly organizations: OrganizationsClient;
  readonly projects: ProjectsClient;
  /** Underlying HTTP transport. Exposed for advanced extension. */
  readonly transport: Transport;

  constructor(options: ClientOptions) {
    this.transport = new Transport(options);
    this.organizations = new OrganizationsClient(this.transport);
    this.projects = new ProjectsClient(this.transport);
  }
}

// Resource clients (also reachable via `client.<resource>`).
export { OrganizationsClient } from "./organizations.js";
export { ProjectsClient } from "./projects.js";

// Transport surface.
export {
  Transport,
  generateRequestId,
  type AuthOption,
  type ClientOptions,
  type RequestOptions,
  type SuccessEnvelope,
} from "./transport.js";

// Typed error hierarchy.
export {
  SourceplaneError,
  BadRequestError,
  UnauthenticatedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  PreconditionFailedError,
  UnsupportedError,
  InternalError,
  RateLimitError,
  decodeError,
  type ErrorEnvelope,
  type RateLimitWindow,
} from "./errors.js";

// Re-export contract types so consumers don't import `@saas/contracts` directly.
export type {
  PublicOrganization,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  GetOrganizationResponse,
  ListOrganizationsResponse,
} from "@saas/contracts/membership";

export type {
  PublicProject,
  PublicEnvironment,
  CreateProjectRequest,
  CreateProjectResponse,
  GetProjectResponse,
  ListProjectsResponse,
  ArchiveProjectResponse,
} from "@saas/contracts/projects";

export { ERROR_CODES, type ErrorCode } from "@saas/contracts/errors";
