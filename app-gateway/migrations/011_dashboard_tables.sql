-- ============================================================================
-- Dashboard feature tables + admission sequence + classes
-- ============================================================================

-- ── Events / Schedules ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    description     TEXT,
    event_date      DATE NOT NULL,
    end_date        DATE,
    start_time      TEXT,
    end_time        TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON events USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON events TO app_user;

-- ── Subjects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    class_name      TEXT,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON subjects USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON subjects TO app_user;

-- ── Student Activities ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_activities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    student_id      UUID REFERENCES students(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    description     TEXT,
    activity_date   DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE student_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_activities FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON student_activities USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON student_activities TO app_user;

-- ── Admin Todos ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_todos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    title           TEXT NOT NULL,
    due_time        TEXT,
    status          TEXT NOT NULL DEFAULT 'yet_to_start' CHECK (status IN ('completed', 'in_progress', 'yet_to_start')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admin_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_todos FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON admin_todos USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON admin_todos TO app_user;

-- ── Extend organisation_settings ────────────────────────────────────────────
ALTER TABLE organisation_settings
    ADD COLUMN IF NOT EXISTS admission_seq INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS classes JSONB NOT NULL DEFAULT '[]'::jsonb;
