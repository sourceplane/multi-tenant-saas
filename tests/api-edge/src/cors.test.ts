import { handlePreflight, applyCorsHeaders, isAllowedOrigin } from "@api-edge/cors";
import type { Env } from "@api-edge/env";

const stageEnv: Env = { ENVIRONMENT: "stage", CONSOLE_CUSTOM_DOMAIN: "stage.sourceplane.ai" };
const prodEnv: Env = { ENVIRONMENT: "prod", CONSOLE_CUSTOM_DOMAIN: "prod.sourceplane.ai" };
const testEnv: Env = { ENVIRONMENT: "test" };

describe("api-edge cors", () => {
  describe("isAllowedOrigin — stage environment", () => {
    it("allows the stage custom domain origin", () => {
      expect(isAllowedOrigin("https://stage.sourceplane.ai", stageEnv)).toBe(true);
    });

    it("allows the stage console origin", () => {
      expect(isAllowedOrigin("https://sourceplane-web-console-stage.pages.dev", stageEnv)).toBe(true);
    });

    it("allows stage preview origins", () => {
      expect(isAllowedOrigin("https://abc123.sourceplane-web-console-stage.pages.dev", stageEnv)).toBe(true);
      expect(isAllowedOrigin("https://feat-branch-42.sourceplane-web-console-stage.pages.dev", stageEnv)).toBe(true);
    });

    it("rejects the prod custom domain origin", () => {
      expect(isAllowedOrigin("https://prod.sourceplane.ai", stageEnv)).toBe(false);
    });

    it("rejects the prod console origin", () => {
      expect(isAllowedOrigin("https://sourceplane-web-console-prod.pages.dev", stageEnv)).toBe(false);
    });

    it("rejects prod preview origins", () => {
      expect(isAllowedOrigin("https://abc123.sourceplane-web-console-prod.pages.dev", stageEnv)).toBe(false);
    });

    it("rejects the legacy console origin", () => {
      expect(isAllowedOrigin("https://sourceplane-web-console.pages.dev", stageEnv)).toBe(false);
    });

    it("allows localhost origins", () => {
      expect(isAllowedOrigin("http://localhost:5173", stageEnv)).toBe(true);
      expect(isAllowedOrigin("http://localhost:3000", stageEnv)).toBe(true);
      expect(isAllowedOrigin("https://localhost", stageEnv)).toBe(true);
    });

    it("allows 127.0.0.1 origins", () => {
      expect(isAllowedOrigin("http://127.0.0.1:5173", stageEnv)).toBe(true);
    });
  });

  describe("isAllowedOrigin — prod environment", () => {
    it("allows the prod custom domain origin", () => {
      expect(isAllowedOrigin("https://prod.sourceplane.ai", prodEnv)).toBe(true);
    });

    it("allows the prod console origin", () => {
      expect(isAllowedOrigin("https://sourceplane-web-console-prod.pages.dev", prodEnv)).toBe(true);
    });

    it("allows prod preview origins", () => {
      expect(isAllowedOrigin("https://abc123.sourceplane-web-console-prod.pages.dev", prodEnv)).toBe(true);
    });

    it("rejects the stage custom domain origin", () => {
      expect(isAllowedOrigin("https://stage.sourceplane.ai", prodEnv)).toBe(false);
    });

    it("rejects the stage console origin", () => {
      expect(isAllowedOrigin("https://sourceplane-web-console-stage.pages.dev", prodEnv)).toBe(false);
    });

    it("rejects stage preview origins", () => {
      expect(isAllowedOrigin("https://feat-branch-42.sourceplane-web-console-stage.pages.dev", prodEnv)).toBe(false);
    });

    it("rejects the legacy console origin", () => {
      expect(isAllowedOrigin("https://sourceplane-web-console.pages.dev", prodEnv)).toBe(false);
    });

    it("allows localhost origins", () => {
      expect(isAllowedOrigin("http://localhost:5173", prodEnv)).toBe(true);
    });

    it("allows 127.0.0.1 origins", () => {
      expect(isAllowedOrigin("http://127.0.0.1:5173", prodEnv)).toBe(true);
    });
  });

  describe("isAllowedOrigin — fallback (test/unknown environment)", () => {
    it("rejects custom domain origins when CONSOLE_CUSTOM_DOMAIN is not set", () => {
      expect(isAllowedOrigin("https://stage.sourceplane.ai", testEnv)).toBe(false);
      expect(isAllowedOrigin("https://prod.sourceplane.ai", testEnv)).toBe(false);
    });

    it("allows custom domain origin when CONSOLE_CUSTOM_DOMAIN is set", () => {
      const envWithDomain: Env = { ENVIRONMENT: "test", CONSOLE_CUSTOM_DOMAIN: "custom.example.com" };
      expect(isAllowedOrigin("https://custom.example.com", envWithDomain)).toBe(true);
    });

    it("allows both stage and prod console origins", () => {
      expect(isAllowedOrigin("https://sourceplane-web-console-stage.pages.dev", testEnv)).toBe(true);
      expect(isAllowedOrigin("https://sourceplane-web-console-prod.pages.dev", testEnv)).toBe(true);
    });

    it("allows preview origins for both environments", () => {
      expect(isAllowedOrigin("https://abc.sourceplane-web-console-stage.pages.dev", testEnv)).toBe(true);
      expect(isAllowedOrigin("https://abc.sourceplane-web-console-prod.pages.dev", testEnv)).toBe(true);
    });

    it("allows localhost origins", () => {
      expect(isAllowedOrigin("http://localhost:5173", testEnv)).toBe(true);
    });
  });

  describe("isAllowedOrigin — common rejections", () => {
    it("rejects null origin", () => {
      expect(isAllowedOrigin(null, stageEnv)).toBe(false);
      expect(isAllowedOrigin(null, prodEnv)).toBe(false);
    });

    it("rejects arbitrary origins", () => {
      expect(isAllowedOrigin("https://evil.com", stageEnv)).toBe(false);
      expect(isAllowedOrigin("https://evil.com", prodEnv)).toBe(false);
      expect(isAllowedOrigin("https://sourceplane-web-console-stage.pages.dev.evil.com", stageEnv)).toBe(false);
    });

    it("rejects similar but not matching origins", () => {
      expect(isAllowedOrigin("https://other-project.pages.dev", stageEnv)).toBe(false);
      expect(isAllowedOrigin("https://sourceplane-web-console-stage.pages.dev:8080", stageEnv)).toBe(false);
    });
  });

  describe("handlePreflight", () => {
    it("returns null for non-OPTIONS requests", () => {
      const req = new Request("https://api.test/v1/auth/session", { method: "GET" });
      expect(handlePreflight(req, stageEnv)).toBeNull();
    });

    it("returns 204 with CORS headers for allowed stage custom domain", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        method: "OPTIONS",
        headers: { origin: "https://stage.sourceplane.ai" },
      });
      const res = handlePreflight(req, stageEnv);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(204);
      expect(res!.headers.get("access-control-allow-origin")).toBe(
        "https://stage.sourceplane.ai",
      );
      expect(res!.headers.get("access-control-allow-credentials")).toBe("true");
    });

    it("returns 204 with CORS headers for allowed stage origin", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        method: "OPTIONS",
        headers: { origin: "https://sourceplane-web-console-stage.pages.dev" },
      });
      const res = handlePreflight(req, stageEnv);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(204);
      expect(res!.headers.get("access-control-allow-origin")).toBe(
        "https://sourceplane-web-console-stage.pages.dev",
      );
      expect(res!.headers.get("access-control-allow-methods")).toContain("GET");
      expect(res!.headers.get("access-control-allow-methods")).toContain("POST");
      expect(res!.headers.get("access-control-allow-headers")).toContain("authorization");
      expect(res!.headers.get("access-control-allow-headers")).toContain("content-type");
      expect(res!.headers.get("access-control-allow-headers")).toContain("x-request-id");
      expect(res!.headers.get("access-control-allow-headers")).toContain("traceparent");
      expect(res!.headers.get("access-control-allow-headers")).toContain("idempotency-key");
      expect(res!.headers.get("access-control-allow-credentials")).toBe("true");
      expect(res!.headers.get("vary")).toBe("Origin");
    });

    it("returns 204 without CORS headers when prod custom domain hits stage API", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        method: "OPTIONS",
        headers: { origin: "https://prod.sourceplane.ai" },
      });
      const res = handlePreflight(req, stageEnv);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(204);
      expect(res!.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("returns 204 without CORS headers when prod origin hits stage API", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        method: "OPTIONS",
        headers: { origin: "https://sourceplane-web-console-prod.pages.dev" },
      });
      const res = handlePreflight(req, stageEnv);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(204);
      expect(res!.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("returns 204 without CORS headers for disallowed origin", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        method: "OPTIONS",
        headers: { origin: "https://evil.com" },
      });
      const res = handlePreflight(req, stageEnv);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(204);
      expect(res!.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("returns 204 without CORS headers when no origin", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        method: "OPTIONS",
      });
      const res = handlePreflight(req, prodEnv);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(204);
      expect(res!.headers.get("access-control-allow-origin")).toBeNull();
    });
  });

  describe("applyCorsHeaders", () => {
    it("adds CORS headers for stage custom domain on stage env", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "https://stage.sourceplane.ai" },
      });
      const original = Response.json({ data: {} }, { status: 200 });
      const res = applyCorsHeaders(original, req, stageEnv);

      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe(
        "https://stage.sourceplane.ai",
      );
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
      expect(res.headers.get("vary")).toBe("Origin");
    });

    it("adds CORS headers for allowed stage origin on stage env", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "https://sourceplane-web-console-stage.pages.dev" },
      });
      const original = Response.json({ data: {} }, { status: 200 });
      const res = applyCorsHeaders(original, req, stageEnv);

      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe(
        "https://sourceplane-web-console-stage.pages.dev",
      );
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
      expect(res.headers.get("vary")).toBe("Origin");
    });

    it("does not add CORS headers for prod custom domain on stage env", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "https://prod.sourceplane.ai" },
      });
      const original = Response.json({ data: {} }, { status: 200 });
      const res = applyCorsHeaders(original, req, stageEnv);

      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("does not add CORS headers for prod origin on stage env", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "https://sourceplane-web-console-prod.pages.dev" },
      });
      const original = Response.json({ data: {} }, { status: 200 });
      const res = applyCorsHeaders(original, req, stageEnv);

      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("does not add CORS headers for stage custom domain on prod env", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "https://stage.sourceplane.ai" },
      });
      const original = Response.json({ data: {} }, { status: 200 });
      const res = applyCorsHeaders(original, req, prodEnv);

      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("does not add CORS headers for stage origin on prod env", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "https://sourceplane-web-console-stage.pages.dev" },
      });
      const original = Response.json({ data: {} }, { status: 200 });
      const res = applyCorsHeaders(original, req, prodEnv);

      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("does not add CORS headers for disallowed origin", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "https://evil.com" },
      });
      const original = Response.json({ data: {} }, { status: 200 });
      const res = applyCorsHeaders(original, req, stageEnv);

      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("preserves original response status and body", async () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "http://localhost:5173" },
      });
      const body = { error: { code: "unauthenticated", message: "No token" } };
      const original = Response.json(body, { status: 401 });
      const res = applyCorsHeaders(original, req, stageEnv);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual(body);
      expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    });
  });
});
