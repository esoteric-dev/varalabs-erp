-- 2026-03-07 Add settings.update permission and grant to Admin roles

-- 1. Add the permission if not exists
INSERT INTO permissions (code, module, description)
VALUES ('settings.update', 'settings', 'Update organisation settings')
ON CONFLICT (code) DO NOTHING;

-- 2. Grant to all Admin roles in all organisations
DO $$
DECLARE
    perm_id UUID;
    r RECORD;
BEGIN
    SELECT id INTO perm_id FROM permissions WHERE code = 'settings.update';
    FOR r IN SELECT id FROM roles WHERE slug = 'admin' LOOP
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (r.id, perm_id)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
