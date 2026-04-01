CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE subscription_tier AS ENUM ('FREE', 'PRO', 'PARTNER');
CREATE TYPE marketplace_platform AS ENUM ('AMAZON', 'FLIPKART', 'MEESHO', 'ONDC', 'INSTAGRAM', 'SHOPIFY', 'SWIGGY', 'ZOMATO');
CREATE TYPE connection_status AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISCONNECTED');
CREATE TYPE ingestion_source AS ENUM ('API', 'CSV_UPLOAD', 'WHATSAPP_CSV');
CREATE TYPE ingestion_status AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE order_status AS ENUM ('DELIVERED', 'RTO', 'RETURNED', 'CANCELLED', 'IN_TRANSIT');
CREATE TYPE fee_source AS ENUM ('ESTIMATED', 'ACTUAL');
CREATE TYPE discrepancy_type AS ENUM ('MISSING_PAYOUT', 'OVERCHARGED_SHIPPING', 'UNJUSTIFIED_RTO', 'GST_MISMATCH');
CREATE TYPE discrepancy_status AS ENUM ('OPEN', 'READY_TO_FILE', 'FILED', 'RESOLVED', 'DISMISSED');

CREATE TABLE app_user (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_e164 TEXT NOT NULL UNIQUE,
  display_name TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'en-IN',
  subscription_tier subscription_tier NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE marketplace_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id),
  platform marketplace_platform NOT NULL,
  storefront_label TEXT NOT NULL,
  external_seller_id TEXT,
  auth_mode TEXT NOT NULL,
  credentials_encrypted BYTEA,
  status connection_status NOT NULL DEFAULT 'PENDING',
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX marketplace_connection_user_platform_label_idx
  ON marketplace_connection (user_id, platform, storefront_label);

CREATE TABLE ingestion_job (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id),
  marketplace_connection_id UUID REFERENCES marketplace_connection(id),
  source ingestion_source NOT NULL,
  status ingestion_status NOT NULL DEFAULT 'QUEUED',
  idempotency_key TEXT NOT NULL UNIQUE,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE uploaded_file (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingestion_job_id UUID NOT NULL REFERENCES ingestion_job(id) ON DELETE CASCADE,
  original_filename TEXT NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE order_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_connection_id UUID NOT NULL REFERENCES marketplace_connection(id),
  ingestion_job_id UUID REFERENCES ingestion_job(id),
  external_order_id TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  settlement_date TIMESTAMPTZ,
  status order_status NOT NULL,
  currency_code CHAR(3) NOT NULL DEFAULT 'INR',
  gross_sales_paise BIGINT NOT NULL,
  seller_discount_paise BIGINT NOT NULL DEFAULT 0,
  ad_spend_paise BIGINT NOT NULL DEFAULT 0,
  package_weight_grams INTEGER NOT NULL,
  shipping_zone TEXT NOT NULL,
  actual_payout_paise BIGINT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (marketplace_connection_id, external_order_id)
);

CREATE INDEX order_record_connection_order_date_idx
  ON order_record (marketplace_connection_id, order_date DESC);

CREATE TABLE order_fee_line (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES order_record(id) ON DELETE CASCADE,
  fee_code TEXT NOT NULL,
  fee_label TEXT NOT NULL,
  source fee_source NOT NULL,
  amount_paise BIGINT NOT NULL,
  gst_paise BIGINT NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX order_fee_line_order_fee_code_idx
  ON order_fee_line (order_id, fee_code);

CREATE TABLE payout_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_connection_id UUID NOT NULL REFERENCES marketplace_connection(id),
  payout_reference TEXT NOT NULL,
  payout_date TIMESTAMPTZ NOT NULL,
  gross_payout_paise BIGINT NOT NULL,
  bank_reference TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (marketplace_connection_id, payout_reference)
);

CREATE TABLE payout_allocation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES payout_record(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES order_record(id) ON DELETE CASCADE,
  allocated_paise BIGINT NOT NULL,
  allocation_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (payout_id, order_id)
);

CREATE TABLE discrepancy_case (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_user(id),
  marketplace_connection_id UUID NOT NULL REFERENCES marketplace_connection(id),
  order_id UUID REFERENCES order_record(id),
  type discrepancy_type NOT NULL,
  status discrepancy_status NOT NULL DEFAULT 'OPEN',
  detected_amount_paise BIGINT NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discrepancy_case_user_status_idx
  ON discrepancy_case (user_id, status, detected_at DESC);

CREATE TABLE dispute_claim (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discrepancy_case_id UUID NOT NULL UNIQUE REFERENCES discrepancy_case(id) ON DELETE CASCADE,
  platform_ticket_reference TEXT,
  claim_amount_paise BIGINT NOT NULL,
  generated_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  filed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_event (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES app_user(id),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
