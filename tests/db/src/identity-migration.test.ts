import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { manifest } from "@saas/db";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_ROOT = resolve(
  __dirname,
  "../../..",
  "packages/db/src/migrations",
);

describe("Identity Migration Verification", () => {
  const identityMigrations = manifest.migrations.filter(
    (m) => m.context === "identity",
  );

  it("has at least one identity migration", () => {
    expect(identityMigrations.length).toBeGreaterThan(0);
  });

  it("identity migration has context 'identity'", () => {
    for (const m of identityMigrations) {
      expect(m.context).toBe("identity");
    }
  });

  it("identity migration is ordered after control migrations", () => {
    const ids = manifest.migrations.map((m) => m.id);
    const controlIdx = ids.indexOf("000_control_baseline");
    const identityIdx = ids.indexOf("010_identity_core");

    expect(identityIdx).toBeGreaterThan(controlIdx);
  });

  describe("identity SQL schema validation", () => {
    const sql = readFileSync(
      resolve(MIGRATIONS_ROOT, "010_identity_core/up.sql"),
      "utf-8",
    );

    it("creates identity schema", () => {
      expect(sql).toContain("CREATE SCHEMA IF NOT EXISTS identity");
    });

    it("creates identity.users table", () => {
      expect(sql).toContain("identity.users");
    });

    it("creates identity.auth_identities table", () => {
      expect(sql).toContain("identity.auth_identities");
    });

    it("creates identity.login_challenges table", () => {
      expect(sql).toContain("identity.login_challenges");
    });

    it("creates identity.sessions table", () => {
      expect(sql).toContain("identity.sessions");
    });

    it("stores only hashed codes, never raw values", () => {
      expect(sql).toContain("code_hash");
      expect(sql).not.toMatch(/\bcode\b\s+TEXT/);
    });

    it("stores only hashed tokens, never raw values", () => {
      expect(sql).toContain("token_hash");
      expect(sql).not.toMatch(/\btoken\b\s+TEXT/);
    });

    it("uses normalized email column for lookup", () => {
      expect(sql).toContain("email_lower");
      expect(sql).toContain("users_email_lower_idx");
    });

    it("uses IF NOT EXISTS for idempotency", () => {
      const createStatements = sql.match(/CREATE\s+(TABLE|SCHEMA|INDEX)/g) ?? [];
      const ifNotExists = sql.match(/IF NOT EXISTS/g) ?? [];
      expect(ifNotExists.length).toBeGreaterThanOrEqual(createStatements.length);
    });

    it("does not reference cross-context tables", () => {
      expect(sql).not.toContain("membership.");
      expect(sql).not.toContain("projects.");
      expect(sql).not.toContain("billing.");
      expect(sql).not.toContain("events.");
    });

    it("does not require extensions like citext", () => {
      expect(sql).not.toContain("CREATE EXTENSION");
      expect(sql).not.toContain("citext");
    });

    it("foreign keys stay within identity context", () => {
      const fkMatches = sql.match(/REFERENCES\s+(\w+\.\w+)/g) ?? [];
      for (const fk of fkMatches) {
        expect(fk).toContain("identity.");
      }
    });
  });

  describe("project-scoped invariant still applies only to projects context", () => {
    const projectMigrations = manifest.migrations.filter(
      (m) => m.context === "projects",
    );

    it("identity migrations are not subject to project-scoped org_id/project_id check", () => {
      expect(identityMigrations.every((m) => m.context === "identity")).toBe(true);
      expect(identityMigrations.some((m) => m.context === "projects")).toBe(false);
    });
  });
});
