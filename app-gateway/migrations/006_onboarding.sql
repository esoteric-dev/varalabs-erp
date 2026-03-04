-- ============================================================================
-- Migration 006: Onboarding — org slugs, custom domains, password backfill
-- ============================================================================

-- ── 1. Add slug to organisations (used as subdomain) ──────────────────────────
ALTER TABLE organisations ADD COLUMN IF NOT EXISTS slug TEXT;

-- Backfill existing orgs
UPDATE organisations SET slug = 'greenwood-main'  WHERE id = '20000000-0000-0000-0000-000000000001' AND slug IS NULL;
UPDATE organisations SET slug = 'greenwood-north' WHERE id = '20000000-0000-0000-0000-000000000002' AND slug IS NULL;
UPDATE organisations SET slug = 'synapse-hq'      WHERE id = '20000000-0000-0000-0000-000000000003' AND slug IS NULL;

-- For any other orgs that might exist
UPDATE organisations SET slug = LOWER(REPLACE(name, ' ', '-')) WHERE slug IS NULL;

ALTER TABLE organisations ALTER COLUMN slug SET NOT NULL;

-- Slug must be globally unique (subdomains are global)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'organisations_slug_unique') THEN
        ALTER TABLE organisations ADD CONSTRAINT organisations_slug_unique UNIQUE (slug);
    END IF;
END $$;

-- ── 2. Custom domains table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_custom_domains (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    domain            TEXT NOT NULL UNIQUE,
    verified          BOOLEAN NOT NULL DEFAULT false,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON org_custom_domains TO app_user;

-- ── 3. Backfill seed user passwords (bcrypt hash of "password") ──────────────
UPDATE users
SET password_hash = '$2b$12$btFtXwDwhFErHnLCoP9Wte2k15s/A9/n36xuF1OmMu5KKyPSY1gS.'
WHERE password_hash = '';
