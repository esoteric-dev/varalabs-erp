CREATE TABLE IF NOT EXISTS organisation_settings (
    organisation_id UUID PRIMARY KEY REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    student_onboarding_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE organisation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_org_isolation ON organisation_settings USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON organisation_settings TO app_user;
