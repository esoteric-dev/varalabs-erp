-- Offer letter templates per organisation
CREATE TABLE IF NOT EXISTS offer_letter_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    name            TEXT NOT NULL,
    content         TEXT NOT NULL,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE offer_letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY offer_letter_templates_tenant_isolation ON offer_letter_templates
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid
           AND organisation_id = current_setting('app.current_org', true)::uuid);

-- Grant access to app_user role (matches existing RLS pattern)
GRANT SELECT, INSERT, UPDATE, DELETE ON offer_letter_templates TO app_user;

-- Ensure only one default template per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_offer_letter_templates_default
    ON offer_letter_templates (organisation_id)
    WHERE is_default = true;
