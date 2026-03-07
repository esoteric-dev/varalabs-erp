use async_graphql::ErrorExtensions;
use axum::{
    extract::{Request, State},
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Json, Response},
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use std::collections::HashSet;
use std::env;

// ── System-level role (not org-scoped) ──────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SystemRole {
    Superadmin,
    TenantAdmin,
    User,
}

impl SystemRole {
    pub fn from_str(s: &str) -> Self {
        match s {
            "superadmin" => SystemRole::Superadmin,
            "tenant_admin" => SystemRole::TenantAdmin,
            _ => SystemRole::User,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            SystemRole::Superadmin => "superadmin",
            SystemRole::TenantAdmin => "tenant_admin",
            SystemRole::User => "user",
        }
    }
}

// ── User context carried through request ────────────────────────────────────

/// Decoded user identity + effective permissions, carried through request
/// extensions and into GraphQL context.
#[derive(Debug, Clone)]
pub struct UserContext {
    pub tenant_id: String,
    pub org_id: String,
    pub user_id: String,
    pub system_role: SystemRole,
    /// Effective permissions — union of all dynamic role permissions in the
    /// user's current organisation. Empty for superadmin (they bypass checks).
    pub permissions: HashSet<String>,
    /// Dynamic role slugs the user holds in the current organisation.
    pub role_slugs: Vec<String>,
}

/// JWT claims structure.
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub tenant_id: String,
    pub org_id: String,
    /// Accepts both `system_role` (new tokens) and `role` (old tokens).
    #[serde(alias = "role")]
    pub system_role: String,
    pub exp: usize,
}

/// JWT claims structure for Refresh Tokens.
#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshClaims {
    pub sub: String,
    pub token_type: String, // typically "refresh"
    pub exp: usize,
}

// ── Middleware ───────────────────────────────────────────────────────────────

/// Axum middleware that **optionally** extracts a JWT from the `Authorization`
/// header and loads the user's effective permissions from the database.
///
/// - Valid token → `UserContext` (with permissions) inserted into extensions.
/// - No token → continues without inserting (allows unauthenticated ops like login).
/// - Invalid token → returns 401 immediately.
pub async fn auth_middleware(
    State(pool): State<PgPool>,
    mut req: Request,
    next: Next,
) -> Response {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_owned());

    match auth_header {
        Some(header_val) => {
            let token = match header_val.strip_prefix("Bearer ") {
                Some(t) => t,
                None => {
                    return (
                        StatusCode::UNAUTHORIZED,
                        Json(serde_json::json!({ "error": "Malformed Authorization header" })),
                    )
                        .into_response();
                }
            };

            let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret".into());
            let decoding_key = DecodingKey::from_secret(secret.as_bytes());

            match decode::<Claims>(token, &decoding_key, &Validation::default()) {
                Ok(token_data) => {
                    let claims = token_data.claims;
                    let system_role = SystemRole::from_str(&claims.system_role);

                    tracing::info!(
                        tenant_id = %claims.tenant_id,
                        org_id = %claims.org_id,
                        user_id = %claims.sub,
                        system_role = %claims.system_role,
                        "Authenticated request"
                    );

                    // Load permissions from DB.
                    // Skip for superadmin (bypass everything) and users with no org yet.
                    let (permissions, role_slugs) =
                        if system_role == SystemRole::Superadmin || claims.org_id.is_empty() {
                            (HashSet::new(), vec![])
                        } else {
                            load_user_permissions(&pool, &claims.sub, &claims.org_id)
                                .await
                                .unwrap_or_else(|e| {
                                    tracing::error!("Failed to load permissions: {e}");
                                    (HashSet::new(), vec![])
                                })
                        };

                    req.extensions_mut().insert(UserContext {
                        tenant_id: claims.tenant_id,
                        org_id: claims.org_id,
                        user_id: claims.sub,
                        system_role,
                        permissions,
                        role_slugs,
                    });
                }
                Err(e) => {
                    tracing::warn!("JWT validation failed: {e}");
                    return (
                        StatusCode::UNAUTHORIZED,
                        Json(serde_json::json!({ "error": "Invalid or expired token" })),
                    )
                        .into_response();
                }
            }
        }
        // No Authorization header — allow through for unauthenticated operations
        None => {}
    }

    next.run(req).await
}

