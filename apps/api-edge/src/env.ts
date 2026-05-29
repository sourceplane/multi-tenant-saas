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
  ENVIRONMENT: string;
  CONSOLE_CUSTOM_DOMAIN?: string;
}
