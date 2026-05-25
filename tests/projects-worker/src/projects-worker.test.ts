import { handleArchiveProject } from "@projects-worker/handlers/archive-project";
import { handleCreateProject } from "@projects-worker/handlers/create-project";
import { handleGetProject } from "@projects-worker/handlers/get-project";
import { handleListProjects } from "@projects-worker/handlers/list-projects";
import { route } from "@projects-worker/router";
import type { Env } from "@projects-worker/env";
import type { ProjectsRepository, ProjectsResult, Project, CreateProjectInput, PageQueryParams, PagedResult, Environment, CreateEnvironmentInput } from "@saas/db/projects";
import type { EventsRepository, EventsResult, StoredEvent, StoredAuditEntry, AppendEventInput, AppendEventWithAuditInput, EventsPageQueryParams, EventsPagedResult } from "@saas/db/events";

const TEST_ORG_UUID = "11111111-1111-1111-1111-111111111111";
const TEST_ORG_PUBLIC = "org_11111111111111111111111111111111";
const TEST_PROJECT_UUID = "22222222-2222-2222-2222-222222222222";
const TEST_PROJECT_PUBLIC = "prj_22222222222222222222222222222222";
const TEST_USER_ID = "usr_aabbccdd";

interface MockFn<T = unknown> {
  (...args: unknown[]): T;
  calls: unknown[][];
}

function mockFn<T>(impl: (...args: unknown[]) => T): MockFn<T> {
  const calls: unknown[][] = [];
  const fn = (...args: unknown[]): T => {
    calls.push(args);
    return impl(...args);
  };
  fn.calls = calls;
  return fn;
}

function createMockFetcher(responseBody: unknown, status = 200): Fetcher & { fetchCalls: Array<{ url: string; init: RequestInit }> } {
  const fetchCalls: Array<{ url: string; init: RequestInit }> = [];
  return {
    fetch(input: string | Request | URL, init?: RequestInit): Promise<Response> {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      fetchCalls.push({ url, init: init ?? {} });
      return Promise.resolve(new Response(JSON.stringify(responseBody), {
        status,
        headers: { "content-type": "application/json" },
      }));
    },
    connect() { throw new Error("not implemented"); },
    fetchCalls,
  } as unknown as Fetcher & { fetchCalls: Array<{ url: string; init: RequestInit }> };
}

function createMockFetcherThatThrows(): Fetcher {
  return {
    fetch(): Promise<Response> {
      return Promise.reject(new Error("network error"));
    },
    connect() { throw new Error("not implemented"); },
  } as unknown as Fetcher;
}

function createFakeEnv(overrides?: Record<string, unknown>): Env {
  const base: Record<string, unknown> = {
    SOURCEPLANE_DB: { connectionString: "postgres://fake" },
    MEMBERSHIP_WORKER: createMockFetcher({ data: { memberships: [{ kind: "role_assignment", role: "admin", scope: { kind: "organization", orgId: TEST_ORG_UUID } }] } }),
    POLICY_WORKER: createMockFetcher({ data: { allow: true, reason: "org_admin", policyVersion: 1, derivedScope: { orgId: TEST_ORG_UUID } } }),
    ENVIRONMENT: "test",
  };
  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete base[key];
      } else {
        base[key] = value;
      }
    }
  }
  return base as unknown as Env;
}

const fakeProject: Project = {
  id: TEST_PROJECT_UUID,
  orgId: TEST_ORG_UUID,
  name: "My Project",
  slug: "my-project",
  slugLower: "my-project",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  archivedAt: null,
};