// ── Permission loading ──────────────────────────────────────────────────────

/// Load the user's effective permissions and role slugs for an organisation.
async fn load_user_permissions(
    pool: &PgPool,
    user_id: &str,
    org_id: &str,
) -> Result<(HashSet<String>, Vec<String>), sqlx::Error> {
    let user_uuid = uuid::Uuid::parse_str(user_id)
        .map_err(|e| sqlx::Error::Protocol(format!("Invalid user_id: {e}")))?;
    let org_uuid = uuid::Uuid::parse_str(org_id)
        .map_err(|e| sqlx::Error::Protocol(format!("Invalid org_id: {e}")))?;

    // Load distinct permission codes (union across all roles in this org)
    let perm_rows: Vec<(String,)> = sqlx::query_as(
        "SELECT DISTINCT p.code
         FROM user_org_roles uor
         JOIN role_permissions rp ON rp.role_id = uor.role_id
         JOIN permissions p ON p.id = rp.permission_id
         WHERE uor.user_id = $1 AND uor.organisation_id = $2",
    )
    .bind(user_uuid)
    .bind(org_uuid)
    .fetch_all(pool)
    .await?;

    let permissions: HashSet<String> = perm_rows.into_iter().map(|(code,)| code).collect();

    // Load role slugs
    let role_rows: Vec<(String,)> = sqlx::query_as(
        "SELECT r.slug
         FROM user_org_roles uor
         JOIN roles r ON r.id = uor.role_id
         WHERE uor.user_id = $1 AND uor.organisation_id = $2",
    )
    .bind(user_uuid)
    .bind(org_uuid)
    .fetch_all(pool)
    .await?;

    let role_slugs: Vec<String> = role_rows.into_iter().map(|(slug,)| slug).collect();

    Ok((permissions, role_slugs))
}

// ── Auth helpers for resolvers ──────────────────────────────────────────────

/// Extract authenticated user from the `async_graphql::Context`, returning a
/// clear GraphQL error if absent.
pub fn require_auth(ctx: &async_graphql::Context<'_>) -> async_graphql::Result<UserContext> {
    ctx.data_opt::<UserContext>().cloned().ok_or_else(|| {
        async_graphql::Error::new("Authentication required").extend_with(
            |_, ext: &mut async_graphql::ErrorExtensionValues| {
                ext.set("code", "UNAUTHENTICATED");
            },
        )
    })
}

/// Require the user to have a specific permission in their current org.
/// Superadmin bypasses the check entirely.
pub fn require_permission(
    ctx: &async_graphql::Context<'_>,
    permission: &str,
) -> async_graphql::Result<UserContext> {
    let user_ctx = require_auth(ctx)?;

    if user_ctx.system_role == SystemRole::Superadmin {
        return Ok(user_ctx);
    }

    if user_ctx.permissions.contains(permission) {
        return Ok(user_ctx);
    }

    Err(
        async_graphql::Error::new(format!("Access denied: missing permission '{permission}'"))
            .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                ext.set("code", "FORBIDDEN");
            }),
    )
}

/// Require permission for an operation on a potentially different org.
/// Superadmin bypasses everything. TenantAdmin bypasses for orgs in their tenant.
pub fn require_permission_for_org(
    ctx: &async_graphql::Context<'_>,
    permission: &str,
    target_org_id: &str,
) -> async_graphql::Result<UserContext> {
    let user_ctx = require_auth(ctx)?;

    if user_ctx.system_role == SystemRole::Superadmin {
        return Ok(user_ctx);
    }

    if user_ctx.system_role == SystemRole::TenantAdmin {
        return Ok(user_ctx);
    }

    // Same-org: check normal permissions
    if user_ctx.org_id == target_org_id && user_ctx.permissions.contains(permission) {
        return Ok(user_ctx);
    }

    Err(
        async_graphql::Error::new(format!("Access denied: missing permission '{permission}'"))
            .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                ext.set("code", "FORBIDDEN");
            }),
    )
}

/// Check if the user has a permission (returns bool, no error).
pub fn has_permission(user_ctx: &UserContext, permission: &str) -> bool {
    user_ctx.system_role == SystemRole::Superadmin || user_ctx.permissions.contains(permission)
}
