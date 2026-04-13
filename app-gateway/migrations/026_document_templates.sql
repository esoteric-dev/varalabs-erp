-- ============================================================================
-- Migration 026: Document Template System
-- Replaces offer_letter_templates with a general-purpose document template
-- system. Templates are stored as HTML and rendered via headless Chromium.
-- ============================================================================

-- ── Document type registry (platform-defined, seeded here) ─────────────────

CREATE TABLE IF NOT EXISTS document_types (
    code            TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    -- Variable names that can be used as {{VAR}} placeholders in templates
    available_vars  TEXT[] NOT NULL DEFAULT '{}',
    page_size       TEXT NOT NULL DEFAULT 'A4',
    orientation     TEXT NOT NULL DEFAULT 'portrait'
                        CHECK (orientation IN ('portrait', 'landscape')),
    sort_order      INTEGER NOT NULL DEFAULT 0
);

GRANT SELECT ON document_types TO app_user;

INSERT INTO document_types (code, name, description, available_vars, page_size, orientation, sort_order)
VALUES
(
    'offer_letter',
    'Offer Letter',
    'Staff employment offer letter',
    ARRAY['ORG_NAME','TODAY','STAFF_NAME','DESIGNATION','DEPARTMENT','EMP_ID',
          'DOJ','BASIC_PAY','ALLOWANCES','DEDUCTIONS','NET_PAY'],
    'A4', 'portrait', 1
),
(
    'joining_letter',
    'Joining Letter',
    'Staff joining confirmation letter',
    ARRAY['ORG_NAME','TODAY','STAFF_NAME','DESIGNATION','DEPARTMENT','EMP_ID',
          'DOJ','BASIC_PAY','ALLOWANCES','DEDUCTIONS','NET_PAY'],
    'A4', 'portrait', 2
),
(
    'bonafide_certificate',
    'Bonafide Certificate',
    'Student enrollment / bonafide certificate',
    ARRAY['ORG_NAME','TODAY','ACADEMIC_YEAR','STUDENT_NAME','CLASS',
          'ADMISSION_NO','DOB','GENDER'],
    'A4', 'portrait', 3
),
(
    'transfer_certificate',
    'Transfer Certificate',
    'Student transfer certificate',
    ARRAY['ORG_NAME','TODAY','STUDENT_NAME','CLASS','ADMISSION_NO',
          'DOB','GENDER','FATHER_NAME','LEAVING_DATE'],
    'A4', 'portrait', 4
),
(
    'id_card_staff',
    'Staff ID Card',
    'Staff identity card (printed on A6 / card stock)',
    ARRAY['ORG_NAME','STAFF_NAME','DESIGNATION','DEPARTMENT','EMP_ID','PHOTO_URL'],
    'A6', 'portrait', 5
),
(
    'id_card_student',
    'Student ID Card',
    'Student identity card (printed on A6 / card stock)',
    ARRAY['ORG_NAME','STUDENT_NAME','CLASS','ADMISSION_NO',
          'PARENT_NAME','PARENT_PHONE','PHOTO_URL'],
    'A6', 'portrait', 6
)
ON CONFLICT (code) DO NOTHING;

-- ── Per-org HTML templates ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS document_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenants(id),
    document_type   TEXT NOT NULL REFERENCES document_types(code),
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    -- Full HTML document with {{VARIABLE}} placeholders
    html_content    TEXT NOT NULL,
    is_default      BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one default per org + document type
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_templates_org_type_default
    ON document_templates(organisation_id, document_type)
    WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_document_templates_org
    ON document_templates(organisation_id, document_type);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_templates FORCE ROW LEVEL SECURITY;
CREATE POLICY document_templates_isolation ON document_templates USING (
    tenant_id  = current_setting('app.current_tenant', true)::uuid
    AND organisation_id = current_setting('app.current_org', true)::uuid
);

GRANT SELECT, INSERT, UPDATE, DELETE ON document_templates TO app_user;