function createFakeProjectsRepo(overrides?: Partial<Record<keyof ProjectsRepository, unknown>>): ProjectsRepository & { createProjectCalls: unknown[][]; getProjectByIdCalls: unknown[][] } {
  const createProjectCalls: unknown[][] = [];
  const getProjectByIdCalls: unknown[][] = [];

  const repo: ProjectsRepository & { createProjectCalls: unknown[][]; getProjectByIdCalls: unknown[][] } = {
    createProjectCalls,
    getProjectByIdCalls,
    async createProject(input: CreateProjectInput): Promise<ProjectsResult<Project>> {
      createProjectCalls.push([input]);
      return { ok: true, value: { ...fakeProject, id: input.id, name: input.name, slug: input.slug, slugLower: input.slugLower } };
    },
    async getProjectById(orgId: string, projectId: string): Promise<ProjectsResult<Project>> {
      getProjectByIdCalls.push([orgId, projectId]);
      return { ok: true, value: fakeProject };
    },
    async getProjectBySlug() { return { ok: true, value: fakeProject }; },
    async listProjectsPaged() { return { ok: true, value: { items: [fakeProject], nextCursor: null } }; },
    async archiveProject() { return { ok: true, value: fakeProject }; },
    async createEnvironment() { return { ok: false as const, error: { kind: "not_found" as const } }; },
    async getEnvironmentById() { return { ok: false as const, error: { kind: "not_found" as const } }; },
    async getEnvironmentBySlug() { return { ok: false as const, error: { kind: "not_found" as const } }; },
    async listEnvironmentsPaged() { return { ok: true, value: { items: [], nextCursor: null } }; },
    async archiveEnvironment() { return { ok: false as const, error: { kind: "not_found" as const } }; },
  };

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      (repo as unknown as Record<string, unknown>)[key] = value;
    }
  }

  return repo;
}

function createFakeEventsRepo(overrides?: Partial<Record<keyof EventsRepository, unknown>>): EventsRepository & { appendEventWithAuditCalls: unknown[][] } {
  const appendEventWithAuditCalls: unknown[][] = [];
  const fakeEvent: StoredEvent = {
    id: "event-id",
    type: "project.created",
    version: 1,
    source: "projects-worker",
    occurredAt: new Date("2026-01-01T00:00:00Z"),
    actorType: "user",
    actorId: TEST_USER_ID,
    actorSessionId: null,
    actorIp: null,
    orgId: TEST_ORG_UUID,
    projectId: TEST_PROJECT_UUID,
    environmentId: null,
    subjectKind: "project",
    subjectId: TEST_PROJECT_UUID,
    subjectName: "My Project",
    requestId: "req_test",
    correlationId: null,
    causationId: null,
    idempotencyKey: null,
    payload: {},
    redactPaths: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
  const fakeAudit: StoredAuditEntry = {
    id: "audit-id",
    eventId: "event-id",
    orgId: TEST_ORG_UUID,
    projectId: TEST_PROJECT_UUID,
    environmentId: null,
    actorType: "user",
    actorId: TEST_USER_ID,
    eventType: "project.created",
    eventVersion: 1,
    source: "projects-worker",
    subjectKind: "project",
    subjectId: TEST_PROJECT_UUID,
    subjectName: "My Project",
    category: "projects",
    description: "Created project",
    occurredAt: new Date("2026-01-01T00:00:00Z"),
    requestId: "req_test",
    correlationId: null,
    payload: {},
    redactPaths: [],
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };

  const repo: EventsRepository & { appendEventWithAuditCalls: unknown[][] } = {
    appendEventWithAuditCalls,
    async appendEvent() { return { ok: true, value: fakeEvent }; },
    async appendEventWithAudit(input: AppendEventWithAuditInput) {
      appendEventWithAuditCalls.push([input]);
      return { ok: true, value: { event: fakeEvent, audit: fakeAudit } };
    },
    async queryAuditByOrg() { return { ok: true, value: { items: [], nextCursor: null } }; },
    async queryAuditByTarget() { return { ok: true, value: { items: [], nextCursor: null } }; },
  };

  if (overrides) {
    for (const [key, value] of Object.entries(overrides)) {
      (repo as unknown as Record<string, unknown>)[key] = value;
    }
  }

  return repo;
}

function makeRequest(method: string, path: string, body?: unknown, headers?: Record<string, string>): Request {
  const init: RequestInit = {
    method,
    headers: {
      "content-type": "application/json",
      "x-request-id": "req_test123",
      "x-actor-subject-id": TEST_USER_ID,
      "x-actor-subject-type": "user",
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }
  return new Request(`https://projects-worker${path}`, init);
}

describe("projects-worker router", () => {
  it("returns health check", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", "/health", undefined, {});
    const res = await route(req, env);
    expect(res.status).toBe(200);
    const json = await res.json() as { data: { service: string } };
    expect(json.data.service).toBe("projects-worker");
  });

  it("returns 404 for unknown routes", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", "/v1/unknown");
    const res = await route(req, env);
    expect(res.status).toBe(404);
  });

  it("returns 404 for malformed org public ID", async () => {
    const env = createFakeEnv();
    const req = makeRequest("POST", "/v1/organizations/bad_id/projects", { name: "test" });
    const res = await route(req, env);
    expect(res.status).toBe(404);
  });

  it("returns 404 for malformed project public ID", async () => {
    const env = createFakeEnv();
    const req = makeRequest("GET", `/v1/organizations/${TEST_ORG_PUBLIC}/projects/bad_id`);
    const res = await route(req, env);
    expect(res.status).toBe(404);
  });

  it("returns 401 for missing actor on POST projects", async () => {
    const env = createFakeEnv();
    const req = new Request(`https://projects-worker/v1/organizations/${TEST_ORG_PUBLIC}/projects`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "test" }),
    });
    const res = await route(req, env);
    expect(res.status).toBe(401);
  });

  it("returns 401 for missing actor on GET project", async () => {
    const env = createFakeEnv();
    const req = new Request(`https://projects-worker/v1/organizations/${TEST_ORG_PUBLIC}/projects/${TEST_PROJECT_PUBLIC}`, {
      method: "GET",
    });
    const res = await route(req, env);
    expect(res.status).toBe(401);
  });

  it("returns 405 for unsupported methods on projects collection", async () => {
    const env = createFakeEnv();
    const req = makeRequest("DELETE", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`);
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("returns 405 for unsupported methods on project item", async () => {
    const env = createFakeEnv();
    const req = makeRequest("PATCH", `/v1/organizations/${TEST_ORG_PUBLIC}/projects/${TEST_PROJECT_PUBLIC}`);
    const res = await route(req, env);
    expect(res.status).toBe(405);
  });

  it("returns 401 for missing actor on DELETE project", async () => {
    const env = createFakeEnv();
    const req = new Request(`https://projects-worker/v1/organizations/${TEST_ORG_PUBLIC}/projects/${TEST_PROJECT_PUBLIC}`, {
      method: "DELETE",
    });
    const res = await route(req, env);
    expect(res.status).toBe(401);
  });
});

