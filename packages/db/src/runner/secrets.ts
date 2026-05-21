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

  return parsed.connection_uri;
}
