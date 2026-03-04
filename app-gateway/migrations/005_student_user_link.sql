-- ============================================================================
-- Synapse ERP — migration 005: Link students to user accounts + permissions
-- Adds user_id to students table and grants student role additional permissions
-- ============================================================================

-- ── Add user_id column to students ─────────────────────────────────────────
ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- ── Link seed student "Aarav Sharma" to user account ───────────────────────
UPDATE students SET user_id = 'a0000000-0000-0000-0000-000000000004'
WHERE id = 'b0000000-0000-0000-0000-000000000001';

-- ── Add missing permissions to student role ────────────────────────────────
DO $$
DECLARE
    org RECORD;
    r_stud UUID;
BEGIN
    FOR org IN SELECT id FROM organisations LOOP
        SELECT id INTO r_stud FROM roles
        WHERE organisation_id = org.id AND slug = 'student';

        IF r_stud IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r_stud, p.id FROM permissions p
            WHERE p.code IN ('notices.view', 'assignments.view', 'leave.view', 'students.view')
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;
