-- ============================================================================
-- Staff/Teacher attendance + enhanced events for dashboard
-- ============================================================================

-- ── Staff Attendance ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_attendance (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('present','absent','late','excused','leave')),
    marked_by       UUID REFERENCES users(id),
    remarks         TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, date)
);

ALTER TABLE staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON staff_attendance USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_attendance TO app_user;

-- ── Enhance events table ──────────────────────────────────────────────────
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS event_for TEXT NOT NULL DEFAULT 'all' CHECK (event_for IN ('all','students','staff')),
    ADD COLUMN IF NOT EXISTS target_classes TEXT,
    ADD COLUMN IF NOT EXISTS target_sections TEXT,
    ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('celebration','training','meeting','holidays','general')),
    ADD COLUMN IF NOT EXISTS message TEXT;
