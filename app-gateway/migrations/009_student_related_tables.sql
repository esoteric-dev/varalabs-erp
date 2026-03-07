CREATE TABLE IF NOT EXISTS student_parents (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    father_name TEXT,
    father_phone TEXT,
    father_occupation TEXT,
    mother_name TEXT,
    mother_phone TEXT,
    mother_occupation TEXT,
    guardian_name TEXT,
    guardian_phone TEXT,
    guardian_relation TEXT,
    guardian_occupation TEXT,
    guardian_email TEXT
);
ALTER TABLE student_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_parents FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON student_parents USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid AND organisation_id = current_setting('app.current_org', true)::uuid
);

CREATE TABLE IF NOT EXISTS student_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    address_type TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    country TEXT
);
ALTER TABLE student_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_addresses FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON student_addresses USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid AND organisation_id = current_setting('app.current_org', true)::uuid
);

CREATE TABLE IF NOT EXISTS student_medical_history (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    allergies TEXT,
    medications TEXT,
    past_conditions TEXT
);
ALTER TABLE student_medical_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_medical_history FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON student_medical_history USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid AND organisation_id = current_setting('app.current_org', true)::uuid
);

CREATE TABLE IF NOT EXISTS student_previous_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    school_name TEXT NOT NULL,
    address TEXT
);
ALTER TABLE student_previous_schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_previous_schools FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON student_previous_schools USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid AND organisation_id = current_setting('app.current_org', true)::uuid
);

CREATE TABLE IF NOT EXISTS student_custom_data (
    student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
ALTER TABLE student_custom_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_custom_data FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_org_isolation ON student_custom_data USING (
    tenant_id = current_setting('app.current_tenant', true)::uuid AND organisation_id = current_setting('app.current_org', true)::uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
