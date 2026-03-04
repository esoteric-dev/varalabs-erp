use async_graphql::{
    Context, EmptySubscription, ErrorExtensions, InputObject, Object, Result, Schema, SimpleObject,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use rand::Rng;
use sqlx::PgPool;
use std::env;

use crate::auth::{require_auth, require_permission, require_permission_for_org, Claims, SystemRole};
use crate::db::execute_in_context;

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct Student {
    pub id: String,
    pub name: String,
    pub class_name: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct User {
    pub id: String,
    pub name: String,
    pub email: String,
    pub system_role: String,
    pub phone: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct Tenant {
    pub id: String,
    pub name: String,
    pub slug: String,
    pub created_at: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct Organisation {
    pub id: String,
    pub tenant_id: String,
    pub name: String,
    pub slug: String,
    pub created_at: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow, Clone)]
pub struct Permission {
    pub id: String,
    pub code: String,
    pub module: String,
    pub description: String,
}

/// Org-scoped role. Permissions are resolved via a field resolver.
#[derive(Debug, sqlx::FromRow, Clone)]
pub struct Role {
    pub id: String,
    pub organisation_id: String,
    pub name: String,
    pub slug: String,
    pub description: String,
    pub is_system: bool,
}

#[Object]
impl Role {
    async fn id(&self) -> &str {
        &self.id
    }
    async fn organisation_id(&self) -> &str {
        &self.organisation_id
    }
    async fn name(&self) -> &str {
        &self.name
    }
    async fn slug(&self) -> &str {
        &self.slug
    }
    async fn description(&self) -> &str {
        &self.description
    }
    async fn is_system(&self) -> bool {
        self.is_system
    }

    /// Resolve the permissions attached to this role.
    async fn permissions(&self, ctx: &Context<'_>) -> Result<Vec<Permission>> {
        let pool = ctx.data::<PgPool>()?;
        let role_uuid = uuid::Uuid::parse_str(&self.id)
            .map_err(|_| async_graphql::Error::new("Invalid role id"))?;

        let perms = sqlx::query_as::<_, Permission>(
            "SELECT p.id::text, p.code, p.module, p.description
             FROM role_permissions rp
             JOIN permissions p ON p.id = rp.permission_id
             WHERE rp.role_id = $1
             ORDER BY p.module, p.code",
        )
        .bind(role_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching role permissions: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(perms)
    }
}

#[derive(Debug, SimpleObject)]
pub struct LoginResponse {
    pub token: String,
    pub user: User,
}

// ── Module Types ────────────────────────────────────────────────────────────

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct AttendanceRecord {
    pub id: String,
    pub student_id: String,
    pub student_name: String,
    pub date: String,
    pub status: String,
    pub remarks: String,
    pub created_at: String,
}

#[derive(Debug, InputObject)]
pub struct AttendanceEntry {
    pub student_id: String,
    pub status: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct FeeStructure {
    pub id: String,
    pub name: String,
    pub amount: i64,
    pub frequency: String,
    pub class_name: Option<String>,
    pub academic_year: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct FeeRecord {
    pub id: String,
    pub student_id: String,
    pub student_name: String,
    pub fee_name: String,
    pub amount_due: i64,
    pub amount_paid: i64,
    pub status: String,
    pub due_date: String,
    pub paid_date: Option<String>,
    pub payment_mode: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct AdmissionApplication {
    pub id: String,
    pub student_name: String,
    pub guardian_name: String,
    pub guardian_phone: String,
    pub guardian_email: Option<String>,
    pub applied_class: String,
    pub status: String,
    pub academic_year: String,
    pub notes: String,
    pub submitted_at: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct Notice {
    pub id: String,
    pub title: String,
    pub body: String,
    pub audience: String,
    pub priority: String,
    pub published: bool,
    pub created_by_name: String,
    pub created_at: String,
    pub target_classes: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct StaffSalary {
    pub id: String,
    pub user_id: String,
    pub user_name: String,
    pub basic_pay: i64,
    pub allowances: i64,
    pub deductions: i64,
    pub effective_from: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct PayrollRun {
    pub id: String,
    pub month: i32,
    pub year: i32,
    pub status: String,
    pub total_gross: i64,
    pub total_net: i64,
    pub processed_at: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct PayrollEntry {
    pub id: String,
    pub user_name: String,
    pub basic_pay: i64,
    pub allowances: i64,
    pub deductions: i64,
    pub net_pay: i64,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct OrgUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub system_role: String,
    pub phone: Option<String>,
    pub role_names: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct ReportSummary {
    pub total_students: i64,
    pub total_staff: i64,
    pub attendance_today_present: i64,
    pub attendance_today_total: i64,
    pub fees_collected: i64,
    pub fees_pending: i64,
    pub pending_admissions: i64,
    pub active_notices: i64,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct TeacherClass {
    pub id: String,
    pub user_id: String,
    pub user_name: String,
    pub class_name: String,
    pub is_class_teacher: bool,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct Assignment {
    pub id: String,
    pub title: String,
    pub description: String,
    pub class_name: String,
    pub subject: Option<String>,
    pub assigned_by_name: String,
    pub due_date: Option<String>,
    pub created_at: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct LeaveRequest {
    pub id: String,
    pub user_id: String,
    pub user_name: String,
    pub leave_type: String,
    pub start_date: String,
    pub end_date: String,
    pub reason: String,
    pub status: String,
    pub reviewed_by_name: Option<String>,
    pub reviewed_at: Option<String>,
    pub created_at: String,
    pub class_name: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct MyPayslip {
    pub id: String,
    pub month: i32,
    pub year: i32,
    pub run_status: String,
    pub basic_pay: i64,
    pub allowances: i64,
    pub deductions: i64,
    pub net_pay: i64,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct StudentProgress {
    pub id: String,
    pub name: String,
    pub class_name: String,
    pub attendance_present: i64,
    pub attendance_total: i64,
    pub attendance_rate: f64,
    pub fees_paid: i64,
    pub fees_pending: i64,
}

/// Intermediate row for the org+tenant lookup during login.
#[derive(Debug, sqlx::FromRow)]
struct OrgTenantRow {
    org_id: String,
    tenant_id: String,
}

#[derive(Debug, SimpleObject)]
pub struct SignupResponse {
    pub token: String,
    pub user: User,
    pub tenant_id: String,
}

#[derive(Debug, SimpleObject)]
pub struct CreateOrgResponse {
    pub organisation: Organisation,
    pub admin_email: String,
    pub admin_password: String,
}

#[derive(Debug, SimpleObject)]
pub struct CreateUserResponse {
    pub user: User,
    pub generated_password: Option<String>,
}

#[derive(Debug, SimpleObject)]
pub struct ResetPasswordResponse {
    pub success: bool,
    pub generated_password: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct OrgInfo {
    pub org_id: String,
    pub org_name: String,
    pub org_slug: String,
    pub tenant_name: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct CustomDomain {
    pub id: String,
    pub organisation_id: String,
    pub domain: String,
    pub verified: bool,
    pub created_at: String,
}

/// Internal struct for fetching user with password hash during login.
#[derive(Debug, sqlx::FromRow)]
struct UserWithPassword {
    id: String,
    name: String,
    email: String,
    system_role: String,
    phone: Option<String>,
    password_hash: String,
}

// ── Query ────────────────────────────────────────────────────────────────────

fn generate_random_password() -> String {
    let mut rng = rand::thread_rng();
    let chars: Vec<char> = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        .chars()
        .collect();
    (0..12)
        .map(|_| chars[rng.gen_range(0..chars.len())])
        .collect()
}

fn extract_slug_from_email(email: &str) -> Option<String> {
    let domain = email.split('@').nth(1)?;
    let slug = domain.split('.').next()?;
    if slug.is_empty() {
        return None;
    }
    Some(slug.to_lowercase())
}

pub struct QueryRoot;

#[Object]
impl QueryRoot {
    /// Fetch the currently authenticated user's profile.
    async fn me(&self, ctx: &Context<'_>) -> Result<User> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        tracing::info!(
            tenant_id = %user_ctx.tenant_id,
            org_id = %user_ctx.org_id,
            user_id = %user_ctx.user_id,
            "GraphQL query: me"
        );

        let user_id = uuid::Uuid::parse_str(&user_ctx.user_id)
            .map_err(|_| async_graphql::Error::new("Invalid user id in token"))?;

        // If org_id is empty (tenant_admin on root domain), skip org membership check
        if user_ctx.org_id.is_empty() {
            let user = sqlx::query_as::<_, User>(
                "SELECT id::text, name, email, system_role, phone FROM users WHERE id = $1",
            )
            .bind(user_id)
            .fetch_one(pool)
            .await
            .map_err(|e| {
                tracing::error!("DB error fetching user: {e}");
                async_graphql::Error::new("Internal server error")
            })?;

            return Ok(user);
        }

        let org_id = uuid::Uuid::parse_str(&user_ctx.org_id)
            .map_err(|_| async_graphql::Error::new("Invalid org id in token"))?;

        // Verify membership.
        let is_member: bool = sqlx::query_scalar(
            "SELECT EXISTS(
                SELECT 1 FROM user_organisations uo
                JOIN organisations o ON o.id = uo.organisation_id
                WHERE uo.user_id = $1
                  AND uo.organisation_id = $2
                  AND o.tenant_id = $3::uuid
            )",
        )
        .bind(user_id)
        .bind(org_id)
        .bind(&user_ctx.tenant_id)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error checking org membership: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        if !is_member {
            return Err(async_graphql::Error::new(
                "User does not belong to this organisation",
            ));
        }

        let user = sqlx::query_as::<_, User>(
            "SELECT id::text, name, email, system_role, phone FROM users WHERE id = $1",
        )
        .bind(user_id)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching user: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(user)
    }

    /// List all students visible to the current organisation.
    /// RLS handles filtering via `app.current_tenant` + `app.current_org`.
    async fn students(&self, ctx: &Context<'_>) -> Result<Vec<Student>> {
        let user_ctx = require_permission(ctx, "students.view")?;
        let pool = ctx.data::<PgPool>()?;

        tracing::info!(
            tenant_id = %user_ctx.tenant_id,
            org_id = %user_ctx.org_id,
            "GraphQL query: students"
        );

        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let students = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, Student>(
                    "SELECT id::text, name, class_name FROM students",
                )
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(students)
    }

    /// Fetch a single student by ID.
    async fn student(&self, ctx: &Context<'_>, id: String) -> Result<Option<Student>> {
        let user_ctx = require_permission(ctx, "students.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let student = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, Student>(
                    "SELECT id::text, name, class_name FROM students WHERE id = $1::uuid",
                )
                .bind(&id)
                .fetch_optional(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(student)
    }

    /// Get the current user's own student record (linked via user_id).
    async fn my_student(&self, ctx: &Context<'_>) -> Result<Option<Student>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let uid = user_ctx.user_id.clone();

        let student = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, Student>(
                    "SELECT id::text, name, class_name FROM students WHERE user_id = $1::uuid",
                )
                .bind(&uid)
                .fetch_optional(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(student)
    }

    /// List all tenants. Superadmin only.
    async fn tenants(&self, ctx: &Context<'_>) -> Result<Vec<Tenant>> {
        let user_ctx = require_auth(ctx)?;

        if user_ctx.system_role != SystemRole::Superadmin {
            return Err(async_graphql::Error::new("Access denied: superadmin only").extend_with(
                |_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "FORBIDDEN");
                },
            ));
        }

        let pool = ctx.data::<PgPool>()?;
        tracing::info!("GraphQL query: tenants (superadmin)");

        let rows = sqlx::query_as::<_, Tenant>(
            "SELECT id::text, name, slug, created_at::text FROM tenants ORDER BY created_at",
        )
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching tenants: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(rows)
    }

    /// List organisations. Superadmin sees all; tenant_admin sees their tenant's.
    async fn organisations(
        &self,
        ctx: &Context<'_>,
        tenant_id: Option<String>,
    ) -> Result<Vec<Organisation>> {
        let user_ctx = require_auth(ctx)?;

        match user_ctx.system_role {
            SystemRole::Superadmin => { /* can see all */ }
            SystemRole::TenantAdmin => {
                if let Some(ref tid) = tenant_id {
                    if tid != &user_ctx.tenant_id {
                        return Err(async_graphql::Error::new("Access denied").extend_with(
                            |_, ext: &mut async_graphql::ErrorExtensionValues| {
                                ext.set("code", "FORBIDDEN");
                            },
                        ));
                    }
                }
            }
            SystemRole::User => {
                return Err(async_graphql::Error::new("Access denied").extend_with(
                    |_, ext: &mut async_graphql::ErrorExtensionValues| {
                        ext.set("code", "FORBIDDEN");
                    },
                ));
            }
        }

        let pool = ctx.data::<PgPool>()?;
        tracing::info!(?tenant_id, "GraphQL query: organisations");

        let effective_tenant = match user_ctx.system_role {
            SystemRole::TenantAdmin => Some(user_ctx.tenant_id.clone()),
            _ => tenant_id,
        };

        let rows = match effective_tenant {
            Some(tid) => {
                sqlx::query_as::<_, Organisation>(
                    "SELECT id::text, tenant_id::text, name, slug, created_at::text
                     FROM organisations
                     WHERE tenant_id = $1::uuid
                     ORDER BY created_at",
                )
                .bind(tid)
                .fetch_all(pool)
                .await
            }
            None => {
                sqlx::query_as::<_, Organisation>(
                    "SELECT id::text, tenant_id::text, name, slug, created_at::text
                     FROM organisations
                     ORDER BY created_at",
                )
                .fetch_all(pool)
                .await
            }
        }
        .map_err(|e| {
            tracing::error!("DB error fetching organisations: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(rows)
    }

    /// List all available permissions in the system.
    async fn permissions(&self, ctx: &Context<'_>) -> Result<Vec<Permission>> {
        let _user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        let perms = sqlx::query_as::<_, Permission>(
            "SELECT id::text, code, module, description
             FROM permissions ORDER BY module, code",
        )
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching permissions: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(perms)
    }

    /// List roles for an organisation. Requires `roles.view` permission.
    async fn roles(&self, ctx: &Context<'_>, organisation_id: String) -> Result<Vec<Role>> {
        let user_ctx = require_permission_for_org(ctx, "roles.view", &organisation_id)?;
        let pool = ctx.data::<PgPool>()?;

        verify_org_in_tenant(pool, &organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;

        let org_uuid = uuid::Uuid::parse_str(&organisation_id)
            .map_err(|_| async_graphql::Error::new("Invalid organisation id"))?;

        let roles = sqlx::query_as::<_, Role>(
            "SELECT id::text, organisation_id::text, name, slug, description, is_system
             FROM roles WHERE organisation_id = $1
             ORDER BY is_system DESC, name",
        )
        .bind(org_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching roles: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(roles)
    }

    /// Get the current user's effective permissions in the current org.
    async fn my_permissions(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
        let user_ctx = require_auth(ctx)?;

        if user_ctx.system_role == SystemRole::Superadmin {
            let pool = ctx.data::<PgPool>()?;
            let codes: Vec<(String,)> = sqlx::query_as(
                "SELECT code FROM permissions ORDER BY module, code",
            )
            .fetch_all(pool)
            .await
            .map_err(|e| {
                tracing::error!("DB error: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
            return Ok(codes.into_iter().map(|(c,)| c).collect());
        }

        Ok(user_ctx.permissions.into_iter().collect())
    }

    /// Get the current user's dynamic roles in the current org.
    async fn my_roles(&self, ctx: &Context<'_>) -> Result<Vec<Role>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        // If org_id is empty (tenant_admin on root domain), return empty roles
        if user_ctx.org_id.is_empty() {
            return Ok(Vec::new());
        }

        let user_uuid = uuid::Uuid::parse_str(&user_ctx.user_id)
            .map_err(|_| async_graphql::Error::new("Invalid user id"))?;
        let org_uuid = uuid::Uuid::parse_str(&user_ctx.org_id)
            .map_err(|_| async_graphql::Error::new("Invalid org id"))?;

        let roles = sqlx::query_as::<_, Role>(
            "SELECT r.id::text, r.organisation_id::text, r.name, r.slug,
                    r.description, r.is_system
             FROM user_org_roles uor
             JOIN roles r ON r.id = uor.role_id
             WHERE uor.user_id = $1 AND uor.organisation_id = $2
             ORDER BY r.name",
        )
        .bind(user_uuid)
        .bind(org_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(roles)
    }

    // ── Attendance ──────────────────────────────────────────────────────────

    async fn attendance_records(
        &self,
        ctx: &Context<'_>,
        date: Option<String>,
        student_id: Option<String>,
        class_name: Option<String>,
    ) -> Result<Vec<AttendanceRecord>> {
        let user_ctx = require_permission(ctx, "attendance.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let records = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = match (&date, &student_id, &class_name) {
                    (Some(d), Some(sid), _) => {
                        sqlx::query_as::<_, AttendanceRecord>(
                            "SELECT ar.id::text, ar.student_id::text, s.name AS student_name,
                                    ar.date::text, ar.status, ar.remarks, ar.created_at::text
                             FROM attendance_records ar
                             JOIN students s ON s.id = ar.student_id
                             WHERE ar.date = $1::date AND ar.student_id = $2::uuid
                             ORDER BY s.name",
                        )
                        .bind(d)
                        .bind(sid)
                        .fetch_all(conn)
                        .await?
                    }
                    (Some(d), None, Some(cn)) => {
                        sqlx::query_as::<_, AttendanceRecord>(
                            "SELECT COALESCE(ar.id::text, '') AS id, s.id::text AS student_id, s.name AS student_name,
                                    $1 AS date, COALESCE(ar.status, 'unmarked') AS status,
                                    COALESCE(ar.remarks, '') AS remarks, COALESCE(ar.created_at::text, '') AS created_at
                             FROM students s
                             LEFT JOIN attendance_records ar ON ar.student_id = s.id AND ar.date = $1::date
                             WHERE s.class_name = $2
                             ORDER BY s.name",
                        )
                        .bind(d)
                        .bind(cn)
                        .fetch_all(conn)
                        .await?
                    }
                    (Some(d), None, None) => {
                        sqlx::query_as::<_, AttendanceRecord>(
                            "SELECT COALESCE(ar.id::text, '') AS id, s.id::text AS student_id, s.name AS student_name,
                                    $1 AS date, COALESCE(ar.status, 'unmarked') AS status,
                                    COALESCE(ar.remarks, '') AS remarks, COALESCE(ar.created_at::text, '') AS created_at
                             FROM students s
                             LEFT JOIN attendance_records ar ON ar.student_id = s.id AND ar.date = $1::date
                             ORDER BY s.name",
                        )
                        .bind(d)
                        .fetch_all(conn)
                        .await?
                    }
                    (None, Some(sid), _) => {
                        sqlx::query_as::<_, AttendanceRecord>(
                            "SELECT ar.id::text, ar.student_id::text, s.name AS student_name,
                                    ar.date::text, ar.status, ar.remarks, ar.created_at::text
                             FROM attendance_records ar
                             JOIN students s ON s.id = ar.student_id
                             WHERE ar.student_id = $1::uuid
                             ORDER BY ar.date DESC
                             LIMIT 100",
                        )
                        .bind(sid)
                        .fetch_all(conn)
                        .await?
                    }
                    (None, None, Some(cn)) => {
                        sqlx::query_as::<_, AttendanceRecord>(
                            "SELECT ar.id::text, ar.student_id::text, s.name AS student_name,
                                    ar.date::text, ar.status, ar.remarks, ar.created_at::text
                             FROM attendance_records ar
                             JOIN students s ON s.id = ar.student_id
                             WHERE s.class_name = $1
                             ORDER BY ar.date DESC, s.name
                             LIMIT 100",
                        )
                        .bind(cn)
                        .fetch_all(conn)
                        .await?
                    }
                    (None, None, None) => {
                        sqlx::query_as::<_, AttendanceRecord>(
                            "SELECT ar.id::text, ar.student_id::text, s.name AS student_name,
                                    ar.date::text, ar.status, ar.remarks, ar.created_at::text
                             FROM attendance_records ar
                             JOIN students s ON s.id = ar.student_id
                             ORDER BY ar.date DESC, s.name
                             LIMIT 100",
                        )
                        .fetch_all(conn)
                        .await?
                    }
                };
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(records)
    }

    // ── Fees ────────────────────────────────────────────────────────────────

    async fn fee_structures(&self, ctx: &Context<'_>) -> Result<Vec<FeeStructure>> {
        let user_ctx = require_permission(ctx, "fees.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, FeeStructure>(
                    "SELECT id::text, name, amount, frequency, class_name, academic_year
                     FROM fee_structures ORDER BY name",
                )
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    async fn fee_records(
        &self,
        ctx: &Context<'_>,
        student_id: Option<String>,
    ) -> Result<Vec<FeeRecord>> {
        let user_ctx = require_permission(ctx, "fees.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = match student_id {
                    Some(sid) => {
                        sqlx::query_as::<_, FeeRecord>(
                            "SELECT fr.id::text, fr.student_id::text, s.name AS student_name,
                                    fs.name AS fee_name, fr.amount_due, fr.amount_paid,
                                    fr.status, fr.due_date::text, fr.paid_date::text,
                                    fr.payment_mode
                             FROM fee_records fr
                             JOIN students s ON s.id = fr.student_id
                             JOIN fee_structures fs ON fs.id = fr.fee_structure_id
                             WHERE fr.student_id = $1::uuid
                             ORDER BY fr.due_date DESC",
                        )
                        .bind(sid)
                        .fetch_all(conn)
                        .await?
                    }
                    None => {
                        sqlx::query_as::<_, FeeRecord>(
                            "SELECT fr.id::text, fr.student_id::text, s.name AS student_name,
                                    fs.name AS fee_name, fr.amount_due, fr.amount_paid,
                                    fr.status, fr.due_date::text, fr.paid_date::text,
                                    fr.payment_mode
                             FROM fee_records fr
                             JOIN students s ON s.id = fr.student_id
                             JOIN fee_structures fs ON fs.id = fr.fee_structure_id
                             ORDER BY fr.due_date DESC",
                        )
                        .fetch_all(conn)
                        .await?
                    }
                };
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    // ── Admissions ──────────────────────────────────────────────────────────

    async fn admission_applications(
        &self,
        ctx: &Context<'_>,
    ) -> Result<Vec<AdmissionApplication>> {
        let user_ctx = require_permission(ctx, "admissions.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, AdmissionApplication>(
                    "SELECT id::text, student_name, guardian_name, guardian_phone,
                            guardian_email, applied_class, status, academic_year,
                            notes, submitted_at::text
                     FROM admission_applications
                     ORDER BY submitted_at DESC",
                )
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    // ── Notices ──────────────────────────────────────────────────────────────

    async fn notices(&self, ctx: &Context<'_>) -> Result<Vec<Notice>> {
        let user_ctx = require_permission(ctx, "notices.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, Notice>(
                    "SELECT n.id::text, n.title, n.body, n.audience, n.priority,
                            n.published, u.name AS created_by_name, n.created_at::text,
                            n.target_classes
                     FROM notices n
                     JOIN users u ON u.id = n.created_by
                     ORDER BY n.created_at DESC",
                )
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    // ── Payroll ─────────────────────────────────────────────────────────────

    async fn staff_salaries(&self, ctx: &Context<'_>) -> Result<Vec<StaffSalary>> {
        let user_ctx = require_permission(ctx, "payroll.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, StaffSalary>(
                    "SELECT ss.id::text, ss.user_id::text, u.name AS user_name,
                            ss.basic_pay, ss.allowances, ss.deductions,
                            ss.effective_from::text
                     FROM staff_salaries ss
                     JOIN users u ON u.id = ss.user_id
                     ORDER BY u.name",
                )
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    async fn payroll_runs(&self, ctx: &Context<'_>) -> Result<Vec<PayrollRun>> {
        let user_ctx = require_permission(ctx, "payroll.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, PayrollRun>(
                    "SELECT id::text, month, year, status, total_gross, total_net,
                            processed_at::text
                     FROM payroll_runs
                     ORDER BY year DESC, month DESC",
                )
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    async fn payroll_entries(
        &self,
        ctx: &Context<'_>,
        run_id: String,
    ) -> Result<Vec<PayrollEntry>> {
        let _user_ctx = require_permission(ctx, "payroll.view")?;
        let pool = ctx.data::<PgPool>()?;

        let run_uuid = uuid::Uuid::parse_str(&run_id)
            .map_err(|_| async_graphql::Error::new("Invalid payroll run id"))?;

        let rows = sqlx::query_as::<_, PayrollEntry>(
            "SELECT pe.id::text, u.name AS user_name, pe.basic_pay,
                    pe.allowances, pe.deductions, pe.net_pay
             FROM payroll_entries pe
             JOIN users u ON u.id = pe.user_id
             WHERE pe.payroll_run_id = $1
             ORDER BY u.name",
        )
        .bind(run_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching payroll entries: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(rows)
    }

    // ── Users ───────────────────────────────────────────────────────────────

    async fn org_users(&self, ctx: &Context<'_>) -> Result<Vec<OrgUser>> {
        let user_ctx = require_permission(ctx, "users.view")?;
        let pool = ctx.data::<PgPool>()?;

        let org_uuid = uuid::Uuid::parse_str(&user_ctx.org_id)
            .map_err(|_| async_graphql::Error::new("Invalid org id"))?;

        let rows = sqlx::query_as::<_, OrgUser>(
            "SELECT u.id::text, u.name, u.email, u.system_role, u.phone,
                    STRING_AGG(r.name, ', ' ORDER BY r.name) AS role_names
             FROM user_organisations uo
             JOIN users u ON u.id = uo.user_id
             LEFT JOIN user_org_roles uor ON uor.user_id = u.id AND uor.organisation_id = uo.organisation_id
             LEFT JOIN roles r ON r.id = uor.role_id
             WHERE uo.organisation_id = $1
             GROUP BY u.id, u.name, u.email, u.system_role, u.phone
             ORDER BY u.name",
        )
        .bind(org_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching org users: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(rows)
    }

    // ── Reports ─────────────────────────────────────────────────────────────

    async fn report_summary(&self, ctx: &Context<'_>) -> Result<ReportSummary> {
        let user_ctx = require_permission(ctx, "reports.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let summary = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, ReportSummary>(
                    "SELECT
                        (SELECT COUNT(*) FROM students)::bigint AS total_students,
                        (SELECT COUNT(DISTINCT uo.user_id) FROM user_organisations uo
                         WHERE uo.organisation_id = current_setting('app.current_org', true)::uuid)::bigint AS total_staff,
                        (SELECT COUNT(*) FROM attendance_records WHERE date = CURRENT_DATE AND status = 'present')::bigint AS attendance_today_present,
                        (SELECT COUNT(*) FROM attendance_records WHERE date = CURRENT_DATE)::bigint AS attendance_today_total,
                        (SELECT COALESCE(SUM(amount_paid), 0) FROM fee_records WHERE status = 'paid')::bigint AS fees_collected,
                        (SELECT COALESCE(SUM(amount_due - amount_paid), 0) FROM fee_records WHERE status IN ('pending','partial','overdue'))::bigint AS fees_pending,
                        (SELECT COUNT(*) FROM admission_applications WHERE status IN ('submitted','under_review'))::bigint AS pending_admissions,
                        (SELECT COUNT(*) FROM notices WHERE published = true)::bigint AS active_notices",
                )
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(summary)
    }

    // ── Teacher ──────────────────────────────────────────────────────────────

    async fn my_classes(&self, ctx: &Context<'_>) -> Result<Vec<TeacherClass>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let uid = user_ctx.user_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, TeacherClass>(
                    "SELECT tca.id::text, tca.user_id::text, u.name AS user_name,
                            tca.class_name, tca.is_class_teacher
                     FROM teacher_class_assignments tca
                     JOIN users u ON u.id = tca.user_id
                     WHERE tca.user_id = $1::uuid
                     ORDER BY tca.class_name",
                )
                .bind(&uid)
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    async fn my_students(
        &self,
        ctx: &Context<'_>,
        class_name: Option<String>,
    ) -> Result<Vec<StudentProgress>> {
        let user_ctx = require_permission(ctx, "students.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let uid = user_ctx.user_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, StudentProgress>(
                    "SELECT s.id::text, s.name, s.class_name,
                            COALESCE(COUNT(ar.id) FILTER (WHERE ar.status = 'present'), 0)::bigint AS attendance_present,
                            COALESCE(COUNT(ar.id), 0)::bigint AS attendance_total,
                            CASE WHEN COUNT(ar.id) > 0
                                 THEN ROUND(COUNT(ar.id) FILTER (WHERE ar.status = 'present')::numeric / COUNT(ar.id) * 100, 1)
                                 ELSE 0 END::float8 AS attendance_rate,
                            COALESCE(SUM(DISTINCT fr.amount_paid), 0)::bigint AS fees_paid,
                            COALESCE(SUM(DISTINCT CASE WHEN fr.status != 'paid' THEN fr.amount_due - fr.amount_paid ELSE 0 END), 0)::bigint AS fees_pending
                     FROM students s
                     JOIN teacher_class_assignments tca ON tca.class_name = s.class_name
                         AND tca.user_id = $1::uuid
                     LEFT JOIN attendance_records ar ON ar.student_id = s.id
                     LEFT JOIN fee_records fr ON fr.student_id = s.id
                     WHERE ($2::text IS NULL OR s.class_name = $2)
                     GROUP BY s.id, s.name, s.class_name
                     ORDER BY s.class_name, s.name",
                )
                .bind(&uid)
                .bind(&class_name)
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    async fn my_payslips(&self, ctx: &Context<'_>) -> Result<Vec<MyPayslip>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let uid = user_ctx.user_id.clone();

        let rows = sqlx::query_as::<_, MyPayslip>(
            "SELECT pe.id::text, pr.month, pr.year, pr.status AS run_status,
                    pe.basic_pay, pe.allowances, pe.deductions, pe.net_pay
             FROM payroll_entries pe
             JOIN payroll_runs pr ON pr.id = pe.payroll_run_id
             WHERE pe.user_id = $1::uuid
             ORDER BY pr.year DESC, pr.month DESC",
        )
        .bind(&uid)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching payslips: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(rows)
    }

    // ── Assignments ──────────────────────────────────────────────────────────

    async fn assignments(
        &self,
        ctx: &Context<'_>,
        class_name: Option<String>,
    ) -> Result<Vec<Assignment>> {
        let user_ctx = require_permission(ctx, "assignments.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = match class_name {
                    Some(cn) => {
                        sqlx::query_as::<_, Assignment>(
                            "SELECT a.id::text, a.title, a.description, a.class_name, a.subject,
                                    u.name AS assigned_by_name, a.due_date::text, a.created_at::text
                             FROM assignments a
                             JOIN users u ON u.id = a.assigned_by
                             WHERE a.class_name = $1
                             ORDER BY a.created_at DESC",
                        )
                        .bind(cn)
                        .fetch_all(conn)
                        .await?
                    }
                    None => {
                        sqlx::query_as::<_, Assignment>(
                            "SELECT a.id::text, a.title, a.description, a.class_name, a.subject,
                                    u.name AS assigned_by_name, a.due_date::text, a.created_at::text
                             FROM assignments a
                             JOIN users u ON u.id = a.assigned_by
                             ORDER BY a.created_at DESC",
                        )
                        .fetch_all(conn)
                        .await?
                    }
                };
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    // ── Leave ────────────────────────────────────────────────────────────────

    async fn my_leave_requests(&self, ctx: &Context<'_>) -> Result<Vec<LeaveRequest>> {
        let user_ctx = require_permission(ctx, "leave.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let uid = user_ctx.user_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, LeaveRequest>(
                    "SELECT lr.id::text, lr.user_id::text, u.name AS user_name,
                            lr.leave_type, lr.start_date::text, lr.end_date::text,
                            lr.reason, lr.status,
                            u2.name AS reviewed_by_name, lr.reviewed_at::text,
                            lr.created_at::text, NULL::text AS class_name
                     FROM leave_requests lr
                     JOIN users u ON u.id = lr.user_id
                     LEFT JOIN users u2 ON u2.id = lr.reviewed_by
                     WHERE lr.user_id = $1::uuid
                     ORDER BY lr.created_at DESC",
                )
                .bind(&uid)
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    async fn leave_requests(&self, ctx: &Context<'_>) -> Result<Vec<LeaveRequest>> {
        let user_ctx = require_permission(ctx, "leave.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, LeaveRequest>(
                    "SELECT lr.id::text, lr.user_id::text, u.name AS user_name,
                            lr.leave_type, lr.start_date::text, lr.end_date::text,
                            lr.reason, lr.status,
                            u2.name AS reviewed_by_name, lr.reviewed_at::text,
                            lr.created_at::text, NULL::text AS class_name
                     FROM leave_requests lr
                     JOIN users u ON u.id = lr.user_id
                     LEFT JOIN users u2 ON u2.id = lr.reviewed_by
                     ORDER BY CASE lr.status WHEN 'pending' THEN 0 ELSE 1 END, lr.created_at DESC",
                )
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    async fn student_leave_requests(&self, ctx: &Context<'_>) -> Result<Vec<LeaveRequest>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let uid = user_ctx.user_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, LeaveRequest>(
                    "SELECT lr.id::text, lr.user_id::text, u.name AS user_name,
                            lr.leave_type, lr.start_date::text, lr.end_date::text,
                            lr.reason, lr.status,
                            u2.name AS reviewed_by_name, lr.reviewed_at::text,
                            lr.created_at::text, s.class_name
                     FROM leave_requests lr
                     JOIN users u ON u.id = lr.user_id
                     JOIN students s ON s.user_id = lr.user_id
                     JOIN teacher_class_assignments tca ON tca.class_name = s.class_name
                         AND tca.user_id = $1::uuid AND tca.is_class_teacher = true
                     LEFT JOIN users u2 ON u2.id = lr.reviewed_by
                     ORDER BY CASE lr.status WHEN 'pending' THEN 0 ELSE 1 END, lr.created_at DESC",
                )
                .bind(&uid)
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    async fn teacher_class_assignments(
        &self,
        ctx: &Context<'_>,
        user_id: Option<String>,
    ) -> Result<Vec<TeacherClass>> {
        let user_ctx = require_permission(ctx, "users.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = match user_id {
                    Some(uid) => {
                        sqlx::query_as::<_, TeacherClass>(
                            "SELECT tca.id::text, tca.user_id::text, u.name AS user_name,
                                    tca.class_name, tca.is_class_teacher
                             FROM teacher_class_assignments tca
                             JOIN users u ON u.id = tca.user_id
                             WHERE tca.user_id = $1::uuid
                             ORDER BY tca.class_name",
                        )
                        .bind(uid)
                        .fetch_all(conn)
                        .await?
                    }
                    None => {
                        sqlx::query_as::<_, TeacherClass>(
                            "SELECT tca.id::text, tca.user_id::text, u.name AS user_name,
                                    tca.class_name, tca.is_class_teacher
                             FROM teacher_class_assignments tca
                             JOIN users u ON u.id = tca.user_id
                             ORDER BY u.name, tca.class_name",
                        )
                        .fetch_all(conn)
                        .await?
                    }
                };
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(rows)
    }

    // ── Org Resolution (public) ──────────────────────────────────────────────

    /// Resolve an organisation by slug or custom domain host. No auth required.
    async fn resolve_org(
        &self,
        ctx: &Context<'_>,
        slug: Option<String>,
        host: Option<String>,
    ) -> Result<Option<OrgInfo>> {
        let pool = ctx.data::<PgPool>()?;

        if let Some(ref s) = slug {
            let info = sqlx::query_as::<_, OrgInfo>(
                "SELECT o.id::text AS org_id, o.name AS org_name, o.slug AS org_slug,
                        t.name AS tenant_name
                 FROM organisations o
                 JOIN tenants t ON t.id = o.tenant_id
                 WHERE o.slug = $1",
            )
            .bind(s)
            .fetch_optional(pool)
            .await
            .map_err(|e| {
                tracing::error!("DB error resolving org by slug: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
            return Ok(info);
        }

        if let Some(ref h) = host {
            let info = sqlx::query_as::<_, OrgInfo>(
                "SELECT o.id::text AS org_id, o.name AS org_name, o.slug AS org_slug,
                        t.name AS tenant_name
                 FROM org_custom_domains cd
                 JOIN organisations o ON o.id = cd.organisation_id
                 JOIN tenants t ON t.id = o.tenant_id
                 WHERE cd.domain = $1 AND cd.verified = true",
            )
            .bind(h)
            .fetch_optional(pool)
            .await
            .map_err(|e| {
                tracing::error!("DB error resolving org by host: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
            return Ok(info);
        }

        Ok(None)
    }

    // ── Custom Domains (tenant admin) ───────────────────────────────────────

    /// List custom domains for an organisation. Requires tenant_admin or superadmin.
    async fn custom_domains(
        &self,
        ctx: &Context<'_>,
        organisation_id: String,
    ) -> Result<Vec<CustomDomain>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        if user_ctx.system_role != SystemRole::Superadmin
            && user_ctx.system_role != SystemRole::TenantAdmin
        {
            return Err(async_graphql::Error::new("Access denied")
                .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "FORBIDDEN");
                }));
        }

        verify_org_in_tenant(pool, &organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;

        let org_uuid = uuid::Uuid::parse_str(&organisation_id)
            .map_err(|_| async_graphql::Error::new("Invalid organisation id"))?;

        let rows = sqlx::query_as::<_, CustomDomain>(
            "SELECT id::text, organisation_id::text, domain, verified, created_at::text
             FROM org_custom_domains WHERE organisation_id = $1
             ORDER BY created_at",
        )
        .bind(org_uuid)
        .fetch_all(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching custom domains: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(rows)
    }

    // ── Org Report Summary (tenant admin) ──────────────────────────────────

    /// Get report summary for a specific organisation. Requires tenant_admin or superadmin.
    async fn org_report_summary(
        &self,
        ctx: &Context<'_>,
        organisation_id: String,
    ) -> Result<ReportSummary> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        if user_ctx.system_role != SystemRole::Superadmin
            && user_ctx.system_role != SystemRole::TenantAdmin
        {
            return Err(async_graphql::Error::new("Access denied")
                .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "FORBIDDEN");
                }));
        }

        verify_org_in_tenant(pool, &organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;

        // Look up the tenant_id for this org
        let org_uuid = uuid::Uuid::parse_str(&organisation_id)
            .map_err(|_| async_graphql::Error::new("Invalid organisation id"))?;

        let tenant_id: String = sqlx::query_scalar(
            "SELECT tenant_id::text FROM organisations WHERE id = $1",
        )
        .bind(org_uuid)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching org tenant: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        let summary = execute_in_context(pool, &tenant_id, &organisation_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, ReportSummary>(
                    "SELECT
                        (SELECT COUNT(*) FROM students)::bigint AS total_students,
                        (SELECT COUNT(DISTINCT uo.user_id) FROM user_organisations uo
                         WHERE uo.organisation_id = current_setting('app.current_org', true)::uuid)::bigint AS total_staff,
                        (SELECT COUNT(*) FROM attendance_records WHERE date = CURRENT_DATE AND status = 'present')::bigint AS attendance_today_present,
                        (SELECT COUNT(*) FROM attendance_records WHERE date = CURRENT_DATE)::bigint AS attendance_today_total,
                        (SELECT COALESCE(SUM(amount_paid), 0) FROM fee_records WHERE status = 'paid')::bigint AS fees_collected,
                        (SELECT COALESCE(SUM(amount_due - amount_paid), 0) FROM fee_records WHERE status IN ('pending','partial','overdue'))::bigint AS fees_pending,
                        (SELECT COUNT(*) FROM admission_applications WHERE status IN ('submitted','under_review'))::bigint AS pending_admissions,
                        (SELECT COUNT(*) FROM notices WHERE published = true)::bigint AS active_notices",
                )
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(summary)
    }

    // ── Org Admin User (tenant admin) ─────────────────────────────────────

    /// Get the auto-generated admin user for an org (admin@{slug}.com).
    async fn org_admin_user(
        &self,
        ctx: &Context<'_>,
        organisation_id: String,
    ) -> Result<Option<User>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        if user_ctx.system_role != SystemRole::Superadmin
            && user_ctx.system_role != SystemRole::TenantAdmin
        {
            return Err(async_graphql::Error::new("Access denied")
                .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "FORBIDDEN");
                }));
        }

        verify_org_in_tenant(pool, &organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;

        let org_uuid = uuid::Uuid::parse_str(&organisation_id)
            .map_err(|_| async_graphql::Error::new("Invalid organisation id"))?;

        // Get org slug to derive admin email
        let slug: String = sqlx::query_scalar(
            "SELECT slug FROM organisations WHERE id = $1",
        )
        .bind(org_uuid)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching org slug: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        let admin_email = format!("admin@{}.com", slug);

        let user = sqlx::query_as::<_, User>(
            "SELECT u.id::text, u.name, u.email, u.system_role, u.phone
             FROM users u
             JOIN user_organisations uo ON uo.user_id = u.id
             WHERE u.email = $1 AND uo.organisation_id = $2",
        )
        .bind(&admin_email)
        .bind(org_uuid)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching org admin user: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(user)
    }
}

// ── Mutation ─────────────────────────────────────────────────────────────────

pub struct MutationRoot;

#[Object]
impl MutationRoot {
    /// Authenticate a user by email and password. Returns a JWT and the user record.
    async fn login(
        &self,
        ctx: &Context<'_>,
        email: String,
        password: String,
        org_slug: Option<String>,
    ) -> Result<LoginResponse> {
        if password.is_empty() {
            return Err(async_graphql::Error::new("Password must not be empty").extend_with(
                |_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "BAD_USER_INPUT");
                },
            ));
        }

        let pool = ctx.data::<PgPool>()?;

        tracing::info!(email = %email, "GraphQL mutation: login");

        let user_row = sqlx::query_as::<_, UserWithPassword>(
            "SELECT id::text, name, email, system_role, phone, password_hash FROM users WHERE email = $1",
        )
        .bind(&email)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error during login: {e}");
            async_graphql::Error::new("Internal server error")
        })?
        .ok_or_else(|| async_graphql::Error::new("Invalid email or password"))?;

        // Verify password with bcrypt
        let valid = bcrypt::verify(&password, &user_row.password_hash).unwrap_or(false);
        if !valid {
            return Err(async_graphql::Error::new("Invalid email or password"));
        }

        // Resolve org: by slug if provided, by email domain, or fall back to user's first org
        let org_tenant = if let Some(ref slug) = org_slug {
            Some(
                sqlx::query_as::<_, OrgTenantRow>(
                    "SELECT uo.organisation_id::text AS org_id, o.tenant_id::text AS tenant_id
                     FROM user_organisations uo
                     JOIN organisations o ON o.id = uo.organisation_id
                     WHERE uo.user_id = $1::uuid AND o.slug = $2
                     LIMIT 1",
                )
                .bind(&user_row.id)
                .bind(slug)
                .fetch_optional(pool)
                .await
                .map_err(|e| {
                    tracing::error!("DB error fetching org by slug: {e}");
                    async_graphql::Error::new("Internal server error")
                })?
                .ok_or_else(|| async_graphql::Error::new("You do not belong to this organisation"))?,
            )
        } else {
            // Try to extract org slug from email domain (e.g. admin@greenwood.com → "greenwood")
            let email_slug = extract_slug_from_email(&email);
            let from_email = if let Some(ref slug) = email_slug {
                sqlx::query_as::<_, OrgTenantRow>(
                    "SELECT uo.organisation_id::text AS org_id, o.tenant_id::text AS tenant_id
                     FROM user_organisations uo
                     JOIN organisations o ON o.id = uo.organisation_id
                     WHERE uo.user_id = $1::uuid AND o.slug = $2
                     LIMIT 1",
                )
                .bind(&user_row.id)
                .bind(slug)
                .fetch_optional(pool)
                .await
                .map_err(|e| {
                    tracing::error!("DB error fetching org by email slug: {e}");
                    async_graphql::Error::new("Internal server error")
                })?
            } else {
                None
            };

            // If email-based resolution didn't work, fall back to user's first org
            match from_email {
                Some(ot) => Some(ot),
                None => {
                    sqlx::query_as::<_, OrgTenantRow>(
                        "SELECT uo.organisation_id::text AS org_id, o.tenant_id::text AS tenant_id
                         FROM user_organisations uo
                         JOIN organisations o ON o.id = uo.organisation_id
                         WHERE uo.user_id = $1::uuid
                         LIMIT 1",
                    )
                    .bind(&user_row.id)
                    .fetch_optional(pool)
                    .await
                    .map_err(|e| {
                        tracing::error!("DB error fetching org/tenant for user: {e}");
                        async_graphql::Error::new("Internal server error")
                    })?
                }
            }
        };

        // Build org_id / tenant_id for the JWT
        let (final_org_id, final_tenant_id) = match org_tenant {
            Some(ot) => (ot.org_id, ot.tenant_id),
            None => {
                // User has no orgs yet (fresh signup). Look up tenant_id from the users table.
                let tid: Option<String> = sqlx::query_scalar(
                    "SELECT tenant_id::text FROM users WHERE id = $1::uuid",
                )
                .bind(&user_row.id)
                .fetch_optional(pool)
                .await
                .map_err(|e| {
                    tracing::error!("DB error fetching user tenant_id: {e}");
                    async_graphql::Error::new("Internal server error")
                })?
                .flatten();

                (String::new(), tid.unwrap_or_default())
            }
        };

        let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret".into());
        let exp = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::hours(24))
            .map(|t| t.timestamp() as usize)
            .unwrap_or(0);

        let claims = Claims {
            sub: user_row.id.clone(),
            tenant_id: final_tenant_id,
            org_id: final_org_id,
            system_role: user_row.system_role.clone(),
            exp,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .map_err(|e| async_graphql::Error::new(format!("Failed to create token: {e}")))?;

        let user = User {
            id: user_row.id,
            name: user_row.name,
            email: user_row.email,
            system_role: user_row.system_role,
            phone: user_row.phone,
        };

        Ok(LoginResponse { token, user })
    }

    // ── Signup (public) ──────────────────────────────────────────────────────

    /// Self-service signup: creates a tenant and admin user.
    /// The user then creates their first organisation via `createOrganisation`.
    async fn signup(
        &self,
        ctx: &Context<'_>,
        name: String,
        email: String,
        password: String,
        tenant_name: Option<String>,
    ) -> Result<SignupResponse> {
        let pool = ctx.data::<PgPool>()?;

        if password.len() < 6 {
            return Err(async_graphql::Error::new(
                "Password must be at least 6 characters",
            ));
        }

        // Hash password
        let hashed = bcrypt::hash(&password, 12).map_err(|e| {
            async_graphql::Error::new(format!("Failed to hash password: {e}"))
        })?;

        let mut tx = pool.begin().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        // Derive tenant name from user name if not provided
        let effective_tenant_name = tenant_name.unwrap_or_else(|| format!("{}'s Tenant", name));

        // Create tenant (slug derived from name for uniqueness)
        let tenant_slug = effective_tenant_name
            .to_lowercase()
            .replace(|c: char| !c.is_ascii_alphanumeric() && c != '-' && c != ' ', "")
            .split_whitespace()
            .collect::<Vec<_>>()
            .join("-");
        let tenant_slug = if tenant_slug.is_empty() {
            format!("tenant-{}", uuid::Uuid::new_v4().to_string().split('-').next().unwrap_or("x"))
        } else {
            tenant_slug
        };

        let tenant_row: (String,) = sqlx::query_as(
            "INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id::text",
        )
        .bind(&effective_tenant_name)
        .bind(&tenant_slug)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| match &e {
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                async_graphql::Error::new(format!(
                    "A tenant with a similar name already exists. Please try a different name."
                ))
            }
            _ => {
                tracing::error!("DB error creating tenant: {e}");
                async_graphql::Error::new("Internal server error")
            }
        })?;
        let tenant_id = tenant_row.0;

        // Create user (linked to the new tenant)
        let user = sqlx::query_as::<_, User>(
            "INSERT INTO users (name, email, password_hash, system_role, phone, tenant_id)
             VALUES ($1, $2, $3, 'tenant_admin', NULL, $4::uuid)
             RETURNING id::text, name, email, system_role, phone",
        )
        .bind(&name)
        .bind(&email)
        .bind(&hashed)
        .bind(&tenant_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| match &e {
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                async_graphql::Error::new(format!(
                    "A user with email '{}' already exists",
                    email
                ))
            }
            _ => {
                tracing::error!("DB error creating user: {e}");
                async_graphql::Error::new("Internal server error")
            }
        })?;

        tx.commit().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        // Issue JWT (org_id is empty since no org created yet)
        let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret".into());
        let exp = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::hours(24))
            .map(|t| t.timestamp() as usize)
            .unwrap_or(0);

        let claims = Claims {
            sub: user.id.clone(),
            tenant_id: tenant_id.clone(),
            org_id: String::new(),
            system_role: user.system_role.clone(),
            exp,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .map_err(|e| async_graphql::Error::new(format!("Failed to create token: {e}")))?;

        tracing::info!(user_id = %user.id, tenant_id = %tenant_id, "Signup completed (tenant created, no org yet)");
        Ok(SignupResponse {
            token,
            user,
            tenant_id,
        })
    }

    // ── Organisation creation (tenant_admin) ─────────────────────────────────

    /// Create a new organisation under the caller's tenant.
    /// Auto-generates an admin user (admin@{slug}.com) with a random password.
    /// Returns the org and the generated admin credentials (shown once).
    async fn create_organisation(
        &self,
        ctx: &Context<'_>,
        name: String,
        slug: String,
    ) -> Result<CreateOrgResponse> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        if user_ctx.system_role != SystemRole::Superadmin
            && user_ctx.system_role != SystemRole::TenantAdmin
        {
            return Err(async_graphql::Error::new("Access denied: tenant_admin or superadmin required")
                .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "FORBIDDEN");
                }));
        }

        validate_slug(&slug)?;
        if slug.len() < 3 {
            return Err(async_graphql::Error::new(
                "Slug must be at least 3 characters",
            ));
        }

        let tenant_uuid = uuid::Uuid::parse_str(&user_ctx.tenant_id)
            .map_err(|_| async_graphql::Error::new("Invalid tenant id"))?;

        // Generate admin credentials
        let admin_email = format!("admin@{}.com", slug);
        let admin_password = generate_random_password();
        let hashed = bcrypt::hash(&admin_password, 12).map_err(|e| {
            async_graphql::Error::new(format!("Failed to hash password: {e}"))
        })?;

        let mut tx = pool.begin().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        let org = sqlx::query_as::<_, Organisation>(
            "INSERT INTO organisations (tenant_id, name, slug)
             VALUES ($1, $2, $3)
             RETURNING id::text, tenant_id::text, name, slug, created_at::text",
        )
        .bind(tenant_uuid)
        .bind(&name)
        .bind(&slug)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| match &e {
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                async_graphql::Error::new(format!(
                    "Organisation with slug '{}' already exists",
                    slug
                ))
            }
            _ => {
                tracing::error!("DB error creating organisation: {e}");
                async_graphql::Error::new("Internal server error")
            }
        })?;

        let org_uuid = uuid::Uuid::parse_str(&org.id)
            .map_err(|_| async_graphql::Error::new("Invalid org id"))?;

        // Create auto-generated admin user for this org
        let admin_user: User = sqlx::query_as(
            "INSERT INTO users (name, email, password_hash, system_role, phone, tenant_id)
             VALUES ($1, $2, $3, 'user', NULL, $4)
             RETURNING id::text, name, email, system_role, phone",
        )
        .bind(format!("{} Admin", name))
        .bind(&admin_email)
        .bind(&hashed)
        .bind(tenant_uuid)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| match &e {
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                async_graphql::Error::new(format!(
                    "Admin email '{}' already exists. Slug may already be in use.",
                    admin_email
                ))
            }
            _ => {
                tracing::error!("DB error creating admin user: {e}");
                async_graphql::Error::new("Internal server error")
            }
        })?;

        let admin_user_uuid = uuid::Uuid::parse_str(&admin_user.id)
            .map_err(|_| async_graphql::Error::new("Invalid admin user id"))?;

        // Link admin user to new org
        sqlx::query(
            "INSERT INTO user_organisations (user_id, organisation_id) VALUES ($1, $2)",
        )
        .bind(admin_user_uuid)
        .bind(org_uuid)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error linking admin user to org: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // Create default roles for the new org
        let default_roles = [
            ("Admin", "admin", vec![
                "students.view", "students.manage", "attendance.view", "attendance.manage",
                "fees.view", "fees.manage", "admissions.view", "admissions.manage",
                "notices.view", "notices.manage", "payroll.view", "payroll.manage",
                "reports.view", "users.view", "users.manage", "roles.view", "roles.manage",
                "assignments.view", "assignments.manage", "leave.view", "leave.manage",
            ]),
            ("Teacher", "teacher", vec![
                "students.view", "attendance.view", "attendance.manage",
                "assignments.view", "assignments.manage", "notices.view", "leave.view",
            ]),
            ("Student", "student", vec![
                "attendance.view", "assignments.view", "notices.view", "fees.view", "leave.view",
            ]),
            ("Parent", "parent", vec![
                "attendance.view", "fees.view", "notices.view",
            ]),
        ];

        let mut admin_role_id: Option<uuid::Uuid> = None;

        for (role_name, role_slug, perms) in &default_roles {
            let role_row: (String,) = sqlx::query_as(
                "INSERT INTO roles (organisation_id, name, slug, description, is_system)
                 VALUES ($1, $2, $3, $4, true)
                 RETURNING id::text",
            )
            .bind(org_uuid)
            .bind(role_name)
            .bind(role_slug)
            .bind(format!("Default {} role", role_name))
            .fetch_one(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error creating role {role_slug}: {e}");
                async_graphql::Error::new("Internal server error")
            })?;

            let role_uuid = uuid::Uuid::parse_str(&role_row.0)
                .map_err(|_| async_graphql::Error::new("Invalid role id"))?;

            if *role_slug == "admin" {
                admin_role_id = Some(role_uuid);
            }

            for code in perms {
                sqlx::query(
                    "INSERT INTO role_permissions (role_id, permission_id)
                     SELECT $1, id FROM permissions WHERE code = $2",
                )
                .bind(role_uuid)
                .bind(code)
                .execute(&mut *tx)
                .await
                .map_err(|e| {
                    tracing::error!("DB error attaching permission {code}: {e}");
                    async_graphql::Error::new("Internal server error")
                })?;
            }
        }

        // Assign admin role to the auto-generated admin user (not the caller)
        if let Some(admin_rid) = admin_role_id {
            sqlx::query(
                "INSERT INTO user_org_roles (user_id, organisation_id, role_id, assigned_by)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT DO NOTHING",
            )
            .bind(admin_user_uuid)
            .bind(org_uuid)
            .bind(admin_rid)
            .bind(admin_user_uuid)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error assigning admin role: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        }

        tx.commit().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        tracing::info!(org_id = %org.id, slug = %slug, admin_email = %admin_email, "Created organisation with admin user");
        Ok(CreateOrgResponse {
            organisation: org,
            admin_email,
            admin_password,
        })
    }

    // ── Custom domains ───────────────────────────────────────────────────────

    /// Add a custom domain to an organisation. Requires tenant_admin or superadmin.
    async fn add_custom_domain(
        &self,
        ctx: &Context<'_>,
        organisation_id: String,
        domain: String,
    ) -> Result<CustomDomain> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        if user_ctx.system_role != SystemRole::Superadmin
            && user_ctx.system_role != SystemRole::TenantAdmin
        {
            return Err(async_graphql::Error::new("Access denied")
                .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "FORBIDDEN");
                }));
        }

        verify_org_in_tenant(pool, &organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;

        let org_uuid = uuid::Uuid::parse_str(&organisation_id)
            .map_err(|_| async_graphql::Error::new("Invalid organisation id"))?;

        let cd = sqlx::query_as::<_, CustomDomain>(
            "INSERT INTO org_custom_domains (organisation_id, domain)
             VALUES ($1, $2)
             RETURNING id::text, organisation_id::text, domain, verified, created_at::text",
        )
        .bind(org_uuid)
        .bind(&domain)
        .fetch_one(pool)
        .await
        .map_err(|e| match &e {
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                async_graphql::Error::new(format!("Domain '{}' is already registered", domain))
            }
            _ => {
                tracing::error!("DB error adding custom domain: {e}");
                async_graphql::Error::new("Internal server error")
            }
        })?;

        tracing::info!(domain = %domain, org_id = %organisation_id, "Added custom domain");
        Ok(cd)
    }

    /// Remove a custom domain from an organisation.
    async fn remove_custom_domain(
        &self,
        ctx: &Context<'_>,
        domain_id: String,
    ) -> Result<bool> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        if user_ctx.system_role != SystemRole::Superadmin
            && user_ctx.system_role != SystemRole::TenantAdmin
        {
            return Err(async_graphql::Error::new("Access denied")
                .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "FORBIDDEN");
                }));
        }

        let domain_uuid = uuid::Uuid::parse_str(&domain_id)
            .map_err(|_| async_graphql::Error::new("Invalid domain id"))?;

        sqlx::query("DELETE FROM org_custom_domains WHERE id = $1")
            .bind(domain_uuid)
            .execute(pool)
            .await
            .map_err(|e| {
                tracing::error!("DB error removing custom domain: {e}");
                async_graphql::Error::new("Internal server error")
            })?;

        tracing::info!(domain_id = %domain_id, "Removed custom domain");
        Ok(true)
    }

    // ── Student management ────────────────────────────────────────────────

    /// Create a new student in the current organisation.
    async fn create_student(
        &self,
        ctx: &Context<'_>,
        name: String,
        class_name: String,
    ) -> Result<Student> {
        let user_ctx = require_permission(ctx, "students.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let student = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, Student>(
                    "INSERT INTO students (organisation_id, tenant_id, name, class_name)
                     VALUES (current_setting('app.current_org', true)::uuid,
                             current_setting('app.current_tenant', true)::uuid,
                             $1, $2)
                     RETURNING id::text, name, class_name",
                )
                .bind(&name)
                .bind(&class_name)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        tracing::info!(student_id = %student.id, "Created student");
        Ok(student)
    }

    // ── User management ───────────────────────────────────────────────────

    /// Create a new user and add them to the current organisation.
    /// Auto-generates a password if none provided, returning it in the response.
    async fn create_user(
        &self,
        ctx: &Context<'_>,
        name: String,
        email: String,
        phone: Option<String>,
        system_role: Option<String>,
        password: Option<String>,
    ) -> Result<CreateUserResponse> {
        let user_ctx = require_permission(ctx, "users.manage")?;
        let pool = ctx.data::<PgPool>()?;

        let role = system_role.unwrap_or_else(|| "user".to_string());
        let valid_roles = ["superadmin", "tenant_admin", "user"];
        if !valid_roles.contains(&role.as_str()) {
            return Err(async_graphql::Error::new(
                "system_role must be one of: superadmin, tenant_admin, user",
            ));
        }

        // Auto-generate password if none provided
        let (hashed, generated_pw) = match password {
            Some(ref p) if !p.is_empty() => {
                let h = bcrypt::hash(p, 12).map_err(|e| {
                    async_graphql::Error::new(format!("Failed to hash password: {e}"))
                })?;
                (h, None)
            }
            _ => {
                let pw = generate_random_password();
                let h = bcrypt::hash(&pw, 12).map_err(|e| {
                    async_graphql::Error::new(format!("Failed to hash password: {e}"))
                })?;
                (h, Some(pw))
            }
        };

        let org_uuid = uuid::Uuid::parse_str(&user_ctx.org_id)
            .map_err(|_| async_graphql::Error::new("Invalid org id"))?;

        let tenant_uuid = uuid::Uuid::parse_str(&user_ctx.tenant_id)
            .map_err(|_| async_graphql::Error::new("Invalid tenant id"))?;

        let mut tx = pool.begin().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        let user = sqlx::query_as::<_, User>(
            "INSERT INTO users (name, email, password_hash, system_role, phone, tenant_id)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id::text, name, email, system_role, phone",
        )
        .bind(&name)
        .bind(&email)
        .bind(&hashed)
        .bind(&role)
        .bind(phone.as_deref())
        .bind(tenant_uuid)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| match &e {
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                async_graphql::Error::new(format!(
                    "A user with email '{}' already exists",
                    email
                ))
            }
            _ => {
                tracing::error!("DB error creating user: {e}");
                async_graphql::Error::new("Internal server error")
            }
        })?;

        let user_uuid = uuid::Uuid::parse_str(&user.id)
            .map_err(|_| async_graphql::Error::new("Invalid user id"))?;

        sqlx::query(
            "INSERT INTO user_organisations (user_id, organisation_id)
             VALUES ($1, $2)",
        )
        .bind(user_uuid)
        .bind(org_uuid)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error linking user to org: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        tx.commit().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        tracing::info!(user_id = %user.id, email = %email, "Created user");
        Ok(CreateUserResponse {
            user,
            generated_password: generated_pw,
        })
    }

    /// Create a new role in an organisation. Requires `roles.manage`.
    async fn create_role(
        &self,
        ctx: &Context<'_>,
        organisation_id: String,
        name: String,
        slug: String,
        description: Option<String>,
        permission_codes: Vec<String>,
    ) -> Result<Role> {
        let user_ctx = require_permission_for_org(ctx, "roles.manage", &organisation_id)?;
        let pool = ctx.data::<PgPool>()?;

        verify_org_in_tenant(pool, &organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;
        validate_slug(&slug)?;

        let org_uuid = uuid::Uuid::parse_str(&organisation_id)
            .map_err(|_| async_graphql::Error::new("Invalid organisation id"))?;

        let mut tx = pool.begin().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        let role = sqlx::query_as::<_, Role>(
            "INSERT INTO roles (organisation_id, name, slug, description, is_system)
             VALUES ($1, $2, $3, $4, false)
             RETURNING id::text, organisation_id::text, name, slug, description, is_system",
        )
        .bind(org_uuid)
        .bind(&name)
        .bind(&slug)
        .bind(description.as_deref().unwrap_or(""))
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| match &e {
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                async_graphql::Error::new(format!(
                    "Role with slug '{slug}' already exists in this organisation"
                ))
            }
            _ => {
                tracing::error!("DB error creating role: {e}");
                async_graphql::Error::new("Internal server error")
            }
        })?;

        // Attach permissions
        let role_uuid = uuid::Uuid::parse_str(&role.id)
            .map_err(|_| async_graphql::Error::new("Invalid role id"))?;

        for code in &permission_codes {
            sqlx::query(
                "INSERT INTO role_permissions (role_id, permission_id)
                 SELECT $1, id FROM permissions WHERE code = $2",
            )
            .bind(role_uuid)
            .bind(code)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error attaching permission {code}: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        }

        tx.commit().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        tracing::info!(role_id = %role.id, slug = %role.slug, "Created role");
        Ok(role)
    }

    /// Update a role's name, description, and/or permission set.
    async fn update_role(
        &self,
        ctx: &Context<'_>,
        role_id: String,
        name: Option<String>,
        description: Option<String>,
        permission_codes: Option<Vec<String>>,
    ) -> Result<Role> {
        let pool = ctx.data::<PgPool>()?;

        let role_uuid = uuid::Uuid::parse_str(&role_id)
            .map_err(|_| async_graphql::Error::new("Invalid role id"))?;

        let existing = sqlx::query_as::<_, Role>(
            "SELECT id::text, organisation_id::text, name, slug, description, is_system
             FROM roles WHERE id = $1",
        )
        .bind(role_uuid)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error: {e}");
            async_graphql::Error::new("Internal server error")
        })?
        .ok_or_else(|| async_graphql::Error::new("Role not found"))?;

        let user_ctx =
            require_permission_for_org(ctx, "roles.manage", &existing.organisation_id)?;
        verify_org_in_tenant(pool, &existing.organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;

        let mut tx = pool.begin().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        if let Some(ref new_name) = name {
            sqlx::query("UPDATE roles SET name = $1 WHERE id = $2")
                .bind(new_name)
                .bind(role_uuid)
                .execute(&mut *tx)
                .await
                .map_err(|_| async_graphql::Error::new("Internal server error"))?;
        }
        if let Some(ref new_desc) = description {
            sqlx::query("UPDATE roles SET description = $1 WHERE id = $2")
                .bind(new_desc)
                .bind(role_uuid)
                .execute(&mut *tx)
                .await
                .map_err(|_| async_graphql::Error::new("Internal server error"))?;
        }

        // Replace permissions if provided
        if let Some(ref codes) = permission_codes {
            sqlx::query("DELETE FROM role_permissions WHERE role_id = $1")
                .bind(role_uuid)
                .execute(&mut *tx)
                .await
                .map_err(|_| async_graphql::Error::new("Internal server error"))?;

            for code in codes {
                sqlx::query(
                    "INSERT INTO role_permissions (role_id, permission_id)
                     SELECT $1, id FROM permissions WHERE code = $2",
                )
                .bind(role_uuid)
                .bind(code)
                .execute(&mut *tx)
                .await
                .map_err(|_| async_graphql::Error::new("Internal server error"))?;
            }
        }

        tx.commit().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        let updated = sqlx::query_as::<_, Role>(
            "SELECT id::text, organisation_id::text, name, slug, description, is_system
             FROM roles WHERE id = $1",
        )
        .bind(role_uuid)
        .fetch_one(pool)
        .await
        .map_err(|_| async_graphql::Error::new("Internal server error"))?;

        tracing::info!(role_id = %updated.id, "Updated role");
        Ok(updated)
    }

    /// Delete a role. System roles cannot be deleted.
    async fn delete_role(&self, ctx: &Context<'_>, role_id: String) -> Result<bool> {
        let pool = ctx.data::<PgPool>()?;

        let role_uuid = uuid::Uuid::parse_str(&role_id)
            .map_err(|_| async_graphql::Error::new("Invalid role id"))?;

        let existing = sqlx::query_as::<_, Role>(
            "SELECT id::text, organisation_id::text, name, slug, description, is_system
             FROM roles WHERE id = $1",
        )
        .bind(role_uuid)
        .fetch_optional(pool)
        .await
        .map_err(|_| async_graphql::Error::new("Internal server error"))?
        .ok_or_else(|| async_graphql::Error::new("Role not found"))?;

        if existing.is_system {
            return Err(async_graphql::Error::new(
                "Cannot delete system roles. You can modify their permissions instead.",
            ));
        }

        let user_ctx =
            require_permission_for_org(ctx, "roles.manage", &existing.organisation_id)?;
        verify_org_in_tenant(pool, &existing.organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;

        sqlx::query("DELETE FROM roles WHERE id = $1")
            .bind(role_uuid)
            .execute(pool)
            .await
            .map_err(|_| async_graphql::Error::new("Internal server error"))?;

        tracing::info!(role_id = %role_id, "Deleted role");
        Ok(true)
    }

    /// Assign a role to a user within an organisation. Requires `roles.manage`.
    async fn assign_role_to_user(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        organisation_id: String,
        role_id: String,
    ) -> Result<bool> {
        let user_ctx = require_permission_for_org(ctx, "roles.manage", &organisation_id)?;
        let pool = ctx.data::<PgPool>()?;

        verify_org_in_tenant(pool, &organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;

        let target_user_uuid = uuid::Uuid::parse_str(&user_id)
            .map_err(|_| async_graphql::Error::new("Invalid user id"))?;
        let org_uuid = uuid::Uuid::parse_str(&organisation_id)
            .map_err(|_| async_graphql::Error::new("Invalid organisation id"))?;
        let role_uuid = uuid::Uuid::parse_str(&role_id)
            .map_err(|_| async_graphql::Error::new("Invalid role id"))?;

        // Verify target user is a member of the org
        let is_member: bool = sqlx::query_scalar(
            "SELECT EXISTS(
                SELECT 1 FROM user_organisations
                WHERE user_id = $1 AND organisation_id = $2
            )",
        )
        .bind(target_user_uuid)
        .bind(org_uuid)
        .fetch_one(pool)
        .await
        .map_err(|_| async_graphql::Error::new("Internal server error"))?;

        if !is_member {
            return Err(async_graphql::Error::new(
                "User is not a member of this organisation",
            ));
        }

        let assigner_uuid = uuid::Uuid::parse_str(&user_ctx.user_id).ok();

        // The trigger check_role_org_match will enforce role belongs to org
        sqlx::query(
            "INSERT INTO user_org_roles (user_id, organisation_id, role_id, assigned_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT DO NOTHING",
        )
        .bind(target_user_uuid)
        .bind(org_uuid)
        .bind(role_uuid)
        .bind(assigner_uuid)
        .execute(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error assigning role: {e}");
            async_graphql::Error::new("Failed to assign role")
        })?;

        tracing::info!(
            target_user = %user_id,
            role = %role_id,
            org = %organisation_id,
            "Assigned role to user"
        );
        Ok(true)
    }

    /// Remove a role from a user within an organisation.
    async fn remove_role_from_user(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        organisation_id: String,
        role_id: String,
    ) -> Result<bool> {
        let user_ctx = require_permission_for_org(ctx, "roles.manage", &organisation_id)?;
        let pool = ctx.data::<PgPool>()?;

        verify_org_in_tenant(pool, &organisation_id, &user_ctx.tenant_id, &user_ctx.system_role).await?;

        let target_user_uuid = uuid::Uuid::parse_str(&user_id)
            .map_err(|_| async_graphql::Error::new("Invalid user id"))?;
        let org_uuid = uuid::Uuid::parse_str(&organisation_id)
            .map_err(|_| async_graphql::Error::new("Invalid organisation id"))?;
        let role_uuid = uuid::Uuid::parse_str(&role_id)
            .map_err(|_| async_graphql::Error::new("Invalid role id"))?;

        sqlx::query(
            "DELETE FROM user_org_roles
             WHERE user_id = $1 AND organisation_id = $2 AND role_id = $3",
        )
        .bind(target_user_uuid)
        .bind(org_uuid)
        .bind(role_uuid)
        .execute(pool)
        .await
        .map_err(|_| async_graphql::Error::new("Internal server error"))?;

        tracing::info!(
            target_user = %user_id,
            role = %role_id,
            org = %organisation_id,
            "Removed role from user"
        );
        Ok(true)
    }

    // ── Attendance mutations ────────────────────────────────────────────────

    async fn mark_attendance(
        &self,
        ctx: &Context<'_>,
        student_id: String,
        date: String,
        status: String,
        remarks: Option<String>,
    ) -> Result<AttendanceRecord> {
        let user_ctx = require_permission(ctx, "attendance.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let marker_id = user_ctx.user_id.clone();

        let valid_statuses = ["present", "absent", "late", "excused", "leave"];
        if !valid_statuses.contains(&status.as_str()) {
            return Err(async_graphql::Error::new(
                "Status must be one of: present, absent, late, excused, leave",
            ));
        }

        let record = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, AttendanceRecord>(
                    "INSERT INTO attendance_records (organisation_id, tenant_id, student_id, date, status, marked_by, remarks)
                     VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                             $1::uuid, $2::date, $3, $4::uuid, $5)
                     ON CONFLICT (student_id, date) DO UPDATE SET status = $3, marked_by = $4::uuid, remarks = $5
                     RETURNING id::text, student_id::text,
                              (SELECT name FROM students WHERE id = attendance_records.student_id) AS student_name,
                              date::text, status, remarks, created_at::text",
                )
                .bind(&student_id)
                .bind(&date)
                .bind(&status)
                .bind(&marker_id)
                .bind(remarks.as_deref().unwrap_or(""))
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(record)
    }

    async fn bulk_mark_attendance(
        &self,
        ctx: &Context<'_>,
        date: String,
        entries: Vec<AttendanceEntry>,
    ) -> Result<bool> {
        let user_ctx = require_permission(ctx, "attendance.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let marker_id = user_ctx.user_id.clone();

        let valid_statuses = ["present", "absent", "late", "excused", "leave"];
        for entry in &entries {
            if !valid_statuses.contains(&entry.status.as_str()) {
                return Err(async_graphql::Error::new(format!(
                    "Invalid status '{}'. Must be one of: present, absent, late, excused, leave",
                    entry.status
                )));
            }
        }

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let entries = entries;
            let date = date.clone();
            let marker_id = marker_id.clone();
            Box::pin(async move {
                for entry in &entries {
                    sqlx::query(
                        "INSERT INTO attendance_records (organisation_id, tenant_id, student_id, date, status, marked_by, remarks)
                         VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                                 $1::uuid, $2::date, $3, $4::uuid, '')
                         ON CONFLICT (student_id, date) DO UPDATE SET status = $3, marked_by = $4::uuid",
                    )
                    .bind(&entry.student_id)
                    .bind(&date)
                    .bind(&entry.status)
                    .bind(&marker_id)
                    .execute(&mut *conn)
                    .await?;
                }
                Ok(true)
            })
        })
        .await
        .map_err(|e| e.extend())
    }

    // ── Fee mutations ───────────────────────────────────────────────────────

    async fn create_fee_structure(
        &self,
        ctx: &Context<'_>,
        name: String,
        amount: i64,
        frequency: String,
        class_name: Option<String>,
        academic_year: Option<String>,
    ) -> Result<FeeStructure> {
        let user_ctx = require_permission(ctx, "fees.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let valid_frequencies = ["monthly", "quarterly", "annually", "one_time"];
        if !valid_frequencies.contains(&frequency.as_str()) {
            return Err(async_graphql::Error::new(
                "Frequency must be one of: monthly, quarterly, annually, one_time",
            ));
        }

        let year = academic_year.unwrap_or_else(|| "2024-25".to_string());

        let record = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, FeeStructure>(
                    "INSERT INTO fee_structures (organisation_id, tenant_id, name, amount, frequency, class_name, academic_year)
                     VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                             $1, $2, $3, $4, $5)
                     RETURNING id::text, name, amount, frequency, class_name, academic_year",
                )
                .bind(&name)
                .bind(amount)
                .bind(&frequency)
                .bind(class_name.as_deref())
                .bind(&year)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(record)
    }

    async fn record_fee_payment(
        &self,
        ctx: &Context<'_>,
        fee_record_id: String,
        amount: i64,
        payment_mode: String,
    ) -> Result<bool> {
        let user_ctx = require_permission(ctx, "fees.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let valid_modes = ["cash", "upi", "bank_transfer", "cheque", "online"];
        if !valid_modes.contains(&payment_mode.as_str()) {
            return Err(async_graphql::Error::new(
                "Payment mode must be one of: cash, upi, bank_transfer, cheque, online",
            ));
        }

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                sqlx::query(
                    "UPDATE fee_records SET
                        amount_paid = amount_paid + $1,
                        payment_mode = $2,
                        paid_date = CURRENT_DATE,
                        status = CASE
                            WHEN amount_paid + $1 >= amount_due THEN 'paid'
                            ELSE 'partial'
                        END
                     WHERE id = $3::uuid",
                )
                .bind(amount)
                .bind(&payment_mode)
                .bind(&fee_record_id)
                .execute(conn)
                .await?;
                Ok(true)
            })
        })
        .await
        .map_err(|e| e.extend())
    }

    // ── Admission mutations ─────────────────────────────────────────────────

    async fn create_admission(
        &self,
        ctx: &Context<'_>,
        student_name: String,
        guardian_name: String,
        guardian_phone: String,
        guardian_email: Option<String>,
        applied_class: String,
        academic_year: Option<String>,
        notes: Option<String>,
    ) -> Result<AdmissionApplication> {
        let user_ctx = require_permission(ctx, "admissions.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let year = academic_year.unwrap_or_else(|| "2025-26".to_string());

        let record = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, AdmissionApplication>(
                    "INSERT INTO admission_applications
                     (organisation_id, tenant_id, student_name, guardian_name, guardian_phone, guardian_email, applied_class, status, academic_year, notes)
                     VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                             $1, $2, $3, $4, $5, 'submitted', $6, $7)
                     RETURNING id::text, student_name, guardian_name, guardian_phone, guardian_email,
                               applied_class, status, academic_year, notes, submitted_at::text",
                )
                .bind(&student_name)
                .bind(&guardian_name)
                .bind(&guardian_phone)
                .bind(guardian_email.as_deref())
                .bind(&applied_class)
                .bind(&year)
                .bind(notes.as_deref().unwrap_or(""))
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(record)
    }

    async fn update_admission_status(
        &self,
        ctx: &Context<'_>,
        id: String,
        status: String,
    ) -> Result<bool> {
        let user_ctx = require_permission(ctx, "admissions.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let reviewer_id = user_ctx.user_id.clone();

        let valid_statuses = [
            "submitted",
            "under_review",
            "approved",
            "rejected",
            "waitlisted",
        ];
        if !valid_statuses.contains(&status.as_str()) {
            return Err(async_graphql::Error::new(
                "Status must be one of: submitted, under_review, approved, rejected, waitlisted",
            ));
        }

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                sqlx::query(
                    "UPDATE admission_applications SET status = $1, reviewed_by = $2::uuid, reviewed_at = NOW()
                     WHERE id = $3::uuid",
                )
                .bind(&status)
                .bind(&reviewer_id)
                .bind(&id)
                .execute(conn)
                .await?;
                Ok(true)
            })
        })
        .await
        .map_err(|e| e.extend())
    }

    // ── Notice mutations ────────────────────────────────────────────────────

    async fn create_notice(
        &self,
        ctx: &Context<'_>,
        title: String,
        body: String,
        audience: String,
        priority: Option<String>,
        target_classes: Option<String>,
    ) -> Result<Notice> {
        let user_ctx = require_permission(ctx, "notices.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let creator_id = user_ctx.user_id.clone();

        let valid_audiences = ["all", "teachers", "students", "parents", "staff"];
        if !valid_audiences.contains(&audience.as_str()) {
            return Err(async_graphql::Error::new(
                "Audience must be one of: all, teachers, students, parents, staff",
            ));
        }

        let prio = priority.unwrap_or_else(|| "normal".to_string());

        let record = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, Notice>(
                    "WITH ins AS (
                        INSERT INTO notices (organisation_id, tenant_id, title, body, audience, priority, published, created_by, target_classes)
                        VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                                $1, $2, $3, $4, true, $5::uuid, $6)
                        RETURNING *
                     )
                     SELECT ins.id::text, ins.title, ins.body, ins.audience, ins.priority,
                            ins.published, u.name AS created_by_name, ins.created_at::text,
                            ins.target_classes
                     FROM ins JOIN users u ON u.id = ins.created_by",
                )
                .bind(&title)
                .bind(&body)
                .bind(&audience)
                .bind(&prio)
                .bind(&creator_id)
                .bind(&target_classes)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(record)
    }

    async fn update_notice(
        &self,
        ctx: &Context<'_>,
        id: String,
        title: Option<String>,
        body: Option<String>,
        audience: Option<String>,
        priority: Option<String>,
        published: Option<bool>,
    ) -> Result<bool> {
        let user_ctx = require_permission(ctx, "notices.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                if let Some(ref t) = title {
                    sqlx::query("UPDATE notices SET title = $1 WHERE id = $2::uuid")
                        .bind(t)
                        .bind(&id)
                        .execute(&mut *conn)
                        .await?;
                }
                if let Some(ref b) = body {
                    sqlx::query("UPDATE notices SET body = $1 WHERE id = $2::uuid")
                        .bind(b)
                        .bind(&id)
                        .execute(&mut *conn)
                        .await?;
                }
                if let Some(ref a) = audience {
                    sqlx::query("UPDATE notices SET audience = $1 WHERE id = $2::uuid")
                        .bind(a)
                        .bind(&id)
                        .execute(&mut *conn)
                        .await?;
                }
                if let Some(ref p) = priority {
                    sqlx::query("UPDATE notices SET priority = $1 WHERE id = $2::uuid")
                        .bind(p)
                        .bind(&id)
                        .execute(&mut *conn)
                        .await?;
                }
                if let Some(pub_flag) = published {
                    sqlx::query("UPDATE notices SET published = $1 WHERE id = $2::uuid")
                        .bind(pub_flag)
                        .bind(&id)
                        .execute(&mut *conn)
                        .await?;
                }
                Ok(true)
            })
        })
        .await
        .map_err(|e| e.extend())
    }

    // ── Payroll mutations ───────────────────────────────────────────────────

    async fn create_payroll_run(
        &self,
        ctx: &Context<'_>,
        month: i32,
        year: i32,
    ) -> Result<PayrollRun> {
        let user_ctx = require_permission(ctx, "payroll.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let processor_id = user_ctx.user_id.clone();

        if !(1..=12).contains(&month) {
            return Err(async_graphql::Error::new("Month must be between 1 and 12"));
        }

        let record = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                // Create the run
                let run = sqlx::query_as::<_, PayrollRun>(
                    "INSERT INTO payroll_runs (organisation_id, tenant_id, month, year, status, processed_by, processed_at)
                     VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                             $1, $2, 'completed', $3::uuid, NOW())
                     RETURNING id::text, month, year, status, total_gross, total_net, processed_at::text",
                )
                .bind(month)
                .bind(year)
                .bind(&processor_id)
                .fetch_one(&mut *conn)
                .await?;

                // Auto-generate entries from staff_salaries
                let run_uuid = uuid::Uuid::parse_str(&run.id)
                    .map_err(|_| crate::errors::AppError::Validation("Invalid run id".into()))?;

                sqlx::query(
                    "INSERT INTO payroll_entries (payroll_run_id, user_id, basic_pay, allowances, deductions, net_pay)
                     SELECT $1, ss.user_id, ss.basic_pay, ss.allowances, ss.deductions,
                            (ss.basic_pay + ss.allowances - ss.deductions)
                     FROM staff_salaries ss
                     WHERE ss.effective_from <= CURRENT_DATE
                     AND NOT EXISTS (
                         SELECT 1 FROM staff_salaries ss2
                         WHERE ss2.user_id = ss.user_id AND ss2.effective_from > ss.effective_from
                         AND ss2.effective_from <= CURRENT_DATE
                     )",
                )
                .bind(run_uuid)
                .execute(&mut *conn)
                .await?;

                // Update totals
                sqlx::query(
                    "UPDATE payroll_runs SET
                        total_gross = (SELECT COALESCE(SUM(basic_pay + allowances), 0) FROM payroll_entries WHERE payroll_run_id = $1),
                        total_net = (SELECT COALESCE(SUM(net_pay), 0) FROM payroll_entries WHERE payroll_run_id = $1)
                     WHERE id = $1",
                )
                .bind(run_uuid)
                .execute(&mut *conn)
                .await?;

                // Re-fetch with updated totals
                let updated = sqlx::query_as::<_, PayrollRun>(
                    "SELECT id::text, month, year, status, total_gross, total_net, processed_at::text
                     FROM payroll_runs WHERE id = $1",
                )
                .bind(run_uuid)
                .fetch_one(&mut *conn)
                .await?;

                Ok(updated)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(record)
    }

    // ── Assignment mutations ─────────────────────────────────────────────────

    async fn create_assignment(
        &self,
        ctx: &Context<'_>,
        title: String,
        description: String,
        class_name: String,
        subject: Option<String>,
        due_date: Option<String>,
    ) -> Result<Assignment> {
        let user_ctx = require_permission(ctx, "assignments.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let assigner_id = user_ctx.user_id.clone();

        let record = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, Assignment>(
                    "WITH ins AS (
                        INSERT INTO assignments (organisation_id, tenant_id, title, description, class_name, subject, assigned_by, due_date)
                        VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                                $1, $2, $3, $4, $5::uuid, $6::date)
                        RETURNING *
                     )
                     SELECT ins.id::text, ins.title, ins.description, ins.class_name, ins.subject,
                            u.name AS assigned_by_name, ins.due_date::text, ins.created_at::text
                     FROM ins JOIN users u ON u.id = ins.assigned_by",
                )
                .bind(&title)
                .bind(&description)
                .bind(&class_name)
                .bind(subject.as_deref())
                .bind(&assigner_id)
                .bind(due_date.as_deref())
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(record)
    }

    // ── Leave mutations ──────────────────────────────────────────────────────

    async fn apply_leave(
        &self,
        ctx: &Context<'_>,
        leave_type: String,
        start_date: String,
        end_date: String,
        reason: String,
    ) -> Result<LeaveRequest> {
        let user_ctx = require_permission(ctx, "leave.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let uid = user_ctx.user_id.clone();

        let valid_types = ["casual", "sick", "earned", "other"];
        if !valid_types.contains(&leave_type.as_str()) {
            return Err(async_graphql::Error::new(
                "Leave type must be one of: casual, sick, earned, other",
            ));
        }

        let record = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, LeaveRequest>(
                    "WITH ins AS (
                        INSERT INTO leave_requests (organisation_id, tenant_id, user_id, leave_type, start_date, end_date, reason)
                        VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                                $1::uuid, $2, $3::date, $4::date, $5)
                        RETURNING *
                     )
                     SELECT ins.id::text, ins.user_id::text, u.name AS user_name,
                            ins.leave_type, ins.start_date::text, ins.end_date::text,
                            ins.reason, ins.status,
                            NULL::text AS reviewed_by_name, ins.reviewed_at::text,
                            ins.created_at::text, NULL::text AS class_name
                     FROM ins JOIN users u ON u.id = ins.user_id",
                )
                .bind(&uid)
                .bind(&leave_type)
                .bind(&start_date)
                .bind(&end_date)
                .bind(&reason)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(record)
    }

    async fn review_leave(
        &self,
        ctx: &Context<'_>,
        id: String,
        status: String,
    ) -> Result<bool> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let reviewer_id = user_ctx.user_id.clone();

        let valid_statuses = ["approved", "rejected"];
        if !valid_statuses.contains(&status.as_str()) {
            return Err(async_graphql::Error::new(
                "Status must be one of: approved, rejected",
            ));
        }

        let has_manage = user_ctx.system_role == SystemRole::Superadmin
            || user_ctx.permissions.contains("leave.manage");

        // Fetch the leave request to get user_id, start_date, end_date
        let leave_row = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let id = id.clone();
            Box::pin(async move {
                let row = sqlx::query_as::<_, (String, String, String)>(
                    "SELECT user_id::text, start_date::text, end_date::text
                     FROM leave_requests WHERE id = $1::uuid",
                )
                .bind(&id)
                .fetch_optional(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?
        .ok_or_else(|| async_graphql::Error::new("Leave request not found"))?;

        let (leave_user_id, leave_start, leave_end) = leave_row;

        if !has_manage {
            // Check if the reviewer is the class teacher of the student who applied
            let is_class_teacher = execute_in_context(pool, &tenant_id, &org_id, |conn| {
                let reviewer_id = reviewer_id.clone();
                let leave_user_id = leave_user_id.clone();
                Box::pin(async move {
                    let row = sqlx::query_scalar::<_, bool>(
                        "SELECT EXISTS(
                            SELECT 1 FROM students s
                            JOIN teacher_class_assignments tca ON tca.class_name = s.class_name
                                AND tca.user_id = $1::uuid AND tca.is_class_teacher = true
                            WHERE s.user_id = $2::uuid
                        )",
                    )
                    .bind(&reviewer_id)
                    .bind(&leave_user_id)
                    .fetch_one(conn)
                    .await?;
                    Ok(row)
                })
            })
            .await
            .map_err(|e| e.extend())?;

            if !is_class_teacher {
                return Err(async_graphql::Error::new(
                    "Access denied: you are not authorized to review this leave request",
                )
                .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "FORBIDDEN");
                }));
            }
        }

        // Update leave request status
        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let status = status.clone();
            let reviewer_id = reviewer_id.clone();
            let id = id.clone();
            Box::pin(async move {
                sqlx::query(
                    "UPDATE leave_requests SET status = $1, reviewed_by = $2::uuid, reviewed_at = NOW()
                     WHERE id = $3::uuid",
                )
                .bind(&status)
                .bind(&reviewer_id)
                .bind(&id)
                .execute(conn)
                .await?;
                Ok(())
            })
        })
        .await
        .map_err(|e| e.extend())?;

        // Auto-mark attendance as 'leave' when a student leave is approved
        if status == "approved" {
            execute_in_context(pool, &tenant_id, &org_id, |conn| {
                let reviewer_id = reviewer_id.clone();
                let leave_user_id = leave_user_id.clone();
                let leave_start = leave_start.clone();
                let leave_end = leave_end.clone();
                Box::pin(async move {
                    sqlx::query(
                        "INSERT INTO attendance_records (organisation_id, tenant_id, student_id, date, status, marked_by, remarks)
                         SELECT current_setting('app.current_org', true)::uuid,
                                current_setting('app.current_tenant', true)::uuid,
                                s.id, d::date, 'leave', $1::uuid, 'Auto-marked from approved leave'
                         FROM students s, generate_series($2::date, $3::date, '1 day'::interval) d
                         WHERE s.user_id = $4::uuid
                         ON CONFLICT (student_id, date) DO UPDATE
                         SET status = 'leave', marked_by = EXCLUDED.marked_by, remarks = EXCLUDED.remarks",
                    )
                    .bind(&reviewer_id)
                    .bind(&leave_start)
                    .bind(&leave_end)
                    .bind(&leave_user_id)
                    .execute(conn)
                    .await?;
                    Ok(())
                })
            })
            .await
            .map_err(|e| e.extend())?;
        }

        Ok(true)
    }

    // ── Teacher class assignment mutations (admin) ───────────────────────────

    async fn assign_class_to_teacher(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        class_name: String,
        is_class_teacher: Option<bool>,
    ) -> Result<bool> {
        let user_ctx = require_permission(ctx, "users.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let is_ct = is_class_teacher.unwrap_or(false);

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                sqlx::query(
                    "INSERT INTO teacher_class_assignments (organisation_id, tenant_id, user_id, class_name, is_class_teacher)
                     VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                             $1::uuid, $2, $3)
                     ON CONFLICT (user_id, class_name, organisation_id) DO UPDATE SET is_class_teacher = $3",
                )
                .bind(&user_id)
                .bind(&class_name)
                .bind(is_ct)
                .execute(conn)
                .await?;
                Ok(true)
            })
        })
        .await
        .map_err(|e| e.extend())
    }

    async fn remove_class_from_teacher(
        &self,
        ctx: &Context<'_>,
        assignment_id: String,
    ) -> Result<bool> {
        let user_ctx = require_permission(ctx, "users.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                sqlx::query(
                    "DELETE FROM teacher_class_assignments WHERE id = $1::uuid",
                )
                .bind(&assignment_id)
                .execute(conn)
                .await?;
                Ok(true)
            })
        })
        .await
        .map_err(|e| e.extend())
    }

    // ── Password reset (tenant admin) ──────────────────────────────────────

    /// Reset a user's password. Requires tenant_admin or superadmin.
    /// If `new_password` is None, a random password is generated and returned.
    async fn reset_org_admin_password(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        new_password: Option<String>,
    ) -> Result<ResetPasswordResponse> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        if user_ctx.system_role != SystemRole::Superadmin
            && user_ctx.system_role != SystemRole::TenantAdmin
        {
            return Err(async_graphql::Error::new("Access denied")
                .extend_with(|_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "FORBIDDEN");
                }));
        }

        let target_uuid = uuid::Uuid::parse_str(&user_id)
            .map_err(|_| async_graphql::Error::new("Invalid user id"))?;

        // Verify target user belongs to caller's tenant
        if user_ctx.system_role != SystemRole::Superadmin {
            let tenant_uuid = uuid::Uuid::parse_str(&user_ctx.tenant_id)
                .map_err(|_| async_graphql::Error::new("Invalid tenant id"))?;

            let belongs: bool = sqlx::query_scalar(
                "SELECT EXISTS(
                    SELECT 1 FROM users WHERE id = $1 AND tenant_id = $2
                )",
            )
            .bind(target_uuid)
            .bind(tenant_uuid)
            .fetch_one(pool)
            .await
            .map_err(|e| {
                tracing::error!("DB error checking user tenant: {e}");
                async_graphql::Error::new("Internal server error")
            })?;

            if !belongs {
                return Err(async_graphql::Error::new(
                    "User does not belong to your tenant",
                ));
            }
        }

        let (hashed, generated_pw) = match new_password {
            Some(ref p) if !p.is_empty() => {
                if p.len() < 6 {
                    return Err(async_graphql::Error::new(
                        "Password must be at least 6 characters",
                    ));
                }
                let h = bcrypt::hash(p, 12).map_err(|e| {
                    async_graphql::Error::new(format!("Failed to hash password: {e}"))
                })?;
                (h, None)
            }
            _ => {
                let pw = generate_random_password();
                let h = bcrypt::hash(&pw, 12).map_err(|e| {
                    async_graphql::Error::new(format!("Failed to hash password: {e}"))
                })?;
                (h, Some(pw))
            }
        };

        sqlx::query("UPDATE users SET password_hash = $1 WHERE id = $2")
            .bind(&hashed)
            .bind(target_uuid)
            .execute(pool)
            .await
            .map_err(|e| {
                tracing::error!("DB error resetting password: {e}");
                async_graphql::Error::new("Internal server error")
            })?;

        tracing::info!(target_user = %user_id, "Reset user password");
        Ok(ResetPasswordResponse {
            success: true,
            generated_password: generated_pw,
        })
    }
}

