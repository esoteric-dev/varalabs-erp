-- ============================================================================
-- Employee ID support for staff/teachers
-- ============================================================================

-- Add employee_id sequence counter to organisation_settings
ALTER TABLE organisation_settings
    ADD COLUMN IF NOT EXISTS employee_seq INTEGER NOT NULL DEFAULT 0;

-- Add employee_id column to user_organisations (org-scoped)
ALTER TABLE user_organisations
    ADD COLUMN IF NOT EXISTS employee_id TEXT;

-- Generate employee IDs for existing staff (non-student users in each org)
-- This uses a DO block to iterate orgs and assign sequential IDs
DO $$
DECLARE
    org RECORD;
    usr RECORD;
    seq INTEGER;
    yr TEXT;
BEGIN
    yr := to_char(NOW(), 'YYYY');
    FOR org IN
        SELECT DISTINCT uo.organisation_id, os.tenant_id
        FROM user_organisations uo
        JOIN organisations o ON o.id = uo.organisation_id
        LEFT JOIN organisation_settings os ON os.organisation_id = uo.organisation_id
        WHERE os.tenant_id IS NOT NULL
    LOOP
        seq := 0;
        FOR usr IN
            SELECT uo.user_id, uo.organisation_id
            FROM user_organisations uo
            JOIN users u ON u.id = uo.user_id
            LEFT JOIN user_org_roles uor ON uor.user_id = u.id AND uor.organisation_id = uo.organisation_id
            LEFT JOIN roles r ON r.id = uor.role_id
            WHERE uo.organisation_id = org.organisation_id
              AND uo.employee_id IS NULL
              AND (r.slug IS NULL OR r.slug != 'student')
            GROUP BY uo.user_id, uo.organisation_id, u.created_at
            ORDER BY u.created_at
        LOOP
            seq := seq + 1;
            UPDATE user_organisations
            SET employee_id = 'EMP-' || yr || '-' || LPAD(seq::text, 4, '0')
            WHERE user_id = usr.user_id
              AND organisation_id = usr.organisation_id;
        END LOOP;

        -- Update the sequence counter
        UPDATE organisation_settings
        SET employee_seq = seq
        WHERE organisation_id = org.organisation_id;
    END LOOP;
END $$;
