-- Audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS audit_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    action           TEXT NOT NULL,                    -- e.g., 'student.created', 'user.updated'
    entity_type      TEXT NOT NULL,                    -- e.g., 'student', 'user', 'fee'
    entity_id        UUID NOT NULL,                    -- ID of the affected entity
    entity_name      TEXT NOT NULL DEFAULT '',          -- Human-readable name
    details          TEXT NOT NULL DEFAULT '',          -- JSON or text description of changes
    performed_by     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    ip_address       INET,
    user_agent       TEXT,
    is_sensitive     BOOLEAN NOT NULL DEFAULT FALSE,    -- Flag for sensitive operations
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast querying by org and date
CREATE INDEX idx_audit_logs_org_date ON audit_logs(organisation_id, created_at DESC);
CREATE INDEX idx_audit_logs_tenant_date ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_performed_by ON audit_logs(performed_by);

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

-- Policy: Users can only see audit logs for their own org
CREATE POLICY audit_logs_tenant_isolation ON audit_logs
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- Grant access to app_user
GRANT SELECT, INSERT ON audit_logs TO app_user;

COMMENT ON TABLE audit_logs IS 'Tracks all admin actions for audit and compliance purposes';
