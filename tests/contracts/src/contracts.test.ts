import {
  HEALTH_STATUS,
  ERROR_CODES,
  type ErrorResponse,
  type TenantContext,
} from "@saas/contracts";
import { makeTenantContext, makeHealthResponse } from "@saas/testing/fixtures";

describe("contracts: health types", () => {
  it("exports HEALTH_STATUS constants", () => {
    expect(HEALTH_STATUS.OK).toBe("ok");
    expect(HEALTH_STATUS.DEGRADED).toBe("degraded");
    expect(HEALTH_STATUS.DOWN).toBe("down");
  });

  it("makeHealthResponse returns a valid HealthResponse shape", () => {
    const r = makeHealthResponse();
    expect(r.status).toBe("ok");
    expect(typeof r.service).toBe("string");
    expect(typeof r.timestamp).toBe("string");
  });

  it("makeHealthResponse accepts overrides", () => {
    const r = makeHealthResponse({ status: "degraded", service: "api-edge" });
    expect(r.status).toBe("degraded");
    expect(r.service).toBe("api-edge");
  });
});

describe("contracts: error types", () => {
  it("exports ERROR_CODES constants", () => {
    expect(ERROR_CODES.NOT_FOUND).toBe("not_found");
    expect(ERROR_CODES.UNAUTHORIZED).toBe("unauthorized");
    expect(ERROR_CODES.FORBIDDEN).toBe("forbidden");
    expect(ERROR_CODES.VALIDATION_ERROR).toBe("validation_error");
    expect(ERROR_CODES.INTERNAL_ERROR).toBe("internal_error");
  });

  it("ErrorResponse shape is structurally correct", () => {
    const e: ErrorResponse = {
      error: "not_found",
      message: "Resource not found",
    };
    expect(e.error).toBe("not_found");
  });
});

describe("contracts: tenancy types", () => {
  it("makeTenantContext returns a valid TenantContext", () => {
    const ctx = makeTenantContext();
    expect(ctx.orgId).toBe("org_test");
    expect(ctx.actorKind).toBe("user");
  });

  it("makeTenantContext accepts partial overrides", () => {
    const ctx = makeTenantContext({ orgId: "org_acme", projectId: "proj_1" });
    expect(ctx.orgId).toBe("org_acme");
    expect(ctx.projectId).toBe("proj_1");
  });

  it("TenantContext shape includes actorId", () => {
    const ctx: TenantContext = {
      orgId: "org_x",
      actorId: "svc_deployer",
      actorKind: "service",
    };
    expect(ctx.actorKind).toBe("service");
  });
});
