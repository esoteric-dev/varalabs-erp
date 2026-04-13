//! Mobile REST API handlers — used exclusively by the Android app.
//!
//! All four endpoints are unauthenticated at the HTTP level (no Bearer token
//! required for request acceptance). Auth is enforced inside each handler.
//!
//! Flow:
//!   POST /api/mobile/auth            — email + password → tokens (or org list)
//!   POST /api/mobile/auth/select-org — pick campus when user belongs to N > 1 orgs
//!   POST /api/mobile/refresh         — exchange refresh token for new access token
//!   DELETE /api/mobile/logout        — revoke this device's session

use axum::{
    extract::Extension,
    http::StatusCode,
    response::Json,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use std::env;

use crate::auth::{Claims, UserContext};

// ── Internal DB row types ────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct UserRow {
    id: String,
    name: String,
    email: String,
    system_role: String,
    phone: Option<String>,
    photo_url: Option<String>,
    password_hash: String,
}

#[derive(sqlx::FromRow)]
struct UserOrgRow {
    org_id: String,
    org_name: String,
    org_logo_url: Option<String>,
    tenant_id: String,
}

#[derive(sqlx::FromRow)]
struct OrgBasicRow {
    name: String,
    logo_url: Option<String>,
    tenant_id: String,
}

// ── JWT claims ────────────────────────────────────────────────────────────────

/// Claims embedded in the mobile refresh token.
/// Carries org context so the refresh handler can mint a scoped access token
/// without re-querying the database for org membership.
#[derive(Serialize, Deserialize)]
struct MobileRefreshClaims {
    /// User UUID (matches `users.id`).
    sub: String,
    tenant_id: String,
    org_id: String,
    /// Always "mobile_refresh" — guards against reuse of other token types.
    token_type: String,
    exp: usize,
}

/// Short-lived claims issued when a user belongs to more than one org.
/// The client presents this token alongside their chosen org_id to
/// `POST /api/mobile/auth/select-org`.
#[derive(Serialize, Deserialize)]
struct OrgSelectionClaims {
    /// User UUID.
    sub: String,
    /// Allowed org UUIDs — client must choose exactly one.
    org_ids: Vec<String>,
    /// Always "mobile_org_selection".
    token_type: String,
    exp: usize,
}

// ── Request types ─────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct MobileAuthRequest {
    email: String,
    password: String,
    /// SHA-256(`Settings.Secure.ANDROID_ID`), computed once on first launch.
    /// Never send the raw ANDROID_ID.
    device_id: String,
    /// FCM registration token. Optional — push notifications require it.
    push_token: Option<String>,
}

#[derive(Deserialize)]
pub struct MobileSelectOrgRequest {
    /// Opaque token returned by `/api/mobile/auth` when multiple orgs were found.
    session_token: String,
    /// UUID of the org the user selected from the list.
    org_id: String,
    /// Same device_id sent during the initial auth call.
    device_id: String,
}

#[derive(Deserialize)]
pub struct MobileRefreshRequest {
    refresh_token: String,
    device_id: String,
}

