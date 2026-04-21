-- V1__init_schema.sql
-- VIMS Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                 VARCHAR(100) NOT NULL,
    email                VARCHAR(150) NOT NULL UNIQUE,
    password             VARCHAR(255) NOT NULL,
    role                 VARCHAR(20)  NOT NULL CHECK (role IN ('ADMIN','VENDOR','OPERATIONS','FINANCE','CLIENT')),
    enabled              BOOLEAN NOT NULL DEFAULT TRUE,
    account_locked       BOOLEAN NOT NULL DEFAULT FALSE,
    failed_login_attempts INT NOT NULL DEFAULT 0,
    lock_time            TIMESTAMP,
    phone                VARCHAR(20),
    created_at           TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── VENDOR MASTER ──────────────────────────────────────────────────────────
CREATE TABLE vendor_master (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    vendor_code    VARCHAR(30) NOT NULL UNIQUE,
    contact_person VARCHAR(100),
    phone          VARCHAR(15),
    address        VARCHAR(200),
    bank_name      VARCHAR(50),
    account_number VARCHAR(30),
    ifsc_code      VARCHAR(20),
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── INVOICES ───────────────────────────────────────────────────────────────
CREATE TABLE invoices (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number     VARCHAR(50) NOT NULL UNIQUE,
    vendor_id          UUID NOT NULL REFERENCES users(id),
    invoice_date       DATE NOT NULL,
    amount             NUMERIC(15,2) NOT NULL,
    client_name        VARCHAR(100),
    description        VARCHAR(500),
    status             VARCHAR(30) NOT NULL DEFAULT 'DRAFT'
                           CHECK (status IN ('DRAFT','SUBMITTED','OPS_PENDING','FINANCE_PENDING','APPROVED','REJECTED','PAID')),
    file_path          VARCHAR(255),
    file_name          VARCHAR(100),
    file_type          VARCHAR(50),
    rejection_remarks  VARCHAR(500),
    ai_analysis        TEXT,
    ai_anomaly_flag    BOOLEAN,
    ai_risk_score      NUMERIC(5,2),
    created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── APPROVAL HISTORY ───────────────────────────────────────────────────────
CREATE TABLE approval_history (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    action_by     UUID NOT NULL REFERENCES users(id),
    role          VARCHAR(20) NOT NULL,
    status_after  VARCHAR(30) NOT NULL,
    remarks       VARCHAR(500),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── REFRESH TOKENS ─────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(512) NOT NULL UNIQUE,
    expiry_date TIMESTAMP NOT NULL,
    revoked     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── NOTIFICATIONS LOG ──────────────────────────────────────────────────────
CREATE TABLE notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id),
    subject    VARCHAR(255),
    body       TEXT,
    sent       BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ─── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX idx_invoices_vendor     ON invoices(vendor_id);
CREATE INDEX idx_invoices_status     ON invoices(status);
CREATE INDEX idx_invoices_date       ON invoices(invoice_date);
CREATE INDEX idx_approval_invoice    ON approval_history(invoice_id);
CREATE INDEX idx_refresh_token       ON refresh_tokens(token);

-- ─── DEFAULT ADMIN USER (password: Admin@123) ────────────────────────────────
-- BCrypt hash of "Admin@123" with strength 12
INSERT INTO users (id, name, email, password, role, enabled)
VALUES (
    uuid_generate_v4(),
    'System Admin',
    'admin@vims.com',
    '$2a$12$frVrEtRrjmrXjxpDxOPGkO8HKdXX8OnjcmkLqwAM5vCuj7VH77haa',
    'ADMIN',
    TRUE
);