/// Verify an organisation belongs to the given tenant. Prevents cross-tenant access.
/// Skipped for superadmin who can access any org.
async fn verify_org_in_tenant(
    pool: &PgPool,
    org_id: &str,
    tenant_id: &str,
    system_role: &SystemRole,
) -> async_graphql::Result<()> {
    if *system_role == SystemRole::Superadmin {
        return Ok(());
    }

    let org_uuid = uuid::Uuid::parse_str(org_id)
        .map_err(|_| async_graphql::Error::new("Invalid organisation id"))?;
    let tenant_uuid = uuid::Uuid::parse_str(tenant_id)
        .map_err(|_| async_graphql::Error::new("Invalid tenant id"))?;

    let belongs: bool = sqlx::query_scalar(
        "SELECT EXISTS(
            SELECT 1 FROM organisations
            WHERE id = $1 AND tenant_id = $2
        )",
    )
    .bind(org_uuid)
    .bind(tenant_uuid)
    .fetch_one(pool)
    .await
    .map_err(|_| async_graphql::Error::new("Internal server error"))?;

    if !belongs {
        return Err(async_graphql::Error::new(
            "Organisation does not belong to your tenant",
        ));
    }

    Ok(())
}

fn validate_slug(slug: &str) -> async_graphql::Result<()> {
    if slug.is_empty() || slug.len() > 50 {
        return Err(async_graphql::Error::new(
            "Slug must be between 1 and 50 characters",
        ));
    }
    if !slug
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '_' || c == '-')
    {
        return Err(async_graphql::Error::new(
            "Slug must only contain lowercase letters, digits, hyphens, and underscores",
        ));
    }
    Ok(())
}

// ── Schema constructor ───────────────────────────────────────────────────────

pub type AppSchema = Schema<QueryRoot, MutationRoot, EmptySubscription>;

pub fn build_schema(pool: PgPool) -> AppSchema {
    Schema::build(QueryRoot, MutationRoot, EmptySubscription)
        .data(pool)
        .finish()
}
