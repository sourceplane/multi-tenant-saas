export interface SupabaseSecret {
  project_ref: string;
  project_url: string;
  database_host: string;
  database_port: string;
  database_name: string;
  database_user: string;
  database_password: string;
  connection_uri: string;
}

export async function loadConnectionUri(
  secretName: string,
  region: string,
  poolerRegion?: string,
): Promise<string> {
  const {
    SecretsManagerClient,
    GetSecretValueCommand,
  } = await import("@aws-sdk/client-secrets-manager");

  const client = new SecretsManagerClient({ region });
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName }),
  );

  if (!response.SecretString) {
    throw new Error(`Secret ${secretName} has no string value`);
  }

  const parsed: SupabaseSecret = JSON.parse(response.SecretString);

  if (!parsed.connection_uri) {
    throw new Error(
      `Secret ${secretName} missing connection_uri field`,
    );
  }

  // When a pooler region is provided, use the Supabase session pooler to avoid
  // IPv6 connectivity issues with the direct database host. The pooler has IPv4
  // addresses and supports session-level advisory locks and transactions.
  if (poolerRegion && parsed.project_ref && parsed.database_password) {
    const poolerHost = `aws-0-${poolerRegion}.pooler.supabase.com`;
    const user = `postgres.${parsed.project_ref}`;
    const db = parsed.database_name ?? "postgres";
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(parsed.database_password)}@${poolerHost}:5432/${db}`;
  }

  return parsed.connection_uri;
}
