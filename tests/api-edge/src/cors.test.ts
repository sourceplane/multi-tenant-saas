import { handlePreflight, applyCorsHeaders, isAllowedOrigin } from "@api-edge/cors";
import type { Env } from "@api-edge/env";

const mockEnv: Env = {
  ENVIRONMENT: "test",
};

describe("api-edge cors", () => {
  describe("isAllowedOrigin", () => {
    it("allows the production Pages origin", () => {
      expect(isAllowedOrigin("https://sourceplane-web-console.pages.dev", mockEnv)).toBe(true);
    });

    it("allows Pages preview origins", () => {
      expect(isAllowedOrigin("https://abc123.sourceplane-web-console.pages.dev", mockEnv)).toBe(true);
      expect(isAllowedOrigin("https://feat-branch-42.sourceplane-web-console.pages.dev", mockEnv)).toBe(true);
    });

    it("allows localhost origins", () => {
      expect(isAllowedOrigin("http://localhost:5173", mockEnv)).toBe(true);
      expect(isAllowedOrigin("http://localhost:3000", mockEnv)).toBe(true);
      expect(isAllowedOrigin("https://localhost", mockEnv)).toBe(true);
    });

    it("allows 127.0.0.1 origins", () => {
      expect(isAllowedOrigin("http://127.0.0.1:5173", mockEnv)).toBe(true);
    });

    it("rejects null origin", () => {
      expect(isAllowedOrigin(null, mockEnv)).toBe(false);
    });

    it("rejects arbitrary origins", () => {
      expect(isAllowedOrigin("https://evil.com", mockEnv)).toBe(false);
      expect(isAllowedOrigin("https://sourceplane-web-console.pages.dev.evil.com", mockEnv)).toBe(false);
    });

    it("rejects similar but not matching origins", () => {
      expect(isAllowedOrigin("https://other-project.pages.dev", mockEnv)).toBe(false);
      expect(isAllowedOrigin("https://sourceplane-web-console.pages.dev:8080", mockEnv)).toBe(false);
    });
  });

  describe("handlePreflight", () => {
    it("returns null for non-OPTIONS requests", () => {
      const req = new Request("https://api.test/v1/auth/session", { method: "GET" });
      expect(handlePreflight(req, mockEnv)).toBeNull();
    });

    it("returns 204 with CORS headers for allowed origin", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        method: "OPTIONS",
        headers: { origin: "https://sourceplane-web-console.pages.dev" },
      });
      const res = handlePreflight(req, mockEnv);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(204);
      expect(res!.headers.get("access-control-allow-origin")).toBe(
        "https://sourceplane-web-console.pages.dev",
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

    it("returns 204 without CORS headers for disallowed origin", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        method: "OPTIONS",
        headers: { origin: "https://evil.com" },
      });
      const res = handlePreflight(req, mockEnv);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(204);
      expect(res!.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("returns 204 without CORS headers when no origin", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        method: "OPTIONS",
      });
      const res = handlePreflight(req, mockEnv);
      expect(res).not.toBeNull();
      expect(res!.status).toBe(204);
      expect(res!.headers.get("access-control-allow-origin")).toBeNull();
    });
  });

  describe("applyCorsHeaders", () => {
    it("adds CORS headers for allowed origin", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "https://sourceplane-web-console.pages.dev" },
      });
      const original = Response.json({ data: {} }, { status: 200 });
      const res = applyCorsHeaders(original, req, mockEnv);

      expect(res.status).toBe(200);
      expect(res.headers.get("access-control-allow-origin")).toBe(
        "https://sourceplane-web-console.pages.dev",
      );
      expect(res.headers.get("access-control-allow-credentials")).toBe("true");
      expect(res.headers.get("vary")).toBe("Origin");
    });

    it("does not add CORS headers for disallowed origin", () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "https://evil.com" },
      });
      const original = Response.json({ data: {} }, { status: 200 });
      const res = applyCorsHeaders(original, req, mockEnv);

      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    });

    it("preserves original response status and body", async () => {
      const req = new Request("https://api.test/v1/auth/session", {
        headers: { origin: "http://localhost:5173" },
      });
      const body = { error: { code: "unauthenticated", message: "No token" } };
      const original = Response.json(body, { status: 401 });
      const res = applyCorsHeaders(original, req, mockEnv);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json).toEqual(body);
      expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    });
  });
});
