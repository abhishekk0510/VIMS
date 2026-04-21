-- ─── V2: Dynamic Approval Workflow Engine ────────────────────────────────────

-- ─── APPROVAL WORKFLOWS ──────────────────────────────────────────────────────
CREATE TABLE approval_workflows (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    is_active   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP
);

-- ─── WORKFLOW LEVELS ─────────────────────────────────────────────────────────
CREATE TABLE workflow_levels (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id   UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,
    level_order   INT NOT NULL,
    level_name    VARCHAR(100) NOT NULL,
    approver_role VARCHAR(30) NOT NULL,
    min_amount    NUMERIC(15,2),
    max_amount    NUMERIC(15,2),
    UNIQUE(workflow_id, level_order)
);

-- ─── ADD WORKFLOW TRACKING TO INVOICES ───────────────────────────────────────
ALTER TABLE invoices ADD COLUMN workflow_id UUID REFERENCES approval_workflows(id);
ALTER TABLE invoices ADD COLUMN current_approval_step INTEGER;

-- ─── UPDATE STATUS CONSTRAINT (drop old first, then migrate data) ────────────
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('DRAFT','SUBMITTED','OPS_PENDING','FINANCE_PENDING','PENDING_APPROVAL','APPROVED','REJECTED','PAID'));

-- ─── MIGRATE EXISTING STATUSES ───────────────────────────────────────────────
UPDATE invoices SET status = 'DRAFT' WHERE status = 'SUBMITTED';
UPDATE invoices SET status = 'PENDING_APPROVAL', current_approval_step = 1 WHERE status = 'OPS_PENDING';
UPDATE invoices SET status = 'PENDING_APPROVAL', current_approval_step = 2 WHERE status = 'FINANCE_PENDING';

-- ─── TIGHTEN CONSTRAINT (after data migration) ───────────────────────────────
ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status IN ('DRAFT','PENDING_APPROVAL','APPROVED','REJECTED','PAID'));

-- ─── INSERT DEFAULT WORKFLOW ─────────────────────────────────────────────────
DO $$
DECLARE
    wf_id UUID := uuid_generate_v4();
BEGIN
    INSERT INTO approval_workflows (id, name, description, is_active)
    VALUES (wf_id,
            'Standard Approval Flow',
            'Two-level approval: Operations review followed by Finance review',
            TRUE);

    INSERT INTO workflow_levels (workflow_id, level_order, level_name, approver_role)
    VALUES
        (wf_id, 1, 'Operations Review', 'OPERATIONS'),
        (wf_id, 2, 'Finance Review',    'FINANCE');

    -- Link existing pending invoices to the default workflow
    UPDATE invoices SET workflow_id = wf_id WHERE status = 'PENDING_APPROVAL';
END $$;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_workflow_levels_workflow  ON workflow_levels(workflow_id);
CREATE INDEX idx_invoices_workflow         ON invoices(workflow_id);
CREATE INDEX idx_approval_workflows_active ON approval_workflows(is_active);
