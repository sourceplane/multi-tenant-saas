import { createSqlExecutor, __poolTestHooks } from "@saas/db/hyperdrive";

// Build a fake postgres client whose `unsafe` behaviour is scripted.
function fakeClient(unsafe: (text: string, params: unknown[]) => Promise<unknown>) {
  let ended = false;
  const c = Object.assign(
    () => {
      throw new Error("tagged template not supported");
    },
    {
      unsafe,
      begin: async (fn: (txSql: unknown) => Promise<unknown>) =>
        fn({ unsafe }),
      end: async () => {
        ended = true;
      },
      __ended: () => ended,
    },
  );
  return c;
}

describe("module-scoped client pool (connection reuse)", () => {
  afterEach(() => __poolTestHooks.reset());

  it("reuses ONE client across executors for the same connection string", async () => {
    let created = 0;
    __poolTestHooks.setFactory(() => {
      created += 1;
      return fakeClient(() => Promise.resolve([{ ok: 1 }])) as never;
    });

    const cs = "postgres://x/db";
    await createSqlExecutor({ connectionString: cs }).execute("SELECT 1");
    await createSqlExecutor({ connectionString: cs }).execute("SELECT 1");
    await createSqlExecutor({ connectionString: cs }).execute("SELECT 1");

    expect(created).toBe(1); // pooled + reused, not one per request
    expect(__poolTestHooks.size()).toBe(1);
  });

  it("keeps separate clients per connection string", async () => {
    let created = 0;
    __poolTestHooks.setFactory(() => {
      created += 1;
      return fakeClient(() => Promise.resolve([])) as never;
    });
    await createSqlExecutor({ connectionString: "postgres://x/a" }).execute("SELECT 1");
    await createSqlExecutor({ connectionString: "postgres://x/b" }).execute("SELECT 1");
    expect(created).toBe(2);
    expect(__poolTestHooks.size()).toBe(2);
  });

  it("self-heals a connection error: evict, recreate, retry once, succeed", async () => {
    let created = 0;
    __poolTestHooks.setFactory(() => {
      created += 1;
      if (created === 1) {
        return fakeClient(() => Promise.reject(new Error("write CONNECTION closed unexpectedly"))) as never;
      }
      return fakeClient(() => Promise.resolve([{ healed: true }])) as never;
    });

    const result = await createSqlExecutor({ connectionString: "postgres://x/db" }).execute("SELECT 1");
    expect(created).toBe(2); // first client evicted, fresh one created
    expect(result.rows).toEqual([{ healed: true }]);
  });

  it("does NOT retry on a non-connection (business) error", async () => {
    let created = 0;
    let calls = 0;
    __poolTestHooks.setFactory(() => {
      created += 1;
      return fakeClient(() => {
        calls += 1;
        return Promise.reject(new Error('duplicate key value violates unique constraint "uq"'));
      }) as never;
    });

    await expect(
      createSqlExecutor({ connectionString: "postgres://x/db" }).execute("INSERT ..."),
    ).rejects.toThrow("duplicate key");
    expect(created).toBe(1); // no recreate
    expect(calls).toBe(1); // no retry
  });

  it("dispose() is a no-op on the pooled path (client is not ended)", async () => {
    const client = fakeClient(() => Promise.resolve([]));
    __poolTestHooks.setFactory(() => client as never);
    const ex = createSqlExecutor({ connectionString: "postgres://x/db" });
    await ex.execute("SELECT 1");
    await ex.dispose();
    expect(client.__ended()).toBe(false); // pooled client persists
  });

  it("isConnectionError classifies connection vs business errors", () => {
    const ce = __poolTestHooks.isConnectionError;
    expect(ce(new Error("connection terminated"))).toBe(true);
    expect(ce(new Error("Cannot perform I/O on behalf of a different request"))).toBe(true);
    expect(ce(new Error("socket hang up"))).toBe(true);
    expect(ce(new Error("ECONNRESET"))).toBe(true);
    expect(ce(new Error('duplicate key value violates unique constraint'))).toBe(false);
    expect(ce(new Error("null value in column"))).toBe(false);
  });
});