describe("handleCreateProject", () => {
  it("creates a project with authorization and atomic event", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "My Project", slug: "my-project" });

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(201);

    const json = await res.json() as { data: { project: { id: string; orgId: string; name: string; slug: string } } };
    expect(json.data.project.name).toBe("My Project");
    expect(json.data.project.slug).toBe("my-project");
    expect(json.data.project.id).toMatch(/^prj_/);
    expect(json.data.project.orgId).toMatch(/^org_/);

    expect(projectsRepo.createProjectCalls.length).toBe(1);
    expect(eventsRepo.appendEventWithAuditCalls.length).toBe(1);
  });

  it("derives slug from name when slug is omitted", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Hello World" });

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(201);

    const call = projectsRepo.createProjectCalls[0]![0] as CreateProjectInput;
    expect(call.slug).toBe("hello-world");
    expect(call.slugLower).toBe("hello-world");
  });

  it("returns 422 for missing name", async () => {
    const env = createFakeEnv();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, {});
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(422);
  });

  it("returns 422 for name too long", async () => {
    const env = createFakeEnv();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "x".repeat(101) });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid slug format", async () => {
    const env = createFakeEnv();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test", slug: "-bad-slug-" });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(422);
  });

  it("returns 422 for slug too short", async () => {
    const env = createFakeEnv();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test", slug: "a" });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid JSON body", async () => {
    const env = createFakeEnv();
    const req = new Request("https://projects-worker/v1/organizations/x/projects", {
      method: "POST",
      headers: { "content-type": "application/json", "x-actor-subject-id": TEST_USER_ID, "x-actor-subject-type": "user" },
      body: "not-json",
    });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(422);
  });

  it("returns 503 when SOURCEPLANE_DB is missing", async () => {
    const env = createFakeEnv({ SOURCEPLANE_DB: undefined });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID);
    expect(res.status).toBe(503);
  });

  it("returns 503 when MEMBERSHIP_WORKER is missing", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: undefined });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID);
    expect(res.status).toBe(503);
  });

  it("returns 503 when POLICY_WORKER is missing", async () => {
    const env = createFakeEnv({ POLICY_WORKER: undefined });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID);
    expect(res.status).toBe(503);
  });

  it("fails closed when membership-context call fails", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: createMockFetcherThatThrows() });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
  });

  it("fails closed when membership returns non-ok", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: createMockFetcher({}, 500) });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
  });

  it("fails closed when membership returns malformed envelope", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: createMockFetcher({ something: "wrong" }) });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
  });

  it("fails closed when policy denies", async () => {
    const env = createFakeEnv({
      POLICY_WORKER: createMockFetcher({ data: { allow: false, reason: "denied", policyVersion: 1, derivedScope: { orgId: TEST_ORG_UUID } } }),
    });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
    expect(projectsRepo.createProjectCalls.length).toBe(0);
  });

  it("fails closed when policy-worker fetch throws", async () => {
    const env = createFakeEnv({ POLICY_WORKER: createMockFetcherThatThrows() });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
    expect(projectsRepo.createProjectCalls.length).toBe(0);
  });

  it("fails closed when policy returns malformed envelope", async () => {
    const env = createFakeEnv({ POLICY_WORKER: createMockFetcher({ wrong: "shape" }) });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
    expect(projectsRepo.createProjectCalls.length).toBe(0);
  });

  it("returns 409 on duplicate slug conflict", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      createProject: async () => ({ ok: false as const, error: { kind: "conflict" as const, entity: "project" } }),
    });
    const eventsRepo = createFakeEventsRepo();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test", slug: "existing" });

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(409);
  });

  it("rolls back when event append fails", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo({
      appendEventWithAudit: async () => ({ ok: false as const, error: { kind: "internal" as const, message: "db error" } }),
    });
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(503);
  });

  it("does not expose raw UUIDs in response", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });

    const res = await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });
    const text = await res.text();
    expect(text).not.toContain(TEST_ORG_UUID);
  });

  it("does not expose raw UUIDs in event payload", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();
    const req = makeRequest("POST", `/v1/organizations/${TEST_ORG_PUBLIC}/projects`, { name: "Test" });

    await handleCreateProject(req, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo, eventsRepo });

    const eventCall = eventsRepo.appendEventWithAuditCalls[0]![0] as AppendEventWithAuditInput;
    const payload = eventCall.event.payload;
    const payloadStr = JSON.stringify(payload);
    expect(payloadStr).not.toContain(TEST_ORG_UUID);
    expect(payload.projectId).toMatch(/^prj_/);
    expect(payload.orgId).toMatch(/^org_/);
  });
});

