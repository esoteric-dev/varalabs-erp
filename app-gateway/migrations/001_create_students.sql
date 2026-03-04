-- ============================================================================
-- Synapse ERP — schema v2
-- Proper tenant/organisation hierarchy with UUID PKs and RLS isolation
-- ============================================================================

-- ── Application role ─────────────────────────────────────────────────────────
-- The pool connects as avnadmin (BYPASSRLS). Inside each transaction we
-- SET LOCAL ROLE app_user so that RLS policies are enforced.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user NOLOGIN;
    END IF;
END
$$;

-- ── Tenants ──────────────────────────────────────────────────────────────────
-- Top-level entity: a trust, school chain, or SaaS customer.
-- The `slug` matches the browser subdomain (greenwood.synapse.com → "greenwood").
CREATE TABLE IF NOT EXISTS tenants (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Organisations ────────────────────────────────────────────────────────────
-- A school, campus, or branch within a tenant.
CREATE TABLE IF NOT EXISTS organisations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Users ────────────────────────────────────────────────────────────────────
-- Login accounts. No tenant/org column — relationship lives in user_organisations.
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL DEFAULT '',
    role            TEXT NOT NULL CHECK (role IN (
                        'superadmin', 'admin', 'teacher',
                        'student', 'parent', 'general'
                    )),
    phone           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── User ↔ Organisation mapping ─────────────────────────────────────────────
-- A user can belong to one or more organisations.
CREATE TABLE IF NOT EXISTS user_organisations (
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, organisation_id)
);

-- ── Students (org + tenant scoped via RLS) ──────────────────────────────────
-- tenant_id is denormalized from organisations for fast RLS evaluation.
CREATE TABLE IF NOT EXISTS students (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id         UUID NOT NULL REFERENCES tenants(id),
    name              TEXT NOT NULL,
    class_name        TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE students FORCE ROW LEVEL SECURITY;

-- RLS: filter by BOTH tenant AND organisation.
-- current_setting(..., true) returns NULL instead of erroring when unset.
CREATE POLICY tenant_org_isolation ON students USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

-- ── Seed data ────────────────────────────────────────────────────────────────

-- Tenants
INSERT INTO tenants (id, name, slug) VALUES
    ('10000000-0000-0000-0000-000000000001', 'Greenwood Education Trust', 'greenwood'),
    ('10000000-0000-0000-0000-000000000002', 'Synapse Platform',         'synapse')
ON CONFLICT (slug) DO NOTHING;

-- Organisations
INSERT INTO organisations (id, tenant_id, name) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Greenwood Main Campus'),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Greenwood North Branch'),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Synapse HQ')
ON CONFLICT (id) DO NOTHING;

-- Users
INSERT INTO users (id, name, email, role, phone) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Admin User',            'admin@greenwood.edu',     'admin',      '+91 98765 43210'),
    ('a0000000-0000-0000-0000-000000000002', 'System Administrator',  'superadmin@synapse.edu',  'superadmin', '+91 99999 00000'),
    ('a0000000-0000-0000-0000-000000000003', 'Lakshmi Narayan',       'teacher@greenwood.edu',   'teacher',    '+91 98765 12345'),
    ('a0000000-0000-0000-0000-000000000004', 'Aarav Sharma',          'student@greenwood.edu',   'student',    NULL),
    ('a0000000-0000-0000-0000-000000000005', 'Raj Sharma',            'parent@greenwood.edu',    'parent',     '+91 98765 43210')
ON CONFLICT (email) DO NOTHING;

-- Map users to organisations (not to raw tenant strings)
INSERT INTO user_organisations (user_id, organisation_id) VALUES
    ('a0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001'),  -- admin → Greenwood Main
    ('a0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000003'),  -- superadmin → Synapse HQ
    ('a0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001'),  -- teacher → Greenwood Main
    ('a0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001'),  -- student → Greenwood Main
    ('a0000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001')   -- parent → Greenwood Main
ON CONFLICT DO NOTHING;

-- Students (belong to org + denormalized tenant)
INSERT INTO students (id, organisation_id, tenant_id, name, class_name) VALUES
    ('b0000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Aarav Sharma',  '10-A'),
    ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Priya Patel',   '10-B'),
    ('b0000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Rohan Gupta',   '9-A'),
    ('b0000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Sneha Iyer',    '10-A'),
    ('b0000000-0000-0000-0000-000000000005', '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Dev Mehta',     '9-B'),
    -- Two students in the North Branch (different org, same tenant) to prove isolation
    ('b0000000-0000-0000-0000-000000000006', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Keerthi Raj',   '8-A'),
    ('b0000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Nisha Bhat',    '8-B')
ON CONFLICT (id) DO NOTHING;

-- ── Grant app_user access to all tables ──────────────────────────────────────
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