#[derive(Deserialize)]
pub struct MobileLogoutRequest {
    device_id: String,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/// Hash an arbitrary string with SHA-256 and return it as a lowercase hex string.
fn sha256_hex(s: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(s.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn jwt_secret() -> String {
    env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret".into())
}

/// Shorthand for building a consistent JSON error body.
fn err_json(code: &str, message: &str) -> Json<serde_json::Value> {
    Json(serde_json::json!({ "error": code, "message": message }))
}

type HandlerError = (StatusCode, Json<serde_json::Value>);

// ── Shared auth finaliser ─────────────────────────────────────────────────────

/// Called by both `mobile_auth_handler` (single-org path) and
/// `mobile_select_org_handler` after credentials have already been verified.
///
/// Responsibilities:
/// 1. Mint a 15-minute access token and a 7-day refresh token.
/// 2. Load org metadata, active modules, user role name, and permissions.
/// 3. Upsert the `mobile_sessions` row for this device.
/// 4. Return the full 200 OK JSON body.
async fn finalize_auth(
    pool: &PgPool,
    user: &UserRow,
    org_id: &str,
    device_id_hash: &str,
    push_token: Option<&str>,
) -> Result<(StatusCode, Json<serde_json::Value>), HandlerError> {
    let secret = jwt_secret();

    let user_uuid = uuid::Uuid::parse_str(&user.id).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            err_json("INTERNAL_ERROR", "Invalid user id"),
        )
    })?;
    let org_uuid = uuid::Uuid::parse_str(org_id).map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            err_json("INTERNAL_ERROR", "Invalid org id"),
        )
    })?;

    // ── Load org info (name, logo_url, tenant_id) ─────────────────────────
    let org = sqlx::query_as::<_, OrgBasicRow>(
        "SELECT name, logo_url, tenant_id::text AS tenant_id
         FROM organisations WHERE id = $1",
    )
    .bind(org_uuid)
    .fetch_optional(pool)
    .await
    .map_err(|e| {
        tracing::error!("DB error loading org info: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            err_json("INTERNAL_ERROR", "Database error"),
        )
    })?
    .ok_or_else(|| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            err_json("INTERNAL_ERROR", "Organisation not found"),
        )
    })?;

    let tenant_id = &org.tenant_id;

    // ── Mint access token (15 min) ────────────────────────────────────────
    let access_exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::minutes(15))
        .map(|t| t.timestamp() as usize)
        .unwrap_or(0);

    let access_claims = Claims {
        sub: user.id.clone(),
        tenant_id: tenant_id.clone(),
        org_id: org_id.to_string(),
        system_role: user.system_role.clone(),
        exp: access_exp,
    };

    let access_token = encode(
        &Header::default(),
        &access_claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| {
        tracing::error!("Failed to mint access token: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            err_json("INTERNAL_ERROR", "Failed to create session"),
        )
    })?;

    // ── Mint refresh token (7 days) ───────────────────────────────────────
    let refresh_exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .map(|t| t.timestamp() as usize)
        .unwrap_or(0);

    let refresh_claims = MobileRefreshClaims {
        sub: user.id.clone(),
        tenant_id: tenant_id.clone(),
        org_id: org_id.to_string(),
        token_type: "mobile_refresh".to_string(),
        exp: refresh_exp,
    };

    let refresh_token = encode(
        &Header::default(),
        &refresh_claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|e| {
        tracing::error!("Failed to mint refresh token: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            err_json("INTERNAL_ERROR", "Failed to create session"),
        )
    })?;

    let refresh_token_hash = sha256_hex(&refresh_token);

    // ── Load active modules for this org ──────────────────────────────────
    let active_modules: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT module_code
         FROM org_plugin_activations
         WHERE organisation_id = $1 AND is_active = true
         ORDER BY module_code",
    )
    .bind(org_uuid)
    .fetch_all(pool)
    .await
    .unwrap_or_default(); // non-fatal — client degrades gracefully

    // ── Load user's role name in this org ─────────────────────────────────
    let org_role: String = sqlx::query_scalar::<_, String>(
        "SELECT r.name
         FROM user_org_roles uor
         JOIN roles r ON r.id = uor.role_id
         WHERE uor.user_id = $1 AND uor.organisation_id = $2
         LIMIT 1",
    )
    .bind(user_uuid)
    .bind(org_uuid)
    .fetch_optional(pool)
    .await
    .unwrap_or(None)
    .unwrap_or_else(|| "User".to_string());

    // ── Load user's permissions in this org ───────────────────────────────
    let permissions: Vec<String> = sqlx::query_scalar::<_, String>(
        "SELECT DISTINCT p.code
         FROM user_org_roles uor
         JOIN role_permissions rp ON rp.role_id = uor.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE uor.user_id = $1 AND uor.organisation_id = $2
         ORDER BY p.code",
    )
    .bind(user_uuid)
    .bind(org_uuid)
    .fetch_all(pool)
    .await
    .unwrap_or_default();

    // ── Upsert mobile session ─────────────────────────────────────────────
    // Non-fatal: a session failure must not block login.
    let session_result = sqlx::query(
        "INSERT INTO mobile_sessions
             (user_id, organisation_id, device_id_hash, push_token, refresh_token_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (user_id, device_id_hash) DO UPDATE
             SET organisation_id    = EXCLUDED.organisation_id,
                 push_token         = EXCLUDED.push_token,
                 refresh_token_hash = EXCLUDED.refresh_token_hash,
                 last_seen_at       = NOW(),
                 revoked_at         = NULL",
    )
    .bind(user_uuid)
    .bind(org_uuid)
    .bind(device_id_hash)
    .bind(push_token)
    .bind(&refresh_token_hash)
    .execute(pool)
    .await;

    if let Err(e) = session_result {
        tracing::warn!(
            user_id = %user.id,
            org_id  = %org_id,
            "Failed to upsert mobile session (non-fatal): {e}"
        );
    }

    tracing::info!(
        user_id  = %user.id,
        org_id   = %org_id,
        org_name = %org.name,
        "Mobile login successful"
    );

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "OK",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_in": 900,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "photo_url": user.photo_url,
                "org_role": org_role,
                "permissions": permissions,
            },
            "org": {
                "id": org_id,
                "name": org.name,
                "logo_url": org.logo_url,
                "active_modules": active_modules,
            }
        })),
    ))
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// `POST /api/mobile/auth`
///
/// Primary login endpoint. Accepts email + password and resolves the user's
/// org automatically. No school code or subdomain is required.
///
/// Returns one of:
/// - `{ "status": "OK", ... }` — tokens issued immediately (single org)
/// - `{ "status": "ORG_SELECTION_REQUIRED", "session_token": "...", "orgs": [...] }`
///   when the user belongs to more than one organisation. The client should
///   show a campus-picker and call `POST /api/mobile/auth/select-org`.
pub async fn mobile_auth_handler(
    Extension(pool): Extension<PgPool>,
    Json(body): Json<MobileAuthRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    // ── Input validation ──────────────────────────────────────────────────
    if body.email.trim().is_empty() || body.password.is_empty() || body.device_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            err_json("VALIDATION_ERROR", "email, password, and device_id are required"),
        );
    }

    // ── Look up user by email (globally unique) ───────────────────────────
    let user = match sqlx::query_as::<_, UserRow>(
        "SELECT id::text, name, email, system_role, phone, photo_url, password_hash
         FROM users WHERE email = $1",
    )
    .bind(body.email.trim())
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(u)) => u,
        Ok(None) => {
            return (
                StatusCode::UNAUTHORIZED,
                err_json("INVALID_CREDENTIALS", "Email or password is incorrect"),
            )
        }
        Err(e) => {
            tracing::error!("DB error looking up user by email: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                err_json("INTERNAL_ERROR", "Database error"),
            );
        }
    };

    // ── Verify password ───────────────────────────────────────────────────
    if !bcrypt::verify(&body.password, &user.password_hash).unwrap_or(false) {
        return (
            StatusCode::UNAUTHORIZED,
            err_json("INVALID_CREDENTIALS", "Email or password is incorrect"),
        );
    }

    let device_id_hash = sha256_hex(&body.device_id);

    // ── Resolve org memberships ───────────────────────────────────────────
    let user_uuid = match uuid::Uuid::parse_str(&user.id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                err_json("INTERNAL_ERROR", "Invalid user id"),
            )
        }
    };

    let orgs = match sqlx::query_as::<_, UserOrgRow>(
        "SELECT uo.organisation_id::text AS org_id,
                o.name                  AS org_name,
                o.logo_url              AS org_logo_url,
                o.tenant_id::text       AS tenant_id
         FROM user_organisations uo
         JOIN organisations o ON o.id = uo.organisation_id
         WHERE uo.user_id = $1
         ORDER BY o.name",
    )
    .bind(user_uuid)
    .fetch_all(&pool)
    .await
    {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("DB error fetching user org memberships: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                err_json("INTERNAL_ERROR", "Database error"),
            );
        }
    };

    if orgs.is_empty() {
        return (
            StatusCode::FORBIDDEN,
            err_json(
                "USER_HAS_NO_ORG",
                "This account is not assigned to any organisation. Contact your administrator.",
            ),
        );
    }

    // ── Single org — issue tokens immediately (common path) ───────────────
    if orgs.len() == 1 {
        return match finalize_auth(
            &pool,
            &user,
            &orgs[0].org_id,
            &device_id_hash,
            body.push_token.as_deref(),
        )
        .await
        {
            Ok(resp) => resp,
            Err(err) => err,
        };
    }

    // ── Multiple orgs — return campus list with a short-lived session token ─
    let secret = jwt_secret();
    let exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::minutes(5))
        .map(|t| t.timestamp() as usize)
        .unwrap_or(0);

    let org_ids: Vec<String> = orgs.iter().map(|o| o.org_id.clone()).collect();

    let selection_claims = OrgSelectionClaims {
        sub: user.id.clone(),
        org_ids,
        token_type: "mobile_org_selection".to_string(),
        exp,
    };

    let session_token = match encode(
        &Header::default(),
        &selection_claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to mint org selection token: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                err_json("INTERNAL_ERROR", "Failed to create selection session"),
            );
        }
    };

    let org_list: Vec<serde_json::Value> = orgs
        .iter()
        .map(|o| {
            serde_json::json!({
                "id":       o.org_id,
                "name":     o.org_name,
                "logo_url": o.org_logo_url,
            })
        })
        .collect();

    tracing::info!(
        user_id   = %user.id,
        org_count = %orgs.len(),
        "Mobile auth: org selection required"
    );

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "status":        "ORG_SELECTION_REQUIRED",
            "session_token": session_token,
            "orgs":          org_list,
        })),
    )
}