describe("handleGetProject", () => {
  it("returns project with authorization", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();

    const res = await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo });
    expect(res.status).toBe(200);

    const json = await res.json() as { data: { project: { id: string; orgId: string } } };
    expect(json.data.project.id).toMatch(/^prj_/);
    expect(json.data.project.orgId).toMatch(/^org_/);
  });

  it("calls getProjectById with orgId and projectId", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();

    await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo });

    expect(projectsRepo.getProjectByIdCalls.length).toBe(1);
    expect(projectsRepo.getProjectByIdCalls[0]).toEqual([TEST_ORG_UUID, TEST_PROJECT_UUID]);
  });

  it("returns 404 when project not found", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      getProjectById: async () => ({ ok: false as const, error: { kind: "not_found" as const } }),
    });

    const res = await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo });
    expect(res.status).toBe(404);
  });

  it("fails closed when membership-context fails", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: createMockFetcherThatThrows() });

    const res = await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID);
    expect(res.status).toBe(404);
  });

  it("fails closed when policy denies (returns 404 to avoid enumeration)", async () => {
    const env = createFakeEnv({
      POLICY_WORKER: createMockFetcher({ data: { allow: false, reason: "denied", policyVersion: 1, derivedScope: { orgId: TEST_ORG_UUID } } }),
    });
    const projectsRepo = createFakeProjectsRepo();

    const res = await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo });
    expect(res.status).toBe(404);
    expect(projectsRepo.getProjectByIdCalls.length).toBe(0);
  });

  it("returns 503 when SOURCEPLANE_DB is missing", async () => {
    const env = createFakeEnv({ SOURCEPLANE_DB: undefined });
    const res = await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID);
    expect(res.status).toBe(503);
  });

  it("returns 503 when MEMBERSHIP_WORKER is missing", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: undefined });
    const res = await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID);
    expect(res.status).toBe(503);
  });

  it("returns 503 when POLICY_WORKER is missing", async () => {
    const env = createFakeEnv({ POLICY_WORKER: undefined });
    const res = await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID);
    expect(res.status).toBe(503);
  });

  it("does not expose raw UUIDs in response", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();

    const res = await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo });
    const text = await res.text();
    expect(text).not.toContain(TEST_ORG_UUID);
    expect(text).not.toContain(TEST_PROJECT_UUID);
  });

  it("sends project.read action with explicit projectId in resource", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();

    await handleGetProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo });

    const policyFetcher = env.POLICY_WORKER as unknown as { fetchCalls: Array<{ url: string; init: RequestInit }> };
    const callBody = JSON.parse(policyFetcher.fetchCalls[0]!.init.body as string);
    expect(callBody.action).toBe("project.read");
    expect(callBody.resource.projectId).toBe(TEST_PROJECT_UUID);
    expect(callBody.resource.orgId).toBe(TEST_ORG_UUID);
    expect(callBody.resource.id).toBe(TEST_PROJECT_UUID);
  });
});

