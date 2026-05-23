import {
  createSqlExecutor,
  type SqlRow,
} from "@saas/db/hyperdrive";

describe("SqlExecutor", () => {
  describe("parameterized query execution", () => {
    it("passes parameters to the underlying client", async () => {
      let capturedQuery: string | undefined;
      let capturedParams: unknown[] | undefined;

      const fakeSql = Object.assign(
        () => {
          throw new Error("tagged template not supported");
        },
        {
          unsafe: (text: string, params: unknown[]) => {
            capturedQuery = text;
            capturedParams = params;
            return Promise.resolve([{ id: "u-001", name: "test" }]);
          },
          end: () => Promise.resolve(),
        },
      );

      const executor = createSqlExecutor(
        { connectionString: "postgres://fake:fake@localhost/test" },
        () => fakeSql as never,
      );

      const result = await executor.execute(
        "SELECT * FROM users WHERE id = $1 AND status = $2",
        ["u-001", "active"],
      );

      expect(capturedQuery).toBe("SELECT * FROM users WHERE id = $1 AND status = $2");
      expect(capturedParams).toEqual(["u-001", "active"]);
      expect(result.rows).toEqual([{ id: "u-001", name: "test" }]);
      expect(result.rowCount).toBe(1);

      await executor.dispose();
    });

    it("defaults to empty params array when none provided", async () => {
      let capturedParams: unknown[] | undefined;

      const fakeSql = Object.assign(
        () => {
          throw new Error("tagged template not supported");
        },
        {
          unsafe: (_text: string, params: unknown[]) => {
            capturedParams = params;
            return Promise.resolve([]);
          },
          end: () => Promise.resolve(),
        },
      );

      const executor = createSqlExecutor(
        { connectionString: "postgres://fake:fake@localhost/test" },
        () => fakeSql as never,
      );

      await executor.execute("SELECT 1");

      expect(capturedParams).toEqual([]);

      await executor.dispose();
    });
  });

  describe("typed row results", () => {
    it("returns typed rows matching the generic parameter", async () => {
      interface UserRow extends SqlRow {
        id: string;
        email: string;
      }

      const fakeSql = Object.assign(
        () => {
          throw new Error("tagged template not supported");
        },
        {
          unsafe: () =>
            Promise.resolve([
              { id: "u-001", email: "test@example.com" },
              { id: "u-002", email: "other@example.com" },
            ]),
          end: () => Promise.resolve(),
        },
      );

      const executor = createSqlExecutor(
        { connectionString: "postgres://fake:fake@localhost/test" },
        () => fakeSql as never,
      );

      const result = await executor.execute<UserRow>("SELECT * FROM users");

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]!.id).toBe("u-001");
      expect(result.rows[0]!.email).toBe("test@example.com");
      expect(result.rowCount).toBe(2);

      await executor.dispose();
    });
  });

  describe("error propagation", () => {
    it("throws SQL errors to callers (repository handles them)", async () => {
      const fakeSql = Object.assign(
        () => {
          throw new Error("tagged template not supported");
        },
        {
          unsafe: () => Promise.reject(new Error("connection refused")),
          end: () => Promise.resolve(),
        },
      );

      const executor = createSqlExecutor(
        { connectionString: "postgres://fake:fake@localhost/test" },
        () => fakeSql as never,
      );

      await expect(executor.execute("SELECT 1")).rejects.toThrow("connection refused");

      await executor.dispose();
    });
  });

  describe("dispose safety", () => {
    it("swallows dispose errors silently", async () => {
      const fakeSql = Object.assign(
        () => {
          throw new Error("tagged template not supported");
        },
        {
          unsafe: () => Promise.resolve([]),
          end: () => Promise.reject(new Error("already closed")),
        },
      );

      const executor = createSqlExecutor(
        { connectionString: "postgres://fake:fake@localhost/test" },
        () => fakeSql as never,
      );

      await expect(executor.dispose()).resolves.toBeUndefined();
    });
  });

  describe("Worker-safe export surface", () => {
    it("exports executor alongside existing hyperdrive symbols", async () => {
      const mod = await import("@saas/db/hyperdrive");
      const keys = Object.keys(mod);

      expect(keys).toContain("createSqlExecutor");
      expect(keys).toContain("createHyperdriveAdapter");
      expect(keys).not.toContain("runMigrations");
      expect(keys).not.toContain("PgAdapter");
      expect(keys).not.toContain("loadSecret");
    });
  });
});