/// `POST /api/mobile/auth/select-org`
///
/// Completes the login flow for users who belong to more than one organisation.
/// The client must present the `session_token` received from `/api/mobile/auth`
/// together with the `org_id` the user selected.
pub async fn mobile_select_org_handler(
    Extension(pool): Extension<PgPool>,
    Json(body): Json<MobileSelectOrgRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    if body.session_token.is_empty() || body.org_id.is_empty() || body.device_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            err_json(
                "VALIDATION_ERROR",
                "session_token, org_id, and device_id are required",
            ),
        );
    }

    // ── Validate and decode session token ─────────────────────────────────
    let secret = jwt_secret();
    let claims = match decode::<OrgSelectionClaims>(
        &body.session_token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(t) => t.claims,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                err_json("SESSION_EXPIRED", "Session expired — please sign in again"),
            )
        }
    };

    if claims.token_type != "mobile_org_selection" {
        return (
            StatusCode::UNAUTHORIZED,
            err_json("SESSION_EXPIRED", "Invalid session token type"),
        );
    }

    // ── Verify the chosen org is in the allowed list ──────────────────────
    if !claims.org_ids.contains(&body.org_id) {
        return (
            StatusCode::FORBIDDEN,
            err_json("ORG_NOT_IN_SESSION", "Org ID does not match this session"),
        );
    }

    // ── Load user (credentials already verified — trust the session token) ─
    let user_uuid = match uuid::Uuid::parse_str(&claims.sub) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                err_json("SESSION_EXPIRED", "Invalid session"),
            )
        }
    };

    let user = match sqlx::query_as::<_, UserRow>(
        "SELECT id::text, name, email, system_role, phone, photo_url, password_hash
         FROM users WHERE id = $1",
    )
    .bind(user_uuid)
    .fetch_optional(&pool)
    .await
    {
        Ok(Some(u)) => u,
        Ok(None) => {
            return (
                StatusCode::UNAUTHORIZED,
                err_json("SESSION_EXPIRED", "User no longer exists"),
            )
        }
        Err(e) => {
            tracing::error!("DB error fetching user during select-org: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                err_json("INTERNAL_ERROR", "Database error"),
            );
        }
    };

    let device_id_hash = sha256_hex(&body.device_id);

    match finalize_auth(&pool, &user, &body.org_id, &device_id_hash, None).await {
        Ok(resp) => resp,
        Err(err) => err,
    }
}