describe("handleListProjects", () => {
  function listRequest(orgPublic: string, query = ""): Request {
    return new Request(`https://projects.internal/v1/organizations/${orgPublic}/projects${query}`, {
      method: "GET",
      headers: {
        "x-actor-subject-id": TEST_USER_ID,
        "x-actor-subject-type": "user",
        "x-request-id": "req_test",
      },
    });
  }

  it("returns paginated project list on success", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(200);
    const json = await response.json() as any;
    expect(json.data.projects).toHaveLength(1);
    expect(json.data.projects[0].id).toBe(TEST_PROJECT_PUBLIC);
    expect(json.data.projects[0].orgId).toBe(TEST_ORG_PUBLIC);
    expect(json.meta.cursor).toBeNull();
  });

  it("does not expose raw UUIDs in list response", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    const raw = await response.text();
    expect(raw).not.toContain(TEST_ORG_UUID);
    expect(raw).not.toContain(TEST_PROJECT_UUID);
  });

  it("uses default limit of 50 when not specified", async () => {
    const env = createFakeEnv();
    const listCalls: unknown[][] = [];
    const projectsRepo = createFakeProjectsRepo({
      listProjectsPaged: (...args: unknown[]) => {
        listCalls.push(args);
        return Promise.resolve({ ok: true, value: { items: [], nextCursor: null } });
      },
    });

    const request = listRequest(TEST_ORG_PUBLIC);
    await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(listCalls[0]![1]).toEqual({ limit: 50, cursor: null });
  });

  it("respects limit query parameter", async () => {
    const env = createFakeEnv();
    const listCalls: unknown[][] = [];
    const projectsRepo = createFakeProjectsRepo({
      listProjectsPaged: (...args: unknown[]) => {
        listCalls.push(args);
        return Promise.resolve({ ok: true, value: { items: [], nextCursor: null } });
      },
    });

    const request = listRequest(TEST_ORG_PUBLIC, "?limit=10");
    await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect((listCalls[0]![1] as any).limit).toBe(10);
  });

  it("returns validation_failed for limit > 100", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC, "?limit=200");
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(422);
    const json = await response.json() as any;
    expect(json.error.code).toBe("validation_failed");
  });

  it("returns validation_failed for invalid cursor", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC, "?cursor=not-valid");
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(422);
    const json = await response.json() as any;
    expect(json.error.code).toBe("validation_failed");
  });

  it("returns next cursor when more pages exist", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      listProjectsPaged: () => Promise.resolve({
        ok: true,
        value: {
          items: [fakeProject],
          nextCursor: { createdAt: "2026-01-01T00:00:00.000Z", id: TEST_PROJECT_UUID },
        },
      }),
    });

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(200);
    const json = await response.json() as any;
    expect(json.meta.cursor).not.toBeNull();
    expect(typeof json.meta.cursor).toBe("string");
  });

  it("returns 404 for malformed org ID via router", async () => {
    const env = createFakeEnv();
    const request = new Request("https://projects.internal/v1/organizations/bad-org/projects", {
      method: "GET",
      headers: {
        "x-actor-subject-id": TEST_USER_ID,
        "x-actor-subject-type": "user",
      },
    });

    const response = await route(request, env);
    expect(response.status).toBe(404);
  });

  it("returns 503 when SOURCEPLANE_DB is missing", async () => {
    const env = createFakeEnv({ SOURCEPLANE_DB: undefined });
    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID);

    expect(response.status).toBe(503);
  });

  it("returns 503 when MEMBERSHIP_WORKER is missing", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: undefined });
    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID);

    expect(response.status).toBe(503);
  });

  it("returns 503 when POLICY_WORKER is missing", async () => {
    const env = createFakeEnv({ POLICY_WORKER: undefined });
    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID);

    expect(response.status).toBe(503);
  });

  it("returns 404 when membership-context fails", async () => {
    const env = createFakeEnv({
      MEMBERSHIP_WORKER: createMockFetcher({ error: "not found" }, 404),
    });
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(404);
  });

  it("returns 404 when membership-context returns malformed envelope", async () => {
    const env = createFakeEnv({
      MEMBERSHIP_WORKER: createMockFetcher({ wrong: "shape" }),
    });
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(404);
  });

  it("returns 404 when membership-worker throws network error", async () => {
    const env = createFakeEnv({
      MEMBERSHIP_WORKER: createMockFetcherThatThrows(),
    });
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(404);
  });

  it("returns 404 when policy denies", async () => {
    const env = createFakeEnv({
      POLICY_WORKER: createMockFetcher({ data: { allow: false, reason: "no_matching_role", policyVersion: 1, derivedScope: { orgId: TEST_ORG_UUID } } }),
    });
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(404);
  });

  it("returns 404 when policy returns malformed envelope", async () => {
    const env = createFakeEnv({
      POLICY_WORKER: createMockFetcher({ wrong: "shape" }),
    });
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(404);
  });

  it("returns 404 when policy-worker throws network error", async () => {
    const env = createFakeEnv({
      POLICY_WORKER: createMockFetcherThatThrows(),
    });
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(404);
  });

  it("returns 503 when repository fails", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      listProjectsPaged: () => Promise.resolve({ ok: false, error: { kind: "internal", message: "db error" } }),
    });

    const request = listRequest(TEST_ORG_PUBLIC);
    const response = await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    expect(response.status).toBe(503);
  });

  it("sends project.list action with organization-scoped resource", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo();

    const request = listRequest(TEST_ORG_PUBLIC);
    await handleListProjects(request, env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, { projectsRepo });

    const policyFetcher = env.POLICY_WORKER as unknown as { fetchCalls: Array<{ url: string; init: RequestInit }> };
    const callBody = JSON.parse(policyFetcher.fetchCalls[0]!.init.body as string);
    expect(callBody.action).toBe("project.list");
    expect(callBody.resource.kind).toBe("organization");
    expect(callBody.resource.orgId).toBe(TEST_ORG_UUID);
    expect(callBody.resource.projectId).toBeUndefined();
  });
});

