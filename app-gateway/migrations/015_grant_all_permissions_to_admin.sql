-- 2026-03-07 Grant all permissions to Admin role in each organisation (except superadmin-only)

-- 1. Grant all permissions except superadmin-only to Admin roles
DO $$
DECLARE
    perm RECORD;
    r RECORD;
BEGIN
    FOR perm IN SELECT id FROM permissions WHERE code NOT IN ('superadmin.only') LOOP
        FOR r IN SELECT id FROM roles WHERE slug = 'admin' LOOP
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES (r.id, perm.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