/// `POST /api/mobile/refresh`
///
/// Silently renews the access token. Called automatically by the Android
/// `OkHttpClient.Authenticator` — the user never sees this request.
///
/// The provided `refresh_token` is validated against:
/// 1. JWT signature and expiry.
/// 2. The `mobile_sessions` row for this device (revocation check).
///
/// On success, returns a new 15-minute access token. The refresh token itself
/// is not rotated — the same 7-day token can be used repeatedly until it
/// expires or the user logs out.
pub async fn mobile_refresh_handler(
    Extension(pool): Extension<PgPool>,
    Json(body): Json<MobileRefreshRequest>,
) -> (StatusCode, Json<serde_json::Value>) {
    if body.refresh_token.is_empty() || body.device_id.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            err_json(
                "VALIDATION_ERROR",
                "refresh_token and device_id are required",
            ),
        );
    }

    let secret = jwt_secret();

    // ── Validate refresh JWT ──────────────────────────────────────────────
    let claims = match decode::<MobileRefreshClaims>(
        &body.refresh_token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(t) => t.claims,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                err_json("TOKEN_INVALID", "Token is invalid or expired"),
            )
        }
    };

    if claims.token_type != "mobile_refresh" {
        return (
            StatusCode::UNAUTHORIZED,
            err_json("TOKEN_INVALID", "Invalid token type"),
        );
    }

    let user_uuid = match uuid::Uuid::parse_str(&claims.sub) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                err_json("TOKEN_INVALID", "Invalid token"),
            )
        }
    };

    // ── Check session is still active in the DB ───────────────────────────
    let refresh_token_hash = sha256_hex(&body.refresh_token);
    let device_id_hash = sha256_hex(&body.device_id);

    let session_exists: bool = sqlx::query_scalar::<_, i64>(
        "SELECT 1 FROM mobile_sessions
         WHERE user_id = $1
           AND device_id_hash = $2
           AND refresh_token_hash = $3
           AND revoked_at IS NULL",
    )
    .bind(user_uuid)
    .bind(&device_id_hash)
    .bind(&refresh_token_hash)
    .fetch_optional(&pool)
    .await
    .map(|r| r.is_some())
    .unwrap_or(false);

    if !session_exists {
        return (
            StatusCode::UNAUTHORIZED,
            err_json("TOKEN_INVALID", "Session not found or has been revoked"),
        );
    }

    // ── Mint new access token (15 min) ────────────────────────────────────
    // Re-read system_role from DB so role changes take effect on next refresh.
    let system_role: String = sqlx::query_scalar::<_, String>(
        "SELECT system_role FROM users WHERE id = $1",
    )
    .bind(user_uuid)
    .fetch_optional(&pool)
    .await
    .ok()
    .flatten()
    .unwrap_or_else(|| "user".to_string());

    let exp = chrono::Utc::now()
        .checked_add_signed(chrono::Duration::minutes(15))
        .map(|t| t.timestamp() as usize)
        .unwrap_or(0);

    let access_claims = Claims {
        sub: claims.sub.clone(),
        tenant_id: claims.tenant_id.clone(),
        org_id: claims.org_id.clone(),
        system_role,
        exp,
    };

    let access_token = match encode(
        &Header::default(),
        &access_claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    ) {
        Ok(t) => t,
        Err(e) => {
            tracing::error!("Failed to mint access token during refresh: {e}");
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                err_json("INTERNAL_ERROR", "Failed to create token"),
            );
        }
    };

    // ── Update last_seen_at (non-fatal) ───────────────────────────────────
    let _ = sqlx::query(
        "UPDATE mobile_sessions SET last_seen_at = NOW()
         WHERE user_id = $1 AND device_id_hash = $2",
    )
    .bind(user_uuid)
    .bind(&device_id_hash)
    .execute(&pool)
    .await;

    (
        StatusCode::OK,
        Json(serde_json::json!({
            "access_token": access_token,
            "expires_in":   900,
        })),
    )
}

