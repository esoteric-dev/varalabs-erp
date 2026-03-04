-- ============================================================================
-- Synapse ERP — migration 002: Dynamic Roles & Permissions
-- Adds org-scoped dynamic roles, a global permissions master list,
-- and migrates users.role → system_role.
-- ============================================================================

-- ── New tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        TEXT NOT NULL UNIQUE,
    module      TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);

CREATE TABLE IF NOT EXISTS roles (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name             TEXT NOT NULL,
    slug             TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    is_system        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (organisation_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(organisation_id);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);

CREATE TABLE IF NOT EXISTS user_org_roles (
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    role_id          UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by      UUID REFERENCES users(id),
    assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, organisation_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_org_roles_user_org ON user_org_roles(user_id, organisation_id);

-- ── Trigger: enforce role belongs to the same organisation ──────────────────

CREATE OR REPLACE FUNCTION check_role_org_match()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM roles
        WHERE id = NEW.role_id AND organisation_id = NEW.organisation_id
    ) THEN
        RAISE EXCEPTION 'Role % does not belong to organisation %',
            NEW.role_id, NEW.organisation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_user_org_roles_check
    BEFORE INSERT OR UPDATE ON user_org_roles
    FOR EACH ROW EXECUTE FUNCTION check_role_org_match();

-- ── Seed permissions ────────────────────────────────────────────────────────

INSERT INTO permissions (code, module, description) VALUES
    ('students.view',       'students',    'View student records'),
    ('students.manage',     'students',    'Create, update, delete student records'),
    ('fees.view',           'fees',        'View fee records and payment status'),
    ('fees.manage',         'fees',        'Create fee structures, record payments'),
    ('admissions.view',     'admissions',  'View admission applications'),
    ('admissions.manage',   'admissions',  'Process admission applications'),
    ('attendance.view',     'attendance',  'View attendance records'),
    ('attendance.manage',   'attendance',  'Mark and modify attendance'),
    ('payroll.view',        'payroll',     'View payroll and salary information'),
    ('payroll.manage',      'payroll',     'Process payroll, modify salary structures'),
    ('roles.view',          'roles',       'View roles and their permissions'),
    ('roles.manage',        'roles',       'Create, update, delete roles and assign permissions'),
    ('users.view',          'users',       'View user accounts'),
    ('users.manage',        'users',       'Create, update user accounts and assign roles'),
    ('notices.view',        'notices',     'View notices and announcements'),
    ('notices.manage',      'notices',     'Create and manage notices'),
    ('reports.view',        'reports',     'View reports and analytics'),
    ('dashboard.view',      'dashboard',   'View dashboard')
ON CONFLICT (code) DO NOTHING;

-- ── Seed default roles per existing organisation ────────────────────────────

DO $$
DECLARE
    org RECORD;
    r_admin  UUID;
    r_teach  UUID;
    r_stud   UUID;
    r_parent UUID;
BEGIN
    FOR org IN SELECT id FROM organisations LOOP
        -- Admin: full access
        INSERT INTO roles (organisation_id, name, slug, description, is_system)
        VALUES (org.id, 'Admin', 'admin', 'Full access to all features', true)
        ON CONFLICT (organisation_id, slug) DO NOTHING
        RETURNING id INTO r_admin;

        IF r_admin IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r_admin, p.id FROM permissions p
            ON CONFLICT DO NOTHING;
        END IF;

        -- Teacher
        INSERT INTO roles (organisation_id, name, slug, description, is_system)
        VALUES (org.id, 'Teacher', 'teacher', 'Teaching staff access', true)
        ON CONFLICT (organisation_id, slug) DO NOTHING
        RETURNING id INTO r_teach;

        IF r_teach IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r_teach, p.id FROM permissions p
            WHERE p.code IN (
                'students.view', 'attendance.view', 'attendance.manage',
                'notices.view', 'dashboard.view', 'reports.view'
            )
            ON CONFLICT DO NOTHING;
        END IF;

        -- Student
        INSERT INTO roles (organisation_id, name, slug, description, is_system)
        VALUES (org.id, 'Student', 'student', 'Student access', true)
        ON CONFLICT (organisation_id, slug) DO NOTHING
        RETURNING id INTO r_stud;

        IF r_stud IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r_stud, p.id FROM permissions p
            WHERE p.code IN ('dashboard.view', 'fees.view', 'attendance.view')
            ON CONFLICT DO NOTHING;
        END IF;

        -- Parent
        INSERT INTO roles (organisation_id, name, slug, description, is_system)
        VALUES (org.id, 'Parent', 'parent', 'Parent/guardian access', true)
        ON CONFLICT (organisation_id, slug) DO NOTHING
        RETURNING id INTO r_parent;

        IF r_parent IS NOT NULL THEN
            INSERT INTO role_permissions (role_id, permission_id)
            SELECT r_parent, p.id FROM permissions p
            WHERE p.code IN ('dashboard.view', 'fees.view', 'attendance.view', 'students.view')
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END
$$;

-- ── Migrate existing users to dynamic roles ─────────────────────────────────
-- Map each user's hardcoded role → matching dynamic role via user_organisations

INSERT INTO user_org_roles (user_id, organisation_id, role_id)
SELECT uo.user_id, uo.organisation_id, r.id
FROM user_organisations uo
JOIN users u ON u.id = uo.user_id
JOIN roles r ON r.organisation_id = uo.organisation_id AND r.slug = u.role
WHERE u.role IN ('admin', 'teacher', 'student', 'parent')
ON CONFLICT DO NOTHING;

-- general users get the student role as a fallback
INSERT INTO user_org_roles (user_id, organisation_id, role_id)
SELECT uo.user_id, uo.organisation_id, r.id
FROM user_organisations uo
JOIN users u ON u.id = uo.user_id
JOIN roles r ON r.organisation_id = uo.organisation_id AND r.slug = 'student'
WHERE u.role = 'general'
ON CONFLICT DO NOTHING;

-- ── Alter users.role → system_role ──────────────────────────────────────────

ALTER TABLE users RENAME COLUMN role TO system_role;
ALTER TABLE users DROP CONSTRAINT users_role_check;
UPDATE users SET system_role = 'user'
    WHERE system_role IN ('admin', 'teacher', 'student', 'parent', 'general');
ALTER TABLE users ADD CONSTRAINT users_system_role_check
    CHECK (system_role IN ('superadmin', 'tenant_admin', 'user'));

-- ── Grants for app_user ─────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON permissions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON role_permissions TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_org_roles TO app_user;
