-- ============================================================================
-- Synapse ERP — migration 003: Module Tables
-- Adds tables for attendance, fees, admissions, notices, payroll.
-- Each table is RLS-isolated by tenant + organisation.
-- ============================================================================

-- ── Attendance ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS attendance_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date             DATE NOT NULL,
    status           TEXT NOT NULL CHECK (status IN ('present','absent','late','excused')),
    marked_by        UUID REFERENCES users(id),
    remarks          TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_org ON attendance_records(organisation_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);

ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON attendance_records USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

-- ── Fee Structures ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fee_structures (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    name             TEXT NOT NULL,
    amount           BIGINT NOT NULL,
    frequency        TEXT NOT NULL CHECK (frequency IN ('monthly','quarterly','annually','one_time')),
    class_name       TEXT,
    academic_year    TEXT NOT NULL DEFAULT '2024-25',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_structures_org ON fee_structures(organisation_id);

ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_structures FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON fee_structures USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

-- ── Fee Records ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fee_records (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    student_id       UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fee_structure_id UUID NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    amount_due       BIGINT NOT NULL,
    amount_paid      BIGINT NOT NULL DEFAULT 0,
    status           TEXT NOT NULL CHECK (status IN ('pending','partial','paid','overdue','waived')),
    due_date         DATE NOT NULL,
    paid_date        DATE,
    payment_mode     TEXT CHECK (payment_mode IN ('cash','upi','bank_transfer','cheque','online')),
    receipt_number   TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fee_records_org ON fee_records(organisation_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_student ON fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_structure ON fee_records(fee_structure_id);

ALTER TABLE fee_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE fee_records FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON fee_records USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

-- ── Admission Applications ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS admission_applications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    student_name     TEXT NOT NULL,
    guardian_name    TEXT NOT NULL,
    guardian_phone   TEXT NOT NULL,
    guardian_email   TEXT,
    applied_class    TEXT NOT NULL,
    status           TEXT NOT NULL CHECK (status IN ('submitted','under_review','approved','rejected','waitlisted')),
    academic_year    TEXT NOT NULL DEFAULT '2025-26',
    notes            TEXT NOT NULL DEFAULT '',
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_by      UUID REFERENCES users(id),
    reviewed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admissions_org ON admission_applications(organisation_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admission_applications(status);

ALTER TABLE admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admission_applications FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON admission_applications USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

-- ── Notices ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notices (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    title            TEXT NOT NULL,
    body             TEXT NOT NULL,
    audience         TEXT NOT NULL CHECK (audience IN ('all','teachers','students','parents','staff')),
    priority         TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    published        BOOLEAN NOT NULL DEFAULT FALSE,
    created_by       UUID NOT NULL REFERENCES users(id),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notices_org ON notices(organisation_id);
CREATE INDEX IF NOT EXISTS idx_notices_audience ON notices(audience);

ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON notices USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

-- ── Staff Salaries ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS staff_salaries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    basic_pay        BIGINT NOT NULL,
    allowances       BIGINT NOT NULL DEFAULT 0,
    deductions       BIGINT NOT NULL DEFAULT 0,
    effective_from   DATE NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, effective_from)
);

CREATE INDEX IF NOT EXISTS idx_staff_salaries_org ON staff_salaries(organisation_id);
CREATE INDEX IF NOT EXISTS idx_staff_salaries_user ON staff_salaries(user_id);

ALTER TABLE staff_salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_salaries FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON staff_salaries USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

-- ── Payroll Runs ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payroll_runs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id),
    month            INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year             INTEGER NOT NULL,
    status           TEXT NOT NULL CHECK (status IN ('draft','processing','completed','cancelled')),
    total_gross      BIGINT NOT NULL DEFAULT 0,
    total_net        BIGINT NOT NULL DEFAULT 0,
    processed_by     UUID REFERENCES users(id),
    processed_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_payroll_runs_org ON payroll_runs(organisation_id);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON payroll_runs USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

-- ── Payroll Entries ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS payroll_entries (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id   UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id),
    basic_pay        BIGINT NOT NULL,
    allowances       BIGINT NOT NULL DEFAULT 0,
    deductions       BIGINT NOT NULL DEFAULT 0,
    net_pay          BIGINT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_entries_run ON payroll_entries(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_entries_user ON payroll_entries(user_id);

-- No direct RLS on payroll_entries — access is controlled through payroll_runs queries

-- ── Grants ─────────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON attendance_records TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_structures TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON fee_records TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON admission_applications TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON notices TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_salaries TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON payroll_runs TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON payroll_entries TO app_user;

-- ── Seed Data for Greenwood Main Campus ────────────────────────────────────

-- Attendance records for today
INSERT INTO attendance_records (organisation_id, tenant_id, student_id, date, status, marked_by) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE, 'present', 'a0000000-0000-0000-0000-000000000003'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE, 'present', 'a0000000-0000-0000-0000-000000000003'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', CURRENT_DATE, 'absent', 'a0000000-0000-0000-0000-000000000003'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', CURRENT_DATE, 'present', 'a0000000-0000-0000-0000-000000000003'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', CURRENT_DATE, 'late', 'a0000000-0000-0000-0000-000000000003')
ON CONFLICT (student_id, date) DO NOTHING;

-- Fee structures
INSERT INTO fee_structures (id, organisation_id, tenant_id, name, amount, frequency, class_name, academic_year) VALUES
    ('f1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Tuition Fee', 1500000, 'quarterly', NULL, '2024-25'),
    ('f1000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Lab Fee', 250000, 'annually', '10-A', '2024-25'),
    ('f1000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Transport Fee', 500000, 'monthly', NULL, '2024-25')
ON CONFLICT (id) DO NOTHING;

-- Fee records
INSERT INTO fee_records (organisation_id, tenant_id, student_id, fee_structure_id, amount_due, amount_paid, status, due_date, paid_date, payment_mode) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001', 1500000, 1500000, 'paid', '2025-01-15', '2025-01-10', 'upi'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000001', 1500000, 750000, 'partial', '2025-01-15', NULL, 'bank_transfer'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000001', 1500000, 0, 'pending', '2025-01-15', NULL, NULL),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 'f1000000-0000-0000-0000-000000000002', 250000, 250000, 'paid', '2025-03-01', '2025-02-28', 'cash'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000005', 'f1000000-0000-0000-0000-000000000003', 500000, 0, 'overdue', '2025-02-01', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Admission applications
INSERT INTO admission_applications (organisation_id, tenant_id, student_name, guardian_name, guardian_phone, guardian_email, applied_class, status, academic_year, notes) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Meera Krishnan', 'Suresh Krishnan', '+91 98765 11111', 'suresh.k@email.com', '6-A', 'submitted', '2025-26', 'Transferring from Delhi Public School'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Arjun Nair', 'Deepa Nair', '+91 98765 22222', 'deepa.nair@email.com', '9-B', 'under_review', '2025-26', 'Excellent academic record from previous school'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Kavya Menon', 'Ravi Menon', '+91 98765 33333', NULL, '8-A', 'approved', '2025-26', '')
ON CONFLICT DO NOTHING;

-- Notices
INSERT INTO notices (organisation_id, tenant_id, title, body, audience, priority, published, created_by) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Annual Day Celebration', 'The annual day celebration will be held on March 15, 2025. All students are expected to participate in cultural activities.', 'all', 'high', true, 'a0000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Staff Meeting - March', 'Monthly staff meeting scheduled for March 5, 2025 at 3:00 PM in the conference room.', 'teachers', 'normal', true, 'a0000000-0000-0000-0000-000000000001'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Fee Payment Reminder', 'Quarterly fee payments for Q4 are due by March 31, 2025. Please clear all pending dues.', 'parents', 'urgent', true, 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Staff salaries
INSERT INTO staff_salaries (organisation_id, tenant_id, user_id, basic_pay, allowances, deductions, effective_from) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 5500000, 1500000, 800000, '2024-04-01'),
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 4200000, 1000000, 600000, '2024-04-01')
ON CONFLICT (user_id, effective_from) DO NOTHING;

-- Payroll run
INSERT INTO payroll_runs (id, organisation_id, tenant_id, month, year, status, total_gross, total_net, processed_by, processed_at) VALUES
    ('e1000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 2, 2025, 'completed', 12200000, 10800000, 'a0000000-0000-0000-0000-000000000001', '2025-02-28 10:00:00+05:30')
ON CONFLICT (organisation_id, month, year) DO NOTHING;

-- Payroll entries
INSERT INTO payroll_entries (payroll_run_id, user_id, basic_pay, allowances, deductions, net_pay) VALUES
    ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 5500000, 1500000, 800000, 6200000),
    ('e1000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 4200000, 1000000, 600000, 4600000)
ON CONFLICT DO NOTHING;