describe("handleArchiveProject", () => {
  const archivedProject: Project = {
    ...fakeProject,
    status: "archived",
    archivedAt: new Date("2026-01-15T00:00:00Z"),
    updatedAt: new Date("2026-01-15T00:00:00Z"),
  };

  it("archives a project with authorization and atomic event", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      archiveProject: async () => ({ ok: true as const, value: archivedProject }),
    });
    const eventsRepo = createFakeEventsRepo();

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(200);

    const json = await res.json() as { data: { project: { id: string; orgId: string; status: string } } };
    expect(json.data.project.id).toMatch(/^prj_/);
    expect(json.data.project.orgId).toMatch(/^org_/);
    expect(json.data.project.status).toBe("archived");

    expect(eventsRepo.appendEventWithAuditCalls.length).toBe(1);
  });

  it("uses project.delete policy action with explicit project resource shape", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      archiveProject: async () => ({ ok: true as const, value: archivedProject }),
    });
    const eventsRepo = createFakeEventsRepo();

    await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });

    const policyFetcher = env.POLICY_WORKER as unknown as { fetchCalls: Array<{ url: string; init: RequestInit }> };
    const callBody = JSON.parse(policyFetcher.fetchCalls[0]!.init.body as string);
    expect(callBody.action).toBe("project.delete");
    expect(callBody.resource.kind).toBe("project");
    expect(callBody.resource.id).toBe(TEST_PROJECT_UUID);
    expect(callBody.resource.orgId).toBe(TEST_ORG_UUID);
    expect(callBody.resource.projectId).toBe(TEST_PROJECT_UUID);
  });

  it("returns 404 for malformed org/project IDs via router", async () => {
    const env = createFakeEnv();
    const req = makeRequest("DELETE", `/v1/organizations/bad_org/projects/${TEST_PROJECT_PUBLIC}`);
    const res = await route(req, env);
    expect(res.status).toBe(404);

    const req2 = makeRequest("DELETE", `/v1/organizations/${TEST_ORG_PUBLIC}/projects/bad_prj`);
    const res2 = await route(req2, env);
    expect(res2.status).toBe(404);
  });

  it("returns 503 when SOURCEPLANE_DB is missing", async () => {
    const env = createFakeEnv({ SOURCEPLANE_DB: undefined });
    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID);
    expect(res.status).toBe(503);
  });

  it("returns 503 when MEMBERSHIP_WORKER is missing", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: undefined });
    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID);
    expect(res.status).toBe(503);
  });

  it("returns 503 when POLICY_WORKER is missing", async () => {
    const env = createFakeEnv({ POLICY_WORKER: undefined });
    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID);
    expect(res.status).toBe(503);
  });

  it("fails closed when membership-context call fails", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: createMockFetcherThatThrows() });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
  });

  it("fails closed when membership returns malformed envelope", async () => {
    const env = createFakeEnv({ MEMBERSHIP_WORKER: createMockFetcher({ wrong: "shape" }) });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
  });

  it("fails closed when policy denies", async () => {
    const env = createFakeEnv({
      POLICY_WORKER: createMockFetcher({ data: { allow: false, reason: "denied", policyVersion: 1, derivedScope: { orgId: TEST_ORG_UUID } } }),
    });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
  });

  it("fails closed when policy-worker fetch throws", async () => {
    const env = createFakeEnv({ POLICY_WORKER: createMockFetcherThatThrows() });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
  });

  it("fails closed when policy returns malformed envelope", async () => {
    const env = createFakeEnv({ POLICY_WORKER: createMockFetcher({ wrong: "shape" }) });
    const projectsRepo = createFakeProjectsRepo();
    const eventsRepo = createFakeEventsRepo();

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
  });

  it("returns 404 when project not found in repository", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      archiveProject: async () => ({ ok: false as const, error: { kind: "not_found" as const } }),
    });
    const eventsRepo = createFakeEventsRepo();

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(404);
  });

  it("returns 503 when repository has internal failure", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      archiveProject: async () => ({ ok: false as const, error: { kind: "internal" as const, message: "db error" } }),
    });
    const eventsRepo = createFakeEventsRepo();

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(503);
  });

  it("event append failure prevents successful archive", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      archiveProject: async () => ({ ok: true as const, value: archivedProject }),
    });
    const eventsRepo = createFakeEventsRepo({
      appendEventWithAudit: async () => ({ ok: false as const, error: { kind: "internal" as const, message: "db error" } }),
    });

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    expect(res.status).toBe(503);
  });

  it("does not expose raw UUIDs in response", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      archiveProject: async () => ({ ok: true as const, value: archivedProject }),
    });
    const eventsRepo = createFakeEventsRepo();

    const res = await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });
    const text = await res.text();
    expect(text).not.toContain(TEST_ORG_UUID);
    expect(text).not.toContain(TEST_PROJECT_UUID);
  });

  it("does not expose raw UUIDs in event payload", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      archiveProject: async () => ({ ok: true as const, value: archivedProject }),
    });
    const eventsRepo = createFakeEventsRepo();

    await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });

    const eventCall = eventsRepo.appendEventWithAuditCalls[0]![0] as AppendEventWithAuditInput;
    const payload = eventCall.event.payload;
    const payloadStr = JSON.stringify(payload);
    expect(payloadStr).not.toContain(TEST_ORG_UUID);
    expect(payloadStr).not.toContain(TEST_PROJECT_UUID);
    expect(payload.projectId).toMatch(/^prj_/);
    expect(payload.orgId).toMatch(/^org_/);
  });

  it("audit description does not expose raw UUIDs or secrets", async () => {
    const env = createFakeEnv();
    const projectsRepo = createFakeProjectsRepo({
      archiveProject: async () => ({ ok: true as const, value: archivedProject }),
    });
    const eventsRepo = createFakeEventsRepo();

    await handleArchiveProject(env, "req_test", { subjectId: TEST_USER_ID, subjectType: "user" }, TEST_ORG_UUID, TEST_PROJECT_UUID, { projectsRepo, eventsRepo });

    const eventCall = eventsRepo.appendEventWithAuditCalls[0]![0] as AppendEventWithAuditInput;
    const description = eventCall.audit.description;
    expect(description).not.toContain(TEST_ORG_UUID);
    expect(description).not.toContain(TEST_PROJECT_UUID);
    expect(description).toContain("Archived project");
  });
});