/// `DELETE /api/mobile/logout`
///
/// Invalidates the refresh token for this device by setting `revoked_at`.
/// The client should clear all stored tokens after calling this endpoint.
///
/// Requires a valid Bearer token in the `Authorization` header (the auth
/// middleware extracts it and injects `UserContext` before this handler runs).
pub async fn mobile_logout_handler(
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    Json(body): Json<MobileLogoutRequest>,
) -> StatusCode {
    let Some(Extension(ctx)) = user_ctx else {
        return StatusCode::UNAUTHORIZED;
    };

    if body.device_id.is_empty() {
        return StatusCode::BAD_REQUEST;
    }

    let user_uuid = match uuid::Uuid::parse_str(&ctx.user_id) {
        Ok(u) => u,
        Err(_) => return StatusCode::UNAUTHORIZED,
    };

    let device_id_hash = sha256_hex(&body.device_id);

    let result = sqlx::query(
        "UPDATE mobile_sessions
         SET revoked_at = NOW()
         WHERE user_id = $1 AND device_id_hash = $2 AND revoked_at IS NULL",
    )
    .bind(user_uuid)
    .bind(&device_id_hash)
    .execute(&pool)
    .await;

    match result {
        Ok(r) => {
            tracing::info!(
                user_id      = %ctx.user_id,
                rows_revoked = %r.rows_affected(),
                "Mobile logout"
            );
            StatusCode::NO_CONTENT
        }
        Err(e) => {
            tracing::error!("DB error during mobile logout: {e}");
            // Still return 204 — logout should not fail from the client's perspective.
            StatusCode::NO_CONTENT
        }
    }
}
