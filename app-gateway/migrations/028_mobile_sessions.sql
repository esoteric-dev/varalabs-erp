-- ============================================================================
-- Migration 028: Mobile Sessions
-- Tracks per-device login sessions for the Android app.
-- device_id_hash     — SHA-256(ANDROID_ID) sent by client, stored as-is
--                      (already a one-way hash; never store raw ANDROID_ID)
-- refresh_token_hash — SHA-256 of the issued refresh JWT, for revocation checks
-- ============================================================================

CREATE TABLE IF NOT EXISTS mobile_sessions (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organisation_id     UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    device_id_hash      TEXT        NOT NULL,
    push_token          TEXT,
    refresh_token_hash  TEXT        NOT NULL,
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at          TIMESTAMPTZ,
    UNIQUE (user_id, device_id_hash)
);

CREATE INDEX IF NOT EXISTS idx_mobile_sessions_user    ON mobile_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_mobile_sessions_refresh ON mobile_sessions(refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_mobile_sessions_device  ON mobile_sessions(device_id_hash);
