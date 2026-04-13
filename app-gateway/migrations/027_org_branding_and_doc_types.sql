-- ============================================================================
-- Migration 027: Organisation Branding + New Document Types
-- Adds logo_url, address, phone to organisations.
-- Adds payslip and fee_slip document types.
-- ============================================================================

-- ── Organisation branding fields ───────────────────────────────────────────

ALTER TABLE organisations
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS address  TEXT,
    ADD COLUMN IF NOT EXISTS phone    TEXT,
    ADD COLUMN IF NOT EXISTS website  TEXT;

-- ── Update existing document types to expose branding vars ─────────────────

UPDATE document_types SET available_vars =
    ARRAY['ORG_NAME','ORG_LOGO','ORG_ADDRESS','ORG_PHONE',
          'TODAY','STAFF_NAME','DESIGNATION','DEPARTMENT','EMP_ID',
          'DOJ','BASIC_PAY','ALLOWANCES','DEDUCTIONS','NET_PAY']
WHERE code IN ('offer_letter','joining_letter');

UPDATE document_types SET available_vars =
    ARRAY['ORG_NAME','ORG_LOGO','ORG_ADDRESS','ORG_PHONE',
          'TODAY','ACADEMIC_YEAR','STUDENT_NAME','CLASS',
          'ADMISSION_NO','DOB','GENDER']
WHERE code = 'bonafide_certificate';

UPDATE document_types SET available_vars =
    ARRAY['ORG_NAME','ORG_LOGO','ORG_ADDRESS','ORG_PHONE',
          'TODAY','STUDENT_NAME','CLASS','ADMISSION_NO',
          'DOB','GENDER','FATHER_NAME','LEAVING_DATE']
WHERE code = 'transfer_certificate';

UPDATE document_types SET available_vars =
    ARRAY['ORG_NAME','ORG_LOGO','ORG_ADDRESS','ORG_PHONE',
          'STAFF_NAME','DESIGNATION','DEPARTMENT','EMP_ID','PHOTO_URL']
WHERE code = 'id_card_staff';

UPDATE document_types SET available_vars =
    ARRAY['ORG_NAME','ORG_LOGO','ORG_ADDRESS','ORG_PHONE',
          'STUDENT_NAME','CLASS','ADMISSION_NO',
          'PARENT_NAME','PARENT_PHONE','PHOTO_URL']
WHERE code = 'id_card_student';

-- ── New document types ─────────────────────────────────────────────────────

INSERT INTO document_types (code, name, description, available_vars, page_size, orientation, sort_order)
VALUES
(
    'payslip',
    'Payslip',
    'Monthly salary slip for staff',
    ARRAY['ORG_NAME','ORG_LOGO','ORG_ADDRESS','ORG_PHONE',
          'TODAY','STAFF_NAME','DESIGNATION','DEPARTMENT','EMP_ID',
          'MONTH_YEAR','BASIC_PAY','ALLOWANCES','DEDUCTIONS','NET_PAY'],
    'A4', 'portrait', 7
),
(
    'fee_slip',
    'Fee Receipt',
    'Student fee payment receipt',
    ARRAY['ORG_NAME','ORG_LOGO','ORG_ADDRESS','ORG_PHONE',
          'TODAY','STUDENT_NAME','CLASS','ADMISSION_NO',
          'FEE_NAME','AMOUNT_DUE','AMOUNT_PAID','BALANCE',
          'STATUS','DUE_DATE','PAID_DATE','PAYMENT_MODE','RECEIPT_NO'],
    'A4', 'portrait', 8
)
ON CONFLICT (code) DO NOTHING;
