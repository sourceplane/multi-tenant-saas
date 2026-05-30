export interface Env {
  SOURCEPLANE_DB?: Hyperdrive;
  IDENTITY_WORKER?: Fetcher;
  MEMBERSHIP_WORKER?: Fetcher;
  PROJECTS_WORKER?: Fetcher;
  EVENTS_WORKER?: Fetcher;
  CONFIG_WORKER?: Fetcher;
  WEBHOOKS_WORKER?: Fetcher;
  METERING_WORKER?: Fetcher;
  BILLING_WORKER?: Fetcher;
  // Optional KV binding backing the Stripe-style idempotency replay store
  // (Task 0095). Absent on `dev` (no live worker) and absent on the older
  // verify-only stages. When unbound, `replayOrExecute` degrades to a
  // direct downstream forward — never 5xx.
  IDEMPOTENCY_KV?: KVNamespace;
  ENVIRONMENT: string;
  CONSOLE_CUSTOM_DOMAIN?: string;
}
