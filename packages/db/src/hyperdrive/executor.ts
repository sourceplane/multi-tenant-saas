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

export interface SqlExecutorFactory {
  create(binding: { connectionString: string }): SqlExecutor & { dispose(): Promise<void> };
}

export function createSqlExecutor(
  binding: { connectionString: string },
  clientFactory?: (connectionString: string) => postgres.Sql,
): SqlExecutor & { dispose(): Promise<void> } {
  const factory =
    clientFactory ??
    ((cs: string) =>
      postgres(cs, {
        max: 5,
        fetch_types: false,
        prepare: true,
      }));

  const sql = factory(binding.connectionString);

  return {
    async execute<T extends SqlRow = SqlRow>(
      text: string,
      params?: unknown[],
    ): Promise<SqlExecutorResult<T>> {
      const result = await sql.unsafe(text, (params ?? []) as never[]);
      return {
        rows: result as unknown as T[],
        rowCount: result.length,
      };
    },

    async dispose(): Promise<void> {
      try {
        await sql.end({ timeout: 3 });
      } catch {
        // Disposal failure must not leak errors.
      }
    },
  };
}
