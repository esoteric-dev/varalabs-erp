-- ============================================================================
-- Class routines table for dashboard
-- ============================================================================

CREATE TABLE IF NOT EXISTS class_routines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    teacher_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_name      TEXT NOT NULL,
    section         TEXT,
    day_of_week     TEXT NOT NULL CHECK (day_of_week IN ('monday','tuesday','wednesday','thursday','friday','saturday')),
    start_time      TEXT NOT NULL,
    end_time        TEXT NOT NULL,
    room            TEXT,
    subject_name    TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE class_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_routines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON class_routines USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON class_routines TO app_user;
