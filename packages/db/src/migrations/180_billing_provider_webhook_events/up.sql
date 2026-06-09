-- 180_billing_provider_webhook_events: Idempotent provider-webhook intake ledger
-- Records the opaque provider event id of every billing-provider webhook the
-- billing-worker has already processed, so re-deliveries (providers retry on
-- timeout/non-2xx) are de-duplicated and never materialize a state change twice.
--
-- Design rules (consistent with 110_billing_foundation):
--  * Append-only dedupe ledger owned by the billing bounded context. The unique
--    (provider, event_id) index is the idempotency key — intake inserts
--    ON CONFLICT DO NOTHING inside the same transaction as the state change, so
--    a failed apply rolls the dedupe row back and the provider's retry succeeds.
--  * No secret/credential material, no raw provider payloads, no signing
--    secrets. Only the opaque provider event id + event type for observability.
--  * Idempotent: CREATE SCHEMA/TABLE/INDEX IF NOT EXISTS for the Supabase
--    autocommit runner. No destructive rewrites of applied state.

CREATE SCHEMA IF NOT EXISTS billing;

CREATE TABLE IF NOT EXISTS billing.provider_webhook_events (
  id          TEXT        NOT NULL,
  provider    TEXT        NOT NULL,                  -- opaque adapter id ('polar' | 'stripe')
  event_id    TEXT        NOT NULL,                  -- opaque provider event id (Standard Webhooks webhook-id)
  event_type  TEXT        NOT NULL,                  -- provider event type, observability only
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (id),

  CONSTRAINT chk_provider_webhook_event_provider CHECK (provider IN ('polar', 'stripe'))
);

COMMENT ON TABLE billing.provider_webhook_events IS
  'Idempotent intake ledger for billing-provider webhooks. The unique '
  '(provider, event_id) index is the dedupe key; intake inserts inside the same '
  'transaction as the state change so a failed apply rolls the row back and the '
  'provider retry re-runs. No secrets, signing material, or raw payloads.';

-- Idempotency key: a provider event is processed at most once.
CREATE UNIQUE INDEX IF NOT EXISTS uq_provider_webhook_event
  ON billing.provider_webhook_events (provider, event_id);

-- Optional retention/observability scans by arrival time.
CREATE INDEX IF NOT EXISTS idx_provider_webhook_event_received
  ON billing.provider_webhook_events (received_at DESC);
