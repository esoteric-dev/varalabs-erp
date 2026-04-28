-- ============================================================================
-- Migration 029: Organisation Type and Services
-- Adds organisation type field and module/service activation for onboarding.
-- ============================================================================

-- Organisation Type: school, college, coaching, company, other
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS org_type TEXT NOT NULL DEFAULT 'school'
    CHECK (org_type IN ('school', 'college', 'coaching', 'company', 'other'));

-- Service/Module Definitions (predefined set of services institutions can enable)
CREATE TABLE IF NOT EXISTS services (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    description TEXT,
    category    TEXT NOT NULL,
    icon        TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

INSERT INTO services (id, code, name, description, category, icon, sort_order) VALUES
    ('30000000-0000-0000-0000-000000000001', 'students', 'Students', 'Manage student records', 'academics', 'school', 1),
    ('30000000-0000-0000-0000-000000000002', 'staff', 'Staff', 'Manage teachers and staff', 'academics', 'groups', 2),
    ('30000000-0000-0000-0000-000000000003', 'attendance', 'Attendance', 'Track daily attendance', 'academics', 'event_note', 3),
    ('30000000-0000-0000-0000-000000000004', 'exams', 'Exams', 'Exams and marks', 'academics', 'fact_check', 4),
    ('30000000-0000-0000-0000-000000000005', 'fees', 'Fees', 'Fee management', 'finance', 'payments', 5),
    ('30000000-0000-0000-0000-000000000006', 'admissions', 'Admissions', 'Online admissions', 'administration', 'how_to_reg', 6),
    ('30000000-0000-0000-0000-000000000007', 'notices', 'Notices', 'Announcements', 'communication', 'campaign', 7),
    ('30000000-0000-0000-0000-000000000008', 'payroll', 'Payroll', 'Salary management', 'finance', 'account_balance', 8),
    ('30000000-0000-0000-0000-000000000009', 'documents', 'Documents', 'PDF generation', 'administration', 'description', 9),
    ('30000000-0000-0000-0000-000000000010', 'library', 'Library', 'Book management', 'academics', 'menu_book', 10)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS organisation_services (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    service_id      UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    is_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    enabled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, service_id)
);

ALTER TABLE organisation_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_services FORCE ROW LEVEL SECURITY;

GRANT SELECT ON services TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON organisation_services TO app_user;

INSERT INTO organisation_services (organisation_id, service_id)
SELECT o.id, s.id
FROM organisations o
CROSS JOIN services s
WHERE s.code IN ('students', 'staff', 'attendance', 'fees', 'notices')
ON CONFLICT (organisation_id, service_id) DO NOTHING;