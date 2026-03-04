-- Migration 004: Teacher Features
-- Adds teacher-class assignments, assignments (homework), leave requests,
-- modifies attendance status constraint, adds target_classes to notices.

-- ── 1. teacher_class_assignments ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teacher_class_assignments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    class_name       TEXT NOT NULL,
    is_class_teacher BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, class_name, organisation_id)
);

CREATE INDEX IF NOT EXISTS idx_tca_user ON teacher_class_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_tca_org ON teacher_class_assignments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_tca_class ON teacher_class_assignments(class_name);

ALTER TABLE teacher_class_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_class_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON teacher_class_assignments USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON teacher_class_assignments TO app_user;

-- ── 2. assignments ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS assignments (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    title            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    class_name       TEXT NOT NULL,
    subject          TEXT,
    assigned_by      UUID NOT NULL REFERENCES users(id),
    due_date         DATE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_org ON assignments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(class_name);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_by ON assignments(assigned_by);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON assignments USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO app_user;

-- ── 3. leave_requests ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leave_requests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type       TEXT NOT NULL CHECK (leave_type IN ('casual','sick','earned','other')),
    start_date       DATE NOT NULL,
    end_date         DATE NOT NULL,
    reason           TEXT NOT NULL DEFAULT '',
    status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
    reviewed_by      UUID REFERENCES users(id),
    reviewed_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_org ON leave_requests(organisation_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON leave_requests USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON leave_requests TO app_user;

-- ── 4. ALTER attendance_records: add 'leave' status ───────────────────────────

ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_status_check;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_status_check
    CHECK (status IN ('present','absent','late','excused','leave'));

-- ── 5. ALTER notices: add target_classes column ───────────────────────────────

ALTER TABLE notices ADD COLUMN IF NOT EXISTS target_classes TEXT;

-- ── 6. New permissions ────────────────────────────────────────────────────────

INSERT INTO permissions (code, module, description) VALUES
    ('assignments.view',   'assignments', 'View assignments'),
    ('assignments.manage', 'assignments', 'Create and manage assignments'),
    ('leave.view',         'leave',       'View leave requests and apply for leave'),
    ('leave.manage',       'leave',       'Approve or reject leave requests')
ON CONFLICT (code) DO NOTHING;

-- ── 7. Update role permissions ────────────────────────────────────────────────

-- Teacher role: add assignments, leave.view, notices.manage
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'teacher'
  AND p.code IN ('assignments.view', 'assignments.manage', 'leave.view', 'notices.manage')
ON CONFLICT DO NOTHING;

-- Admin role: add assignments, leave
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.slug = 'admin'
  AND p.code IN ('assignments.view', 'assignments.manage', 'leave.view', 'leave.manage')
ON CONFLICT DO NOTHING;

-- ── 8. Seed data ──────────────────────────────────────────────────────────────

-- Teacher (Lakshmi Narayan: a0000000-...-0003) class assignments
INSERT INTO teacher_class_assignments (organisation_id, tenant_id, user_id, class_name, is_class_teacher) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003', '10-A', true),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003', '9-A', false)
ON CONFLICT DO NOTHING;

-- Sample assignments
INSERT INTO assignments (organisation_id, tenant_id, title, description, class_name, subject, assigned_by, due_date) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
     'Trigonometry Problem Set', 'Complete exercises 5.1 to 5.4 from the textbook',
     '10-A', 'Mathematics', 'a0000000-0000-0000-0000-000000000003', CURRENT_DATE + INTERVAL '7 days'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
     'Linear Equations Worksheet', 'Solve the attached worksheet on linear equations in two variables',
     '9-A', 'Mathematics', 'a0000000-0000-0000-0000-000000000003', CURRENT_DATE + INTERVAL '3 days'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
     'Chapter 8 Summary', 'Write a summary of Chapter 8: Quadrilaterals (minimum 300 words)',
     '10-A', 'Mathematics', 'a0000000-0000-0000-0000-000000000003', NULL)
ON CONFLICT DO NOTHING;

-- Sample leave requests
INSERT INTO leave_requests (organisation_id, tenant_id, user_id, leave_type, start_date, end_date, reason, status) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003', 'casual', CURRENT_DATE + INTERVAL '14 days',
     CURRENT_DATE + INTERVAL '15 days', 'Family function', 'pending'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000003', 'sick', CURRENT_DATE - INTERVAL '30 days',
     CURRENT_DATE - INTERVAL '28 days', 'Fever and cold', 'approved')
ON CONFLICT DO NOTHING;
