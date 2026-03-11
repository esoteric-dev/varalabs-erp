-- Staff details table for extended employee information
CREATE TABLE IF NOT EXISTS staff_details (
    user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    tenant_id     UUID NOT NULL REFERENCES tenants(id),
    organisation_id UUID NOT NULL REFERENCES organisations(id),
    designation   TEXT,
    department    TEXT,
    qualification TEXT,
    date_of_birth DATE,
    gender        TEXT CHECK (gender IN ('male', 'female', 'other')),
    blood_group   TEXT,
    marital_status TEXT CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    address       TEXT,
    city          TEXT,
    state         TEXT,
    zip_code      TEXT,
    country       TEXT DEFAULT 'India',
    bank_account_name   TEXT,
    bank_account_number TEXT,
    bank_name     TEXT,
    bank_ifsc     TEXT,
    bank_branch   TEXT,
    date_of_joining DATE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE staff_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_details_tenant_isolation ON staff_details
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid
           AND organisation_id = current_setting('app.current_org', true)::uuid);
