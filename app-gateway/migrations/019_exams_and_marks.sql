-- ============================================================================
-- Exams & Student Marks tables
-- ============================================================================

-- ── Exams ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    class_name      TEXT NOT NULL,
    exam_date       DATE,
    total_marks     INTEGER NOT NULL DEFAULT 100,
    status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON exams USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON exams TO app_user;

-- ── Student Marks ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS student_marks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    exam_id         UUID REFERENCES exams(id) ON DELETE SET NULL,
    marks_obtained  NUMERIC(6,2) NOT NULL,
    total_marks     NUMERIC(6,2) NOT NULL DEFAULT 100,
    remarks         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, subject_id, exam_id)
);

ALTER TABLE student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_marks FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON student_marks USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON student_marks TO app_user;
