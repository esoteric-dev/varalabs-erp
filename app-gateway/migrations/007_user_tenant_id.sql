-- ============================================================================
-- Migration 007: Add tenant_id to users for direct tenant lookup during login
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- Backfill tenant_id for existing users from their org memberships
UPDATE users u
SET tenant_id = (
    SELECT o.tenant_id
    FROM user_organisations uo
    JOIN organisations o ON o.id = uo.organisation_id
    WHERE uo.user_id = u.id
    LIMIT 1
)
WHERE u.tenant_id IS NULL;
