export interface Env {
  SOURCEPLANE_DB?: Hyperdrive;
  MEMBERSHIP_WORKER?: Fetcher;
  POLICY_WORKER?: Fetcher;
  ENVIRONMENT: string;
  DEBUG_DELIVERY: string;
}
