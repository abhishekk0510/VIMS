-- ─── V4: Row-level multi-tenancy ─────────────────────────────────────────────

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(30)  NOT NULL UNIQUE,
    description VARCHAR(500),
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Default tenant for existing data
INSERT INTO tenants (id, name, code, description, active)
VALUES ('00000000-0000-0000-0000-000000000001',
        'Default Organization', 'default',
        'Auto-created default tenant for existing data', TRUE);

-- ─── Add tenant_id to users ───────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE users SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE role != 'SUPER_ADMIN';

-- ─── Add tenant_id to invoices ────────────────────────────────────────────────
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE invoices SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE invoices ALTER COLUMN tenant_id SET NOT NULL;

-- ─── Add tenant_id to approval_workflows ─────────────────────────────────────
ALTER TABLE approval_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE approval_workflows SET tenant_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE approval_workflows ALTER COLUMN tenant_id SET NOT NULL;

-- ─── Add tenant_id to audit_logs ─────────────────────────────────────────────
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
UPDATE audit_logs SET tenant_id = '00000000-0000-0000-0000-000000000001';

-- ─── Update role check constraint to include SUPER_ADMIN ──────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('ADMIN','VENDOR','OPERATIONS','FINANCE','CLIENT','DEPT_HEAD','CFO','SUPER_ADMIN'));

-- ─── SUPER_ADMIN user (password: Admin@123) ───────────────────────────────────
-- Reusing bcrypt hash from V1 (Admin@123 at cost 12)
-- The superadmin should change this password after first login.
INSERT INTO users (id, name, email, password, role, enabled, account_locked, failed_login_attempts)
VALUES (
    uuid_generate_v4(),
    'Platform Super Admin',
    'superadmin@vims.com',
    '$2a$12$frVrEtRrjmrXjxpDxOPGkO8HKdXX8OnjcmkLqwAM5vCuj7VH77haa',
    'SUPER_ADMIN',
    TRUE,
    FALSE,
    0
);
-- Note: tenant_id intentionally remains NULL for SUPER_ADMIN

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_tenant_id        ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id     ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workflows_tenant_id    ON approval_workflows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id   ON audit_logs(tenant_id);
