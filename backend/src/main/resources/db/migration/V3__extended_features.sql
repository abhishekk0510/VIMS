-- V3__extended_features.sql
-- Extended features: new roles, vendor master fields, audit_logs table

-- ─── Update role CHECK constraint to include DEPT_HEAD, CFO ─────────────────
ALTER TABLE IF EXISTS users
    DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE IF EXISTS users
    ADD CONSTRAINT users_role_check
        CHECK (role IN ('ADMIN','VENDOR','OPERATIONS','FINANCE','CLIENT','DEPT_HEAD','CFO'));

-- ─── VendorMaster: add new fields ───────────────────────────────────────────
ALTER TABLE IF EXISTS vendor_master
    ADD COLUMN IF NOT EXISTS gstin        VARCHAR(15),
    ADD COLUMN IF NOT EXISTS pan          VARCHAR(10),
    ADD COLUMN IF NOT EXISTS vendor_type  VARCHAR(30),
    ADD COLUMN IF NOT EXISTS msme_registered BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS account_name VARCHAR(100);

-- ─── AUDIT LOGS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type   VARCHAR(50)  NOT NULL,
    actor        VARCHAR(100) NOT NULL,
    actor_role   VARCHAR(30)  NOT NULL,
    description  VARCHAR(500) NOT NULL,
    invoice_ref  VARCHAR(50),
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
