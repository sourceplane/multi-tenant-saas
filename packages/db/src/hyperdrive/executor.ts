import postgres from "postgres";

export interface SqlRow {
  [column: string]: unknown;
}

export interface SqlExecutorResult<T extends SqlRow = SqlRow> {
  rows: T[];
  rowCount: number;
}

export interface SqlExecutor {
  execute<T extends SqlRow = SqlRow>(
    text: string,
    params?: unknown[],
  ): Promise<SqlExecutorResult<T>>;
}

export interface TransactionalSqlExecutor extends SqlExecutor {
  transaction<T>(fn: (executor: SqlExecutor) => Promise<T>): Promise<T>;
}

export interface SqlExecutorFactory {
  create(binding: { connectionString: string }): SqlExecutor & { dispose(): Promise<void> };
}

function defaultClientFactory(cs: string): postgres.Sql {
  return postgres(cs, {
    max: 5,
    fetch_types: false,
    prepare: true,
  });
}

// ── Module-scoped client pool (PERF: connection reuse) ──────────────────────
//
// Previously every handler created a fresh postgres client per request and
// `sql.end()`-ed it, so the TLS/auth handshake to Hyperdrive recurred on every
// request in every worker (the dominant measured per-worker latency floor).
// Cloudflare Workers keep isolates warm, so we cache one client per connection
// string at module scope and reuse it across requests; Hyperdrive pools the
// actual Postgres connections server-side.
//
// Resilience: if a query fails with a connection-level error (including the
// Workers "I/O on behalf of a different request" case), we evict the cached
// client, recreate it, and retry the operation ONCE. The retry fires only for
// connection errors — never for constraint/business errors — and a write that
// hit a connection error has not committed, so re-running is safe.
const CLIENT_POOL = new Map<string, postgres.Sql>();

// Factory used by the pooled (production) path. Overridable in tests via
// `__poolTestHooks` so the reuse + self-heal behavior can be exercised without a
// real database; production always uses `defaultClientFactory`.
let poolClientFactory: (cs: string) => postgres.Sql = defaultClientFactory;

function getPooledClient(cs: string): postgres.Sql {
  let c = CLIENT_POOL.get(cs);
  if (!c) {
    c = poolClientFactory(cs);
    CLIENT_POOL.set(cs, c);
  }
  return c;
}

/** Test-only hooks for the module-scoped client pool. Not for production use. */
export const __poolTestHooks = {
  setFactory(f: (cs: string) => postgres.Sql): void {
    poolClientFactory = f;
  },
  reset(): void {
    poolClientFactory = defaultClientFactory;
    CLIENT_POOL.clear();
  },
  size(): number {
    return CLIENT_POOL.size;
  },
  isConnectionError,
};

function evictPooledClient(cs: string): void {
  const c = CLIENT_POOL.get(cs);
  if (!c) return;
  CLIENT_POOL.delete(cs);
  // Best-effort background close of the broken client; never block or throw.
  try {
    void c.end({ timeout: 1 }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function isConnectionError(err: unknown): boolean {
  const msg = String(
    (err && typeof err === "object" && "message" in err
      ? (err as { message?: unknown }).message
      : err) ?? "",
  ).toLowerCase();
  return (
    msg.includes("connection") ||
    msg.includes("socket") ||
    msg.includes("closed") ||
    msg.includes("terminated") ||
    msg.includes("different request") ||
    msg.includes("cannot perform i/o") ||
    msg.includes("econnreset") ||
    msg.includes("reset by peer") ||
    msg.includes("not connected") ||
    msg.includes("timeout")
  );
}

function toResult<T extends SqlRow>(rows: unknown): SqlExecutorResult<T> {
  const arr = rows as unknown[];
  return { rows: arr as T[], rowCount: arr.length };
}

function makeExecutorOver(
  getClient: () => postgres.Sql,
  onConnectionError: (() => postgres.Sql) | null,
  dispose: () => Promise<void>,
): TransactionalSqlExecutor & { dispose(): Promise<void> } {
  async function run<R>(op: (sql: postgres.Sql) => Promise<R>): Promise<R> {
    const sql = getClient();
    try {
      return await op(sql);
    } catch (err) {
      if (onConnectionError && isConnectionError(err)) {
        const fresh = onConnectionError();
        return await op(fresh); // single self-healing retry on a fresh client
      }
      throw err;
    }
  }

  return {
    async execute<T extends SqlRow = SqlRow>(
      text: string,
      params?: unknown[],
    ): Promise<SqlExecutorResult<T>> {
      return run(async (sql) => {
        const result = await sql.unsafe(text, (params ?? []) as never[]);
        return toResult<T>(result);
      });
    },

    async transaction<T>(fn: (executor: SqlExecutor) => Promise<T>): Promise<T> {
      return run(async (sql) => {
        return (await sql.begin(async (txSql) => {
          const txExecutor: SqlExecutor = {
            async execute<R extends SqlRow = SqlRow>(
              text: string,
              params?: unknown[],
            ): Promise<SqlExecutorResult<R>> {
              const result = await txSql.unsafe(
                text,
                (params ?? []) as never[],
              );
              return toResult<R>(result);
            },
          };
          return fn(txExecutor);
        })) as T;
      });
    },

    dispose,
  };
}

export function createSqlExecutor(
  binding: { connectionString: string },
  clientFactory?: (connectionString: string) => postgres.Sql,
): TransactionalSqlExecutor & { dispose(): Promise<void> } {
  const cs = binding.connectionString;

  // Explicit factory (unit tests / special cases): per-instance client with a
  // real dispose, no module pooling — preserves the original semantics.
  if (clientFactory) {
    const sql = clientFactory(cs);
    return makeExecutorOver(
      () => sql,
      null,
      async () => {
        try {
          await sql.end({ timeout: 3 });
        } catch {
          /* Disposal failure must not leak errors. */
        }
      },
    );
  }

  // Production: reuse a module-scoped client across requests; dispose is a no-op
  // (the pooled client persists for the warm isolate). Self-heals on connection
  // errors by evicting + recreating + retrying once.
  return makeExecutorOver(
    () => getPooledClient(cs),
    () => {
      evictPooledClient(cs);
      return getPooledClient(cs);
    },
    async () => {
      /* no-op: pooled client is reused across requests */
    },
  );
}
