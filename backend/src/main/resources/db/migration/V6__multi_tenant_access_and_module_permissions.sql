-- V6: Multi-tenant user access and dynamic module permissions

CREATE TABLE IF NOT EXISTS user_tenant_access (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_tenant UNIQUE (user_id, tenant_id)
);

CREATE TABLE IF NOT EXISTS user_module_permissions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    module_key VARCHAR(30)  NOT NULL,
    enabled    BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_user_module UNIQUE (user_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_user_tenant_access_user   ON user_tenant_access (user_id);
CREATE INDEX IF NOT EXISTS idx_user_module_perms_user    ON user_module_permissions (user_id);
