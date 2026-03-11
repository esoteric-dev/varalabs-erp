use async_graphql::{
    Context, EmptySubscription, ErrorExtensions, InputObject, Object, Result, Schema, SimpleObject,
};
use jsonwebtoken::{encode, EncodingKey, Header};
use rand::Rng;
use sqlx::PgPool;
use std::env;

use crate::auth::{
    require_auth, require_permission, require_permission_for_org, Claims, RefreshClaims, SystemRole, UserContext,
};
use crate::db::execute_in_context;

// ── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct Student {
    pub id: String,
    pub name: String,
    pub class_name: String,
    pub gender: Option<String>,
    pub date_of_birth: Option<String>,
    pub blood_group: Option<String>,
    pub religion: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub admission_number: Option<String>,
    pub admission_date: Option<String>,
    pub login_email: Option<String>,
    pub user_id: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct StudentParent {
    pub father_name: Option<String>,
    pub father_phone: Option<String>,
    pub father_occupation: Option<String>,
    pub mother_name: Option<String>,
    pub mother_phone: Option<String>,
    pub mother_occupation: Option<String>,
    pub guardian_name: Option<String>,
    pub guardian_phone: Option<String>,
    pub guardian_relation: Option<String>,
    pub guardian_occupation: Option<String>,
    pub guardian_email: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct StudentAddress {
    pub id: String,
    pub address_type: String,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct StudentMedicalHistory {
    pub allergies: Option<String>,
    pub medications: Option<String>,
    pub past_conditions: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct StudentPreviousSchool {
    pub id: String,
    pub school_name: String,
    pub address: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct OrgSettings {
    pub student_onboarding_config: async_graphql::types::Json<serde_json::Value>,
}

#[derive(Debug, InputObject)]
pub struct AddStudentInput {
    pub name: String,
    pub class_name: String,
    pub gender: Option<String>,
    pub date_of_birth: Option<String>,
    pub blood_group: Option<String>,
    pub religion: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub admission_number: Option<String>,
    pub admission_date: Option<String>,

    // Nested forms
    pub father_name: Option<String>,
    pub father_phone: Option<String>,
    pub father_occupation: Option<String>,
    pub mother_name: Option<String>,
    pub mother_phone: Option<String>,
    pub mother_occupation: Option<String>,
    pub guardian_name: Option<String>,
    pub guardian_phone: Option<String>,
    pub guardian_relation: Option<String>,
    pub guardian_occupation: Option<String>,
    pub guardian_email: Option<String>,

    pub allergies: Option<String>,
    pub medications: Option<String>,
    pub past_conditions: Option<String>,

    pub previous_school_name: Option<String>,
    pub previous_school_address: Option<String>,

    pub current_address: Option<String>,
    pub current_city: Option<String>,
    pub current_state: Option<String>,
    pub current_zip_code: Option<String>,
    pub current_country: Option<String>,

    pub permanent_address: Option<String>,
    pub permanent_city: Option<String>,
    pub permanent_state: Option<String>,
    pub permanent_zip_code: Option<String>,
    pub permanent_country: Option<String>,

    pub custom_data: Option<async_graphql::types::Json<serde_json::Value>>,
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
    pub refresh_token: String,
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
pub struct StaffDetail {
    pub user_id: String,
    pub designation: Option<String>,
    pub department: Option<String>,
    pub qualification: Option<String>,
    pub date_of_birth: Option<String>,
    pub gender: Option<String>,
    pub blood_group: Option<String>,
    pub marital_status: Option<String>,
    pub address: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip_code: Option<String>,
    pub country: Option<String>,
    pub bank_account_name: Option<String>,
    pub bank_account_number: Option<String>,
    pub bank_name: Option<String>,
    pub bank_ifsc: Option<String>,
    pub bank_branch: Option<String>,
    pub date_of_joining: Option<String>,
}

#[derive(Debug, SimpleObject)]
pub struct OnboardStaffResponse {
    pub user: User,
    pub employee_id: String,
    pub generated_password: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct OrgUser {
    pub id: String,
    pub name: String,
    pub email: String,
    pub system_role: String,
    pub phone: Option<String>,
    pub role_names: Option<String>,
    pub employee_id: Option<String>,
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
    // Extended fields for dashboard parity
    pub active_students: i64,
    pub inactive_students: i64,
    pub total_teachers: i64,
    pub active_teachers: i64,
    pub inactive_teachers: i64,
    pub active_staff: i64,
    pub inactive_staff: i64,
    pub total_subjects: i64,
    pub active_subjects: i64,
    pub inactive_subjects: i64,
    pub fees_fine: i64,
    pub fees_outstanding: i64,
    pub attendance_today_late: i64,
    pub total_earnings: i64,
    pub total_expenses: i64,
}

// ── Dashboard Feature Types ─────────────────────────────────────────────────

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct Event {
    pub id: String,
    pub title: String,
    pub description: Option<String>,
    pub event_date: String,
    pub end_date: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, InputObject)]
pub struct CreateEventInput {
    pub title: String,
    pub description: Option<String>,
    pub event_date: String,
    pub end_date: Option<String>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct Subject {
    pub id: String,
    pub name: String,
    pub class_name: Option<String>,
    pub status: String,
}

#[derive(Debug, InputObject)]
pub struct CreateSubjectInput {
    pub name: String,
    pub class_name: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct StudentActivity {
    pub id: String,
    pub student_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub activity_date: String,
}

#[derive(Debug, InputObject)]
pub struct CreateStudentActivityInput {
    pub student_id: Option<String>,
    pub title: String,
    pub description: Option<String>,
    pub activity_date: Option<String>,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct AdminTodo {
    pub id: String,
    pub title: String,
    pub due_time: Option<String>,
    pub status: String,
}

#[derive(Debug, InputObject)]
pub struct CreateAdminTodoInput {
    pub title: String,
    pub due_time: Option<String>,
}

#[derive(Debug, InputObject)]
pub struct UpdateAdminTodoInput {
    pub id: String,
    pub status: String,
}

// ── Dashboard V2 Types ──────────────────────────────────────────────────────

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct AttendanceSummary {
    pub student_present: i64,
    pub student_absent: i64,
    pub student_late: i64,
    pub student_total: i64,
    pub teacher_present: i64,
    pub teacher_absent: i64,
    pub teacher_late: i64,
    pub teacher_total: i64,
    pub staff_present: i64,
    pub staff_absent: i64,
    pub staff_late: i64,
    pub staff_total: i64,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct ClassRoutine {
    pub id: String,
    pub teacher_id: String,
    pub teacher_name: String,
    pub class_name: String,
    pub section: Option<String>,
    pub day_of_week: String,
    pub start_time: String,
    pub end_time: String,
    pub room: Option<String>,
    pub subject_name: Option<String>,
    pub status: String,
}

#[derive(Debug, InputObject)]
pub struct CreateClassRoutineInput {
    pub teacher_id: String,
    pub class_name: String,
    pub section: Option<String>,
    pub day_of_week: String,
    pub start_time: String,
    pub end_time: String,
    pub room: Option<String>,
    pub subject_name: Option<String>,
}

#[derive(Debug, SimpleObject)]
pub struct ClassPerformance {
    pub class_name: String,
    pub top_count: i64,
    pub average_count: i64,
    pub below_average_count: i64,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct BestPerformer {
    pub user_id: String,
    pub name: String,
    pub role: String,
    pub class_name: Option<String>,
    pub metric_label: String,
    pub metric_value: String,
}

#[derive(Debug, SimpleObject, sqlx::FromRow)]
pub struct SubjectProgress {
    pub subject_name: String,
    pub class_name: Option<String>,
    pub student_count: i64,
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
    pub refresh_token: String,
    pub user: User,
    pub tenant_id: String,
}

#[derive(Debug, SimpleObject)]
pub struct RefreshTokenResponse {
    pub token: String,
    pub refresh_token: String,
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

#[derive(Debug, SimpleObject)]
pub struct AddStudentResponse {
    pub student: Student,
    pub generated_email: String,
    pub generated_password: String,
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
                    "SELECT s.id::text, s.name, s.class_name, s.gender, s.date_of_birth::text, s.blood_group, s.religion, s.email, s.phone, s.admission_number, s.admission_date::text, u.email AS login_email, s.user_id::text FROM students s LEFT JOIN users u ON u.id = s.user_id",
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

    /// Get the organisation's student onboarding configuration.
    async fn get_onboarding_config(&self, ctx: &Context<'_>) -> Result<OrgSettings> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        tracing::info!(
            tenant_id = %tenant_id,
            org_id = %org_id,
            "GraphQL query: get_onboarding_config"
        );

        let inner_org = org_id.clone();
        let config: Option<serde_json::Value> = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row: Option<serde_json::Value> = sqlx::query_scalar(
                    "SELECT student_onboarding_config FROM organisation_settings WHERE organisation_id = $1::uuid",
                )
                .bind(&inner_org)
                .fetch_optional(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching onboarding config: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        let student_onboarding_config = async_graphql::types::Json(
            config.unwrap_or_else(|| serde_json::json!({}))
        );

        Ok(OrgSettings {
            student_onboarding_config
        })
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
                    "SELECT s.id::text, s.name, s.class_name, s.gender, s.date_of_birth::text, s.blood_group, s.religion, s.email, s.phone, s.admission_number, s.admission_date::text, u.email AS login_email, s.user_id::text FROM students s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = $1::uuid",
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
                    "SELECT s.id::text, s.name, s.class_name, s.gender, s.date_of_birth::text, s.blood_group, s.religion, s.email, s.phone, s.admission_number, s.admission_date::text, u.email AS login_email, s.user_id::text FROM students s LEFT JOIN users u ON u.id = s.user_id WHERE s.user_id = $1::uuid",
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

    /// Peek at the next admission number without consuming the sequence.
    async fn next_admission_number(&self, ctx: &Context<'_>) -> Result<String> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        let year = chrono::Utc::now().format("%Y").to_string();
        let current_seq: Option<i32> = sqlx::query_scalar(
            "SELECT admission_seq FROM organisation_settings WHERE organisation_id = $1::uuid",
        )
        .bind(&user_ctx.org_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error peeking admission seq: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        let next_seq = current_seq.unwrap_or(0) + 1;
        Ok(format!("ADM-{}-{:04}", year, next_seq))
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

    /// Get the current user's employee ID in the current organisation.
    async fn my_employee_id(&self, ctx: &Context<'_>) -> Result<Option<String>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;

        if user_ctx.org_id.is_empty() {
            return Ok(None);
        }

        let user_uuid = uuid::Uuid::parse_str(&user_ctx.user_id)
            .map_err(|_| async_graphql::Error::new("Invalid user id"))?;
        let org_uuid = uuid::Uuid::parse_str(&user_ctx.org_id)
            .map_err(|_| async_graphql::Error::new("Invalid org id"))?;

        let employee_id: Option<String> = sqlx::query_scalar(
            "SELECT employee_id FROM user_organisations WHERE user_id = $1 AND organisation_id = $2",
        )
        .bind(user_uuid)
        .bind(org_uuid)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching employee id: {e}");
            async_graphql::Error::new("Internal server error")
        })?
        .flatten();

        Ok(employee_id)
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

    /// Get staff details for a specific user.
    async fn staff_detail(&self, ctx: &Context<'_>, user_id: String) -> Result<Option<StaffDetail>> {
        let user_ctx = require_permission(ctx, "users.view")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let detail = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let uid = user_id.clone();
            Box::pin(async move {
                let row = sqlx::query_as::<_, StaffDetail>(
                    "SELECT user_id::text, designation, department, qualification,
                            date_of_birth::text, gender, blood_group, marital_status,
                            address, city, state, zip_code, country,
                            bank_account_name, bank_account_number, bank_name, bank_ifsc, bank_branch,
                            date_of_joining::text
                     FROM staff_details WHERE user_id = $1::uuid",
                )
                .bind(&uid)
                .fetch_optional(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(detail)
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
                    STRING_AGG(r.name, ', ' ORDER BY r.name) AS role_names,
                    uo.employee_id
             FROM user_organisations uo
             JOIN users u ON u.id = uo.user_id
             LEFT JOIN user_org_roles uor ON uor.user_id = u.id AND uor.organisation_id = uo.organisation_id
             LEFT JOIN roles r ON r.id = uor.role_id
             WHERE uo.organisation_id = $1
             GROUP BY u.id, u.name, u.email, u.system_role, u.phone, uo.employee_id
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
                        (SELECT COUNT(*) FROM notices WHERE published = true)::bigint AS active_notices,
                        -- Extended counts
                        (SELECT COUNT(*) FROM students)::bigint AS active_students,
                        0::bigint AS inactive_students,
                        (SELECT COUNT(DISTINCT uo.user_id) FROM user_organisations uo
                         JOIN users u ON u.id = uo.user_id
                         WHERE uo.organisation_id = current_setting('app.current_org', true)::uuid
                         AND u.system_role = 'teacher')::bigint AS total_teachers,
                        (SELECT COUNT(DISTINCT uo.user_id) FROM user_organisations uo
                         JOIN users u ON u.id = uo.user_id
                         WHERE uo.organisation_id = current_setting('app.current_org', true)::uuid
                         AND u.system_role = 'teacher')::bigint AS active_teachers,
                        0::bigint AS inactive_teachers,
                        (SELECT COUNT(DISTINCT uo.user_id) FROM user_organisations uo
                         WHERE uo.organisation_id = current_setting('app.current_org', true)::uuid)::bigint AS active_staff,
                        0::bigint AS inactive_staff,
                        (SELECT COUNT(*) FROM subjects)::bigint AS total_subjects,
                        (SELECT COUNT(*) FROM subjects WHERE status = 'active')::bigint AS active_subjects,
                        (SELECT COUNT(*) FROM subjects WHERE status = 'inactive')::bigint AS inactive_subjects,
                        0::bigint AS fees_fine,
                        (SELECT COALESCE(SUM(amount_due), 0) FROM fee_records WHERE status IN ('pending','partial','overdue'))::bigint AS fees_outstanding,
                        (SELECT COUNT(*) FROM attendance_records WHERE date = CURRENT_DATE AND status = 'late')::bigint AS attendance_today_late,
                        (SELECT COALESCE(SUM(amount_paid), 0) FROM fee_records WHERE status = 'paid')::bigint AS total_earnings,
                        COALESCE((SELECT SUM(pe.net_pay)::bigint FROM payroll_entries pe JOIN payroll_runs pr ON pr.id = pe.payroll_run_id WHERE pr.status = 'processed'), 0)::bigint AS total_expenses",
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

    // ── Dashboard Queries ────────────────────────────────────────────────────

    async fn events(&self, ctx: &Context<'_>) -> Result<Vec<Event>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, Event>(
                    "SELECT id::text, title, description, event_date::text, end_date::text, start_time, end_time
                     FROM events ORDER BY event_date ASC LIMIT 20",
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

    async fn subjects(&self, ctx: &Context<'_>) -> Result<Vec<Subject>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, Subject>(
                    "SELECT id::text, name, class_name, status FROM subjects ORDER BY name",
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

    async fn student_activities(&self, ctx: &Context<'_>) -> Result<Vec<StudentActivity>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, StudentActivity>(
                    "SELECT id::text, student_id::text, title, description, activity_date::text
                     FROM student_activities ORDER BY activity_date DESC LIMIT 10",
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

    async fn admin_todos(&self, ctx: &Context<'_>) -> Result<Vec<AdminTodo>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, AdminTodo>(
                    "SELECT id::text, title, due_time, status FROM admin_todos ORDER BY created_at DESC LIMIT 20",
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

    async fn get_classes(&self, ctx: &Context<'_>) -> Result<Vec<String>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let inner_org = org_id.clone();

        let classes_json: Option<serde_json::Value> = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row: Option<serde_json::Value> = sqlx::query_scalar(
                    "SELECT classes FROM organisation_settings WHERE organisation_id = $1::uuid",
                )
                .bind(&inner_org)
                .fetch_optional(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        let classes: Vec<String> = classes_json
            .and_then(|v| serde_json::from_value(v).ok())
            .unwrap_or_default();
        Ok(classes)
    }

    // ── Dashboard V2 Queries ────────────────────────────────────────────────

    /// Get attendance breakdown by role (student/teacher/staff) with optional period filter.
    async fn attendance_summary(
        &self,
        ctx: &Context<'_>,
        period: Option<String>,
    ) -> Result<AttendanceSummary> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let period_val = period.unwrap_or_else(|| "today".to_string());
        let date_filter = match period_val.as_str() {
            "this_week" => "date >= date_trunc('week', CURRENT_DATE) AND date <= CURRENT_DATE",
            "last_week" => "date >= date_trunc('week', CURRENT_DATE) - interval '7 days' AND date < date_trunc('week', CURRENT_DATE)",
            _ => "date = CURRENT_DATE",
        };

        let summary = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let df = date_filter.to_string();
            Box::pin(async move {
                let query = format!(
                    "SELECT
                        (SELECT COUNT(*) FROM attendance_records WHERE {df} AND status = 'present')::bigint AS student_present,
                        (SELECT COUNT(*) FROM attendance_records WHERE {df} AND status = 'absent')::bigint AS student_absent,
                        (SELECT COUNT(*) FROM attendance_records WHERE {df} AND status = 'late')::bigint AS student_late,
                        (SELECT COUNT(*) FROM students)::bigint AS student_total,
                        COALESCE((SELECT COUNT(*) FROM staff_attendance sa JOIN users u ON u.id = sa.user_id WHERE sa.{df} AND sa.status = 'present' AND u.system_role = 'teacher'), 0)::bigint AS teacher_present,
                        COALESCE((SELECT COUNT(*) FROM staff_attendance sa JOIN users u ON u.id = sa.user_id WHERE sa.{df} AND sa.status = 'absent' AND u.system_role = 'teacher'), 0)::bigint AS teacher_absent,
                        COALESCE((SELECT COUNT(*) FROM staff_attendance sa JOIN users u ON u.id = sa.user_id WHERE sa.{df} AND sa.status = 'late' AND u.system_role = 'teacher'), 0)::bigint AS teacher_late,
                        COALESCE((SELECT COUNT(*) FROM staff_attendance sa JOIN users u ON u.id = sa.user_id WHERE sa.{df} AND u.system_role = 'teacher'), 0)::bigint AS teacher_total,
                        COALESCE((SELECT COUNT(*) FROM staff_attendance sa JOIN users u ON u.id = sa.user_id WHERE sa.{df} AND sa.status = 'present' AND u.system_role != 'teacher'), 0)::bigint AS staff_present,
                        COALESCE((SELECT COUNT(*) FROM staff_attendance sa JOIN users u ON u.id = sa.user_id WHERE sa.{df} AND sa.status = 'absent' AND u.system_role != 'teacher'), 0)::bigint AS staff_absent,
                        COALESCE((SELECT COUNT(*) FROM staff_attendance sa JOIN users u ON u.id = sa.user_id WHERE sa.{df} AND sa.status = 'late' AND u.system_role != 'teacher'), 0)::bigint AS staff_late,
                        COALESCE((SELECT COUNT(*) FROM staff_attendance sa JOIN users u ON u.id = sa.user_id WHERE sa.{df} AND u.system_role != 'teacher'), 0)::bigint AS staff_total",
                    df = df
                );
                let row = sqlx::query_as::<_, AttendanceSummary>(&query)
                    .fetch_one(conn)
                    .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(summary)
    }

    /// Get class routines, optionally filtered by class name.
    async fn class_routines(
        &self,
        ctx: &Context<'_>,
        class_name: Option<String>,
    ) -> Result<Vec<ClassRoutine>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let cn = class_name.clone();
            Box::pin(async move {
                let rows = match cn {
                    Some(ref c) => {
                        sqlx::query_as::<_, ClassRoutine>(
                            "SELECT cr.id::text, cr.teacher_id::text,
                                    u.name AS teacher_name,
                                    cr.class_name, cr.section, cr.day_of_week,
                                    cr.start_time, cr.end_time, cr.room, cr.subject_name, cr.status
                             FROM class_routines cr
                             JOIN users u ON u.id = cr.teacher_id
                             WHERE cr.class_name = $1
                             ORDER BY cr.day_of_week, cr.start_time",
                        )
                        .bind(c)
                        .fetch_all(conn)
                        .await?
                    }
                    None => {
                        sqlx::query_as::<_, ClassRoutine>(
                            "SELECT cr.id::text, cr.teacher_id::text,
                                    u.name AS teacher_name,
                                    cr.class_name, cr.section, cr.day_of_week,
                                    cr.start_time, cr.end_time, cr.room, cr.subject_name, cr.status
                             FROM class_routines cr
                             JOIN users u ON u.id = cr.teacher_id
                             ORDER BY cr.day_of_week, cr.start_time
                             LIMIT 20",
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

    /// Get performance aggregation for a class (top/average/below-average student counts).
    async fn class_performance(
        &self,
        ctx: &Context<'_>,
        class_name: Option<String>,
    ) -> Result<ClassPerformance> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let cn = class_name.unwrap_or_else(|| "all".to_string());

        let perf = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let class_val = cn.clone();
            Box::pin(async move {
                // Use attendance rate as a proxy for performance
                // >90% = top, 60-90% = average, <60% = below average
                let class_filter = if class_val == "all" {
                    "1=1".to_string()
                } else {
                    format!("s.class_name = '{}'", class_val.replace('\'', "''"))
                };

                let query = format!(
                    "WITH student_attendance AS (
                        SELECT s.id,
                               COUNT(CASE WHEN ar.status = 'present' THEN 1 END)::float AS present_days,
                               GREATEST(COUNT(ar.id), 1)::float AS total_days
                        FROM students s
                        LEFT JOIN attendance_records ar ON ar.student_id = s.id
                        WHERE {class_filter}
                        GROUP BY s.id
                    )
                    SELECT
                        COUNT(CASE WHEN present_days / total_days >= 0.9 THEN 1 END)::bigint AS top_count,
                        COUNT(CASE WHEN present_days / total_days >= 0.6 AND present_days / total_days < 0.9 THEN 1 END)::bigint AS average_count,
                        COUNT(CASE WHEN present_days / total_days < 0.6 THEN 1 END)::bigint AS below_average_count
                    FROM student_attendance",
                    class_filter = class_filter
                );

                #[derive(sqlx::FromRow)]
                struct PerfRow {
                    top_count: i64,
                    average_count: i64,
                    below_average_count: i64,
                }

                let row = sqlx::query_as::<_, PerfRow>(&query)
                    .fetch_one(conn)
                    .await?;
                Ok(ClassPerformance {
                    class_name: class_val,
                    top_count: row.top_count,
                    average_count: row.average_count,
                    below_average_count: row.below_average_count,
                })
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(perf)
    }

    /// Get top subjects with student count, optionally filtered by class.
    async fn top_subjects(
        &self,
        ctx: &Context<'_>,
        class_name: Option<String>,
    ) -> Result<Vec<SubjectProgress>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let rows = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let cn = class_name.clone();
            Box::pin(async move {
                let rows = match cn {
                    Some(ref c) => {
                        sqlx::query_as::<_, SubjectProgress>(
                            "SELECT s.name AS subject_name, s.class_name,
                                    (SELECT COUNT(*) FROM students st WHERE st.class_name = s.class_name)::bigint AS student_count
                             FROM subjects s
                             WHERE s.status = 'active' AND s.class_name = $1
                             ORDER BY student_count DESC
                             LIMIT 7",
                        )
                        .bind(c)
                        .fetch_all(conn)
                        .await?
                    }
                    None => {
                        sqlx::query_as::<_, SubjectProgress>(
                            "SELECT s.name AS subject_name, s.class_name,
                                    (SELECT COUNT(*) FROM students st WHERE st.class_name = s.class_name)::bigint AS student_count
                             FROM subjects s
                             WHERE s.status = 'active'
                             ORDER BY student_count DESC
                             LIMIT 7",
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

    /// Get best performers (top teacher and star students).
    async fn best_performers(&self, ctx: &Context<'_>) -> Result<Vec<BestPerformer>> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let performers = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let rows = sqlx::query_as::<_, BestPerformer>(
                    "(SELECT u.id::text AS user_id, u.name, 'teacher' AS role,
                            NULL::text AS class_name,
                            'Most Active Teacher' AS metric_label,
                            COUNT(cr.id)::text AS metric_value
                     FROM users u
                     JOIN class_routines cr ON cr.teacher_id = u.id
                     WHERE u.system_role = 'teacher'
                     GROUP BY u.id, u.name
                     ORDER BY COUNT(cr.id) DESC
                     LIMIT 1)
                    UNION ALL
                    (SELECT s.student_id::text AS user_id, st.name, 'student' AS role,
                            st.class_name,
                            'Highest Attendance' AS metric_label,
                            ROUND(COUNT(CASE WHEN s.status = 'present' THEN 1 END)::numeric * 100 / GREATEST(COUNT(s.id), 1), 1)::text || '%' AS metric_value
                     FROM attendance_records s
                     JOIN students st ON st.id = s.student_id
                     GROUP BY s.student_id, st.name, st.class_name
                     ORDER BY COUNT(CASE WHEN s.status = 'present' THEN 1 END)::float / GREATEST(COUNT(s.id), 1) DESC
                     LIMIT 1)",
                )
                .fetch_all(conn)
                .await?;
                Ok(rows)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(performers)
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

        let refresh_exp = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::days(7))
            .map(|t| t.timestamp() as usize)
            .unwrap_or(0);

        let refresh_claims = RefreshClaims {
            sub: user_row.id.clone(),
            token_type: "refresh".to_string(),
            exp: refresh_exp,
        };

        let refresh_token = encode(
            &Header::default(),
            &refresh_claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .map_err(|e| async_graphql::Error::new(format!("Failed to create refresh token: {e}")))?;

        let user = User {
            id: user_row.id,
            name: user_row.name,
            email: user_row.email,
            system_role: user_row.system_role,
            phone: user_row.phone,
        };

        Ok(LoginResponse {
            token,
            refresh_token,
            user,
        })
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

        let refresh_exp = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::days(7))
            .map(|t| t.timestamp() as usize)
            .unwrap_or(0);

        let refresh_claims = RefreshClaims {
            sub: user.id.clone(),
            token_type: "refresh".to_string(),
            exp: refresh_exp,
        };

        let refresh_token = encode(
            &Header::default(),
            &refresh_claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .map_err(|e| async_graphql::Error::new(format!("Failed to create refresh token: {e}")))?;

        tracing::info!(user_id = %user.id, tenant_id = %tenant_id, "Signup completed (tenant created, no org yet)");
        Ok(SignupResponse {
            token,
            refresh_token,
            user,
            tenant_id,
        })
    }

    // ── Refresh Token ────────────────────────────────────────────────────────

    /// Exchange a valid refresh token for a new access token and a new refresh token.
    async fn refresh_token(
        &self,
        ctx: &Context<'_>,
        refresh_token: String,
        org_slug: Option<String>,
    ) -> Result<RefreshTokenResponse> {
        let pool = ctx.data::<PgPool>()?;

        let secret = env::var("JWT_SECRET").unwrap_or_else(|_| "dev-secret".into());
        let decoding_key = jsonwebtoken::DecodingKey::from_secret(secret.as_bytes());

        // Decode and validate the refresh token
        let token_data = jsonwebtoken::decode::<RefreshClaims>(
            &refresh_token,
            &decoding_key,
            &jsonwebtoken::Validation::default(),
        )
        .map_err(|e| {
            tracing::warn!("Failed to decode refresh token: {e}");
            async_graphql::Error::new("Invalid or expired refresh token").extend_with(
                |_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "UNAUTHENTICATED");
                },
            )
        })?;

        let claims = token_data.claims;
        if claims.token_type != "refresh" {
            return Err(async_graphql::Error::new("Invalid token type").extend_with(
                |_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "UNAUTHENTICATED");
                },
            ));
        }

        let user_id = claims.sub;

        // Fetch user from DB to ensure they still exist and get updated info
        let user_row = sqlx::query_as::<_, UserWithPassword>(
            "SELECT id::text, name, email, system_role, phone, password_hash FROM users WHERE id = $1::uuid",
        )
        .bind(&user_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching user during refresh: {e}");
            async_graphql::Error::new("Internal server error")
        })?
        .ok_or_else(|| {
            async_graphql::Error::new("User no longer exists").extend_with(
                |_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "UNAUTHENTICATED");
                },
            )
        })?;

        // Resolve org: exactly identical logic as in login
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
            let email_slug = extract_slug_from_email(&user_row.email);
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

        let (final_org_id, final_tenant_id) = match org_tenant {
            Some(ot) => (ot.org_id, ot.tenant_id),
            None => {
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

        // Generate new access token
        let access_exp = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::hours(24))
            .map(|t| t.timestamp() as usize)
            .unwrap_or(0);

        let access_claims = Claims {
            sub: user_row.id.clone(),
            tenant_id: final_tenant_id,
            org_id: final_org_id,
            system_role: user_row.system_role.clone(),
            exp: access_exp,
        };

        let new_access_token = jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &access_claims,
            &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
        )
        .map_err(|e| async_graphql::Error::new(format!("Failed to create token: {e}")))?;

        // Generate new refresh token
        let new_refresh_exp = chrono::Utc::now()
            .checked_add_signed(chrono::Duration::days(7))
            .map(|t| t.timestamp() as usize)
            .unwrap_or(0);

        let new_refresh_claims = RefreshClaims {
            sub: user_row.id.clone(),
            token_type: "refresh".to_string(),
            exp: new_refresh_exp,
        };

        let new_refresh_token = jsonwebtoken::encode(
            &jsonwebtoken::Header::default(),
            &new_refresh_claims,
            &jsonwebtoken::EncodingKey::from_secret(secret.as_bytes()),
        )
        .map_err(|e| async_graphql::Error::new(format!("Failed to create refresh token: {e}")))?;

        tracing::info!(user_id = %user_row.id, "Refresh token exchanged successfully");

        Ok(RefreshTokenResponse {
            token: new_access_token,
            refresh_token: new_refresh_token,
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
                     RETURNING id::text, name, class_name, gender, date_of_birth::text, blood_group, religion, email, phone, admission_number, admission_date::text, NULL::text AS login_email, user_id::text",
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

        // Auto-generate employee ID
        let year = chrono::Utc::now().format("%Y").to_string();
        let next_seq: i32 = sqlx::query_scalar(
            "INSERT INTO organisation_settings (organisation_id, tenant_id, employee_seq)
             VALUES ($1, $2, 1)
             ON CONFLICT (organisation_id)
             DO UPDATE SET employee_seq = organisation_settings.employee_seq + 1
             RETURNING employee_seq",
        )
        .bind(org_uuid)
        .bind(tenant_uuid)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error getting employee seq: {e}");
            async_graphql::Error::new("Internal server error")
        })?;
        let employee_id = format!("EMP-{}-{:04}", year, next_seq);

        sqlx::query(
            "INSERT INTO user_organisations (user_id, organisation_id, employee_id)
             VALUES ($1, $2, $3)",
        )
        .bind(user_uuid)
        .bind(org_uuid)
        .bind(&employee_id)
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

    /// Onboard a new staff member with extended details, optional salary, and employee ID.
    async fn onboard_staff(
        &self,
        ctx: &Context<'_>,
        name: String,
        email: String,
        phone: Option<String>,
        password: Option<String>,
        designation: Option<String>,
        department: Option<String>,
        qualification: Option<String>,
        date_of_birth: Option<String>,
        gender: Option<String>,
        blood_group: Option<String>,
        marital_status: Option<String>,
        address: Option<String>,
        city: Option<String>,
        state: Option<String>,
        zip_code: Option<String>,
        country: Option<String>,
        bank_account_name: Option<String>,
        bank_account_number: Option<String>,
        bank_name: Option<String>,
        bank_ifsc: Option<String>,
        bank_branch: Option<String>,
        date_of_joining: Option<String>,
        basic_pay: Option<i64>,
        allowances: Option<i64>,
        deductions: Option<i64>,
    ) -> Result<OnboardStaffResponse> {
        let user_ctx = require_permission(ctx, "users.manage")?;
        let pool = ctx.data::<PgPool>()?;

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

        // 1. Create user
        let user = sqlx::query_as::<_, User>(
            "INSERT INTO users (name, email, password_hash, system_role, phone, tenant_id)
             VALUES ($1, $2, $3, 'user', $4, $5)
             RETURNING id::text, name, email, system_role, phone",
        )
        .bind(&name)
        .bind(&email)
        .bind(&hashed)
        .bind(phone.as_deref())
        .bind(tenant_uuid)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| match &e {
            sqlx::Error::Database(db_err) if db_err.is_unique_violation() => {
                async_graphql::Error::new(format!("A user with email '{}' already exists", email))
            }
            _ => {
                tracing::error!("DB error creating user: {e}");
                async_graphql::Error::new("Internal server error")
            }
        })?;

        let user_uuid = uuid::Uuid::parse_str(&user.id)
            .map_err(|_| async_graphql::Error::new("Invalid user id"))?;

        // 2. Generate employee ID
        let year = chrono::Utc::now().format("%Y").to_string();
        let next_seq: i32 = sqlx::query_scalar(
            "INSERT INTO organisation_settings (organisation_id, tenant_id, employee_seq)
             VALUES ($1, $2, 1)
             ON CONFLICT (organisation_id)
             DO UPDATE SET employee_seq = organisation_settings.employee_seq + 1
             RETURNING employee_seq",
        )
        .bind(org_uuid)
        .bind(tenant_uuid)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error getting employee seq: {e}");
            async_graphql::Error::new("Internal server error")
        })?;
        let employee_id = format!("EMP-{}-{:04}", year, next_seq);

        // 3. Link user to org
        sqlx::query(
            "INSERT INTO user_organisations (user_id, organisation_id, employee_id)
             VALUES ($1, $2, $3)",
        )
        .bind(user_uuid)
        .bind(org_uuid)
        .bind(&employee_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error linking user to org: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // 4. Create staff details
        sqlx::query(
            "INSERT INTO staff_details (user_id, tenant_id, organisation_id,
                designation, department, qualification, date_of_birth, gender, blood_group,
                marital_status, address, city, state, zip_code, country,
                bank_account_name, bank_account_number, bank_name, bank_ifsc, bank_branch,
                date_of_joining)
             VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8, $9, $10,
                     $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21::date)",
        )
        .bind(user_uuid)
        .bind(tenant_uuid)
        .bind(org_uuid)
        .bind(designation.as_deref())
        .bind(department.as_deref())
        .bind(qualification.as_deref())
        .bind(date_of_birth.as_deref())
        .bind(gender.as_deref())
        .bind(blood_group.as_deref())
        .bind(marital_status.as_deref())
        .bind(address.as_deref())
        .bind(city.as_deref())
        .bind(state.as_deref())
        .bind(zip_code.as_deref())
        .bind(country.as_deref().unwrap_or("India"))
        .bind(bank_account_name.as_deref())
        .bind(bank_account_number.as_deref())
        .bind(bank_name.as_deref())
        .bind(bank_ifsc.as_deref())
        .bind(bank_branch.as_deref())
        .bind(date_of_joining.as_deref())
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error creating staff details: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // 5. Optionally set salary
        if let Some(bp) = basic_pay {
            let eff = date_of_joining.as_deref().unwrap_or(&chrono::Utc::now().format("%Y-%m-%d").to_string()).to_string();
            sqlx::query(
                "INSERT INTO staff_salaries (organisation_id, tenant_id, user_id, basic_pay, allowances, deductions, effective_from)
                 VALUES ($1, $2, $3, $4, $5, $6, $7::date)",
            )
            .bind(org_uuid)
            .bind(tenant_uuid)
            .bind(user_uuid)
            .bind(bp)
            .bind(allowances.unwrap_or(0))
            .bind(deductions.unwrap_or(0))
            .bind(&eff)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error creating staff salary: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        }

        tx.commit().await.map_err(|e| {
            async_graphql::Error::new(format!("DB error: {e}"))
        })?;

        tracing::info!(user_id = %user.id, email = %email, employee_id = %employee_id, "Onboarded staff");
        Ok(OnboardStaffResponse {
            user,
            employee_id,
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

    /// Assign a fee structure to all students in a class, creating fee_records for each.
    async fn assign_fee_to_class(
        &self,
        ctx: &Context<'_>,
        fee_structure_id: String,
        class_name: String,
        due_date: Option<String>,
    ) -> Result<i32> {
        let user_ctx = require_permission(ctx, "fees.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let count = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let fs_id = fee_structure_id.clone();
            let cn = class_name.clone();
            let dd = due_date.clone();
            Box::pin(async move {
                let result = sqlx::query_scalar::<_, i64>(
                    "WITH inserted AS (
                        INSERT INTO fee_records (organisation_id, tenant_id, student_id, fee_structure_id, amount_due, status, due_date)
                        SELECT
                            current_setting('app.current_org', true)::uuid,
                            current_setting('app.current_tenant', true)::uuid,
                            s.id,
                            $1::uuid,
                            fs.amount,
                            'pending',
                            COALESCE($3::date, (CURRENT_DATE + interval '30 days')::date)
                        FROM students s
                        CROSS JOIN fee_structures fs
                        WHERE s.class_name = $2
                          AND fs.id = $1::uuid
                          AND NOT EXISTS (
                              SELECT 1 FROM fee_records fr
                              WHERE fr.student_id = s.id AND fr.fee_structure_id = $1::uuid
                          )
                        RETURNING 1
                    )
                    SELECT COUNT(*)::bigint FROM inserted",
                )
                .bind(&fs_id)
                .bind(&cn)
                .bind(dd.as_deref())
                .fetch_one(conn)
                .await?;
                Ok(result as i32)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(count)
    }

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

    /// Set or update a staff member's salary record.
    async fn set_staff_salary(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        basic_pay: i64,
        allowances: i64,
        deductions: i64,
        effective_from: Option<String>,
    ) -> Result<bool> {
        let user_ctx = require_permission(ctx, "payroll.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let eff = effective_from.unwrap_or_else(|| chrono::Utc::now().format("%Y-%m-%d").to_string());

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let uid = user_id.clone();
            let eff_date = eff.clone();
            Box::pin(async move {
                sqlx::query(
                    "INSERT INTO staff_salaries (organisation_id, tenant_id, user_id, basic_pay, allowances, deductions, effective_from)
                     VALUES (current_setting('app.current_org', true)::uuid, current_setting('app.current_tenant', true)::uuid,
                             $1::uuid, $2, $3, $4, $5::date)
                     ON CONFLICT (user_id, effective_from)
                     DO UPDATE SET basic_pay = $2, allowances = $3, deductions = $4",
                )
                .bind(&uid)
                .bind(basic_pay)
                .bind(allowances)
                .bind(deductions)
                .bind(&eff_date)
                .execute(conn)
                .await?;
                Ok(true)
            })
        })
        .await
        .map_err(|e| e.extend())
    }

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
                // If marking as class teacher, first clear any existing class teacher
                // assignment for this user (a teacher can only be class teacher of one class)
                if is_ct {
                    sqlx::query(
                        "UPDATE teacher_class_assignments SET is_class_teacher = false
                         WHERE user_id = $1::uuid AND is_class_teacher = true",
                    )
                    .bind(&user_id)
                    .execute(&mut *conn)
                    .await?;
                }

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

    /// Reset the password of any user in the caller's organisation.
    async fn reset_user_password(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        new_password: Option<String>,
    ) -> Result<ResetPasswordResponse> {
        let user_ctx = require_permission(ctx, "users.manage")?;
        let pool = ctx.data::<PgPool>()?;

        let target_uuid = uuid::Uuid::parse_str(&user_id)
            .map_err(|_| async_graphql::Error::new("Invalid user id"))?;

        let org_uuid = uuid::Uuid::parse_str(&user_ctx.org_id)
            .map_err(|_| async_graphql::Error::new("Invalid org id"))?;

        // Verify target user belongs to caller's organisation
        let belongs: bool = sqlx::query_scalar(
            "SELECT EXISTS(
                SELECT 1 FROM user_organisations WHERE user_id = $1 AND organisation_id = $2
            )",
        )
        .bind(target_uuid)
        .bind(org_uuid)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error checking user org: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        if !belongs {
            return Err(async_graphql::Error::new(
                "User does not belong to your organisation",
            ));
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

        tracing::info!(target_user = %user_id, "Reset user password (org admin)");
        Ok(ResetPasswordResponse {
            success: true,
            generated_password: generated_pw,
        })
    }

    /// Update the organisation's student onboarding configuration.
    async fn update_onboarding_config(
        &self,
        ctx: &Context<'_>,
        config: async_graphql::types::Json<serde_json::Value>,
    ) -> Result<bool> {
        let user_ctx = require_permission(ctx, "settings.update")?;
        let pool = ctx.data::<PgPool>()?;

        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let config_val = config.0.clone();

        let inner_org = org_id.clone();
        let inner_tenant = tenant_id.clone();
        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                sqlx::query(
                    "INSERT INTO organisation_settings (organisation_id, tenant_id, student_onboarding_config, updated_at)
                     VALUES ($1::uuid, $2::uuid, $3, NOW())
                     ON CONFLICT (organisation_id)
                     DO UPDATE SET student_onboarding_config = $3, updated_at = NOW()",
                )
                .bind(&inner_org)
                .bind(&inner_tenant)
                .bind(&config_val)
                .execute(conn)
                .await?;
                Ok(())
            })
        })
        .await
        .map_err(|e| {
            tracing::error!("DB error updating onboarding config: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(true)
    }

    /// Add a new student and their related onboarding information.
    async fn add_student(
        &self,
        ctx: &Context<'_>,
        input: AddStudentInput,
    ) -> Result<AddStudentResponse> {
        let user_ctx = require_permission(ctx, "students.create")?;
        let pool = ctx.data::<PgPool>()?;

        tracing::info!(
            tenant_id = %user_ctx.tenant_id,
            org_id = %user_ctx.org_id,
            "GraphQL mutation: add_student"
        );

        let mut tx = pool.begin().await.map_err(|e| {
            tracing::error!("DB transaction error: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // Set RLS context for the transaction
        sqlx::query("SET LOCAL ROLE app_user")
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error setting role: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        sqlx::query(&format!("SET LOCAL app.current_tenant = '{}'", user_ctx.tenant_id))
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error setting tenant: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        sqlx::query(&format!("SET LOCAL app.current_org = '{}'", user_ctx.org_id))
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error setting org: {e}");
                async_graphql::Error::new("Internal server error")
            })?;

        // Auto-generate admission number
        let year = chrono::Utc::now().format("%Y").to_string();
        let next_seq: i32 = sqlx::query_scalar(
            "INSERT INTO organisation_settings (organisation_id, tenant_id, admission_seq)
             VALUES ($1::uuid, $2::uuid, 1)
             ON CONFLICT (organisation_id)
             DO UPDATE SET admission_seq = organisation_settings.admission_seq + 1
             RETURNING admission_seq",
        )
        .bind(&user_ctx.org_id)
        .bind(&user_ctx.tenant_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error getting admission seq: {e}");
            async_graphql::Error::new("Internal server error")
        })?;
        let admission_number = format!("ADM-{}-{:04}", year, next_seq);

        // 1. Insert Student Core
        let student = sqlx::query_as::<_, Student>(
            "INSERT INTO students (
                organisation_id, tenant_id, name, class_name,
                gender, date_of_birth, blood_group, religion,
                email, phone, admission_number, admission_date
            ) VALUES (
                $1::uuid, $2::uuid, $3, $4,
                $5, $6::date, $7, $8,
                $9, $10, $11, $12::date
            ) RETURNING id::text, name, class_name, gender, date_of_birth::text, blood_group, religion, email, phone, admission_number, admission_date::text, NULL::text AS login_email, NULL::text AS user_id"
        )
        .bind(&user_ctx.org_id)
        .bind(&user_ctx.tenant_id)
        .bind(&input.name)
        .bind(&input.class_name)
        .bind(&input.gender)
        .bind(&input.date_of_birth)
        .bind(&input.blood_group)
        .bind(&input.religion)
        .bind(&input.email)
        .bind(&input.phone)
        .bind(&admission_number)
        .bind(&input.admission_date)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error inserting student: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // 1b. Create user account for the student
        let org_slug: String = sqlx::query_scalar(
            "SELECT slug FROM organisations WHERE id = $1::uuid",
        )
        .bind(&user_ctx.org_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching org slug: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        let student_email = format!("{}@{}.com", admission_number.to_lowercase(), org_slug);
        let student_password = generate_random_password();
        let student_pw_hash = bcrypt::hash(&student_password, 12).map_err(|e| {
            async_graphql::Error::new(format!("Failed to hash password: {e}"))
        })?;

        let student_user_id: String = sqlx::query_scalar(
            "INSERT INTO users (name, email, password_hash, system_role, tenant_id)
             VALUES ($1, $2, $3, 'user', $4::uuid)
             RETURNING id::text",
        )
        .bind(&input.name)
        .bind(&student_email)
        .bind(&student_pw_hash)
        .bind(&user_ctx.tenant_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error creating student user: {e}");
            async_graphql::Error::new("Failed to create student user account")
        })?;

        // Link user to organisation
        sqlx::query(
            "INSERT INTO user_organisations (user_id, organisation_id)
             VALUES ($1::uuid, $2::uuid)",
        )
        .bind(&student_user_id)
        .bind(&user_ctx.org_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error linking student user to org: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // Assign student role
        let student_role_id: Option<String> = sqlx::query_scalar(
            "SELECT id::text FROM roles WHERE organisation_id = $1::uuid AND slug = 'student'",
        )
        .bind(&user_ctx.org_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error finding student role: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        if let Some(role_id) = student_role_id {
            sqlx::query(
                "INSERT INTO user_org_roles (user_id, organisation_id, role_id, assigned_by)
                 VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid)
                 ON CONFLICT DO NOTHING",
            )
            .bind(&student_user_id)
            .bind(&user_ctx.org_id)
            .bind(&role_id)
            .bind(&user_ctx.user_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error assigning student role: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        } else {
            tracing::warn!(org_id = %user_ctx.org_id, "No 'student' role found for org, skipping role assignment");
        }

        // Link student record to user account
        sqlx::query(
            "UPDATE students SET user_id = $1::uuid WHERE id = $2::uuid",
        )
        .bind(&student_user_id)
        .bind(&student.id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error linking student to user: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // 2. Insert Parent Data
        sqlx::query(
            "INSERT INTO student_parents (
                student_id, tenant_id, organisation_id,
                father_name, father_phone, father_occupation,
                mother_name, mother_phone, mother_occupation,
                guardian_name, guardian_phone, guardian_relation, guardian_occupation, guardian_email
            ) VALUES (
                $1::uuid, $2::uuid, $3::uuid,
                $4, $5, $6,
                $7, $8, $9,
                $10, $11, $12, $13, $14
            )"
        )
        .bind(&student.id)
        .bind(&user_ctx.tenant_id)
        .bind(&user_ctx.org_id)
        .bind(&input.father_name)
        .bind(&input.father_phone)
        .bind(&input.father_occupation)
        .bind(&input.mother_name)
        .bind(&input.mother_phone)
        .bind(&input.mother_occupation)
        .bind(&input.guardian_name)
        .bind(&input.guardian_phone)
        .bind(&input.guardian_relation)
        .bind(&input.guardian_occupation)
        .bind(&input.guardian_email)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error inserting student_parents: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // 3. Insert Medical History
        sqlx::query(
            "INSERT INTO student_medical_history (
                student_id, tenant_id, organisation_id,
                allergies, medications, past_conditions
            ) VALUES (
                $1::uuid, $2::uuid, $3::uuid,
                $4, $5, $6
            )"
        )
        .bind(&student.id)
        .bind(&user_ctx.tenant_id)
        .bind(&user_ctx.org_id)
        .bind(&input.allergies)
        .bind(&input.medications)
        .bind(&input.past_conditions)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error inserting student_medical_history: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // 4. Insert Previous School
        if input.previous_school_name.is_some() || input.previous_school_address.is_some() {
            sqlx::query(
                "INSERT INTO student_previous_schools (
                    student_id, tenant_id, organisation_id,
                    school_name, address
                ) VALUES (
                    $1::uuid, $2::uuid, $3::uuid,
                    $4, $5
                )"
            )
            .bind(&student.id)
            .bind(&user_ctx.tenant_id)
            .bind(&user_ctx.org_id)
            .bind(input.previous_school_name.unwrap_or_default())
            .bind(&input.previous_school_address)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error inserting student_previous_schools: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        }

        // 5. Insert Addresses
        if input.current_address.is_some() || input.current_city.is_some() {
            sqlx::query(
                "INSERT INTO student_addresses (
                    student_id, tenant_id, organisation_id, address_type,
                    address, city, state, zip_code, country
                ) VALUES (
                    $1::uuid, $2::uuid, $3::uuid, 'Current',
                    $4, $5, $6, $7, $8
                )"
            )
            .bind(&student.id)
            .bind(&user_ctx.tenant_id)
            .bind(&user_ctx.org_id)
            .bind(&input.current_address)
            .bind(&input.current_city)
            .bind(&input.current_state)
            .bind(&input.current_zip_code)
            .bind(&input.current_country)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error inserting current address: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        }

        if input.permanent_address.is_some() || input.permanent_city.is_some() {
            sqlx::query(
                "INSERT INTO student_addresses (
                    student_id, tenant_id, organisation_id, address_type,
                    address, city, state, zip_code, country
                ) VALUES (
                    $1::uuid, $2::uuid, $3::uuid, 'Permanent',
                    $4, $5, $6, $7, $8
                )"
            )
            .bind(&student.id)
            .bind(&user_ctx.tenant_id)
            .bind(&user_ctx.org_id)
            .bind(&input.permanent_address)
            .bind(&input.permanent_city)
            .bind(&input.permanent_state)
            .bind(&input.permanent_zip_code)
            .bind(&input.permanent_country)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error inserting permanent address: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        }

        // 6. Insert Custom Data
        let custom_data_val = input.custom_data.map(|c| c.0).unwrap_or_else(|| serde_json::json!({}));
        sqlx::query(
            "INSERT INTO student_custom_data (
                student_id, tenant_id, organisation_id, data
            ) VALUES (
                $1::uuid, $2::uuid, $3::uuid, $4
            )"
        )
        .bind(&student.id)
        .bind(&user_ctx.tenant_id)
        .bind(&user_ctx.org_id)
        .bind(&custom_data_val)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error inserting custom data: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        tx.commit().await.map_err(|e| {
            tracing::error!("DB transaction commit error: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(AddStudentResponse {
            student,
            generated_email: student_email,
            generated_password: student_password,
        })
    }

    /// Create user credentials for an existing student that has no user account.
    async fn create_student_credentials(
        &self,
        ctx: &Context<'_>,
        student_id: String,
    ) -> Result<AddStudentResponse> {
        let user_ctx = require_permission(ctx, "students.create")?;
        let pool = ctx.data::<PgPool>()?;

        tracing::info!("GraphQL mutation: create_student_credentials");

        let mut tx = pool.begin().await.map_err(|e| {
            tracing::error!("DB error starting tx: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // RLS context
        sqlx::query("SET LOCAL ROLE app_user")
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error setting role: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        sqlx::query(&format!("SET LOCAL app.current_tenant = '{}'", user_ctx.tenant_id))
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error setting tenant: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        sqlx::query(&format!("SET LOCAL app.current_org = '{}'", user_ctx.org_id))
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error setting org: {e}");
                async_graphql::Error::new("Internal server error")
            })?;

        // Fetch the student (RLS ensures tenant/org isolation)
        let student = sqlx::query_as::<_, Student>(
            "SELECT s.id::text, s.name, s.class_name, s.gender, s.date_of_birth::text, s.blood_group, s.religion, s.email, s.phone, s.admission_number, s.admission_date::text, u.email AS login_email, s.user_id::text FROM students s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = $1::uuid",
        )
        .bind(&student_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching student: {e}");
            async_graphql::Error::new("Internal server error")
        })?
        .ok_or_else(|| async_graphql::Error::new("Student not found"))?;

        // Check student doesn't already have a user account
        if student.user_id.is_some() {
            return Err(async_graphql::Error::new("Student already has a user account"));
        }

        // Generate admission number if missing
        let admission_number = match &student.admission_number {
            Some(adm) if !adm.is_empty() => adm.clone(),
            _ => {
                let year = chrono::Utc::now().format("%Y").to_string();
                let next_seq: i32 = sqlx::query_scalar(
                    "INSERT INTO organisation_settings (organisation_id, tenant_id, admission_seq)
                     VALUES ($1::uuid, $2::uuid, 1)
                     ON CONFLICT (organisation_id)
                     DO UPDATE SET admission_seq = organisation_settings.admission_seq + 1
                     RETURNING admission_seq",
                )
                .bind(&user_ctx.org_id)
                .bind(&user_ctx.tenant_id)
                .fetch_one(&mut *tx)
                .await
                .map_err(|e| {
                    tracing::error!("DB error getting admission seq: {e}");
                    async_graphql::Error::new("Internal server error")
                })?;
                let adm = format!("ADM-{}-{:04}", year, next_seq);

                sqlx::query("UPDATE students SET admission_number = $1 WHERE id = $2::uuid")
                    .bind(&adm)
                    .bind(&student_id)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| {
                        tracing::error!("DB error updating admission number: {e}");
                        async_graphql::Error::new("Internal server error")
                    })?;

                adm
            }
        };

        // Fetch org slug for email generation
        let org_slug: String = sqlx::query_scalar(
            "SELECT slug FROM organisations WHERE id = $1::uuid",
        )
        .bind(&user_ctx.org_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error fetching org slug: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        let student_email = format!("{}@{}.com", admission_number.to_lowercase(), org_slug);
        let student_password = generate_random_password();
        let student_pw_hash = bcrypt::hash(&student_password, 12).map_err(|e| {
            async_graphql::Error::new(format!("Failed to hash password: {e}"))
        })?;

        // Create user account
        let student_user_id: String = sqlx::query_scalar(
            "INSERT INTO users (name, email, password_hash, system_role, tenant_id)
             VALUES ($1, $2, $3, 'user', $4::uuid)
             RETURNING id::text",
        )
        .bind(&student.name)
        .bind(&student_email)
        .bind(&student_pw_hash)
        .bind(&user_ctx.tenant_id)
        .fetch_one(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error creating student user: {e}");
            async_graphql::Error::new("Failed to create student user account")
        })?;

        // Link user to organisation
        sqlx::query(
            "INSERT INTO user_organisations (user_id, organisation_id)
             VALUES ($1::uuid, $2::uuid)",
        )
        .bind(&student_user_id)
        .bind(&user_ctx.org_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error linking student user to org: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // Assign student role
        let student_role_id: Option<String> = sqlx::query_scalar(
            "SELECT id::text FROM roles WHERE organisation_id = $1::uuid AND slug = 'student'",
        )
        .bind(&user_ctx.org_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| {
            tracing::error!("DB error finding student role: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        if let Some(role_id) = student_role_id {
            sqlx::query(
                "INSERT INTO user_org_roles (user_id, organisation_id, role_id, assigned_by)
                 VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid)
                 ON CONFLICT DO NOTHING",
            )
            .bind(&student_user_id)
            .bind(&user_ctx.org_id)
            .bind(&role_id)
            .bind(&user_ctx.user_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error assigning student role: {e}");
                async_graphql::Error::new("Internal server error")
            })?;
        }

        // Link student record to user account
        sqlx::query("UPDATE students SET user_id = $1::uuid WHERE id = $2::uuid")
            .bind(&student_user_id)
            .bind(&student_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                tracing::error!("DB error linking student to user: {e}");
                async_graphql::Error::new("Internal server error")
            })?;

        tx.commit().await.map_err(|e| {
            tracing::error!("DB error committing tx: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        // Re-fetch so the student has updated user_id/login_email
        let updated_student = sqlx::query_as::<_, Student>(
            "SELECT s.id::text, s.name, s.class_name, s.gender, s.date_of_birth::text, s.blood_group, s.religion, s.email, s.phone, s.admission_number, s.admission_date::text, u.email AS login_email, s.user_id::text FROM students s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = $1::uuid",
        )
        .bind(&student_id)
        .fetch_one(pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error re-fetching student: {e}");
            async_graphql::Error::new("Internal server error")
        })?;

        Ok(AddStudentResponse {
            student: updated_student,
            generated_email: student_email,
            generated_password: student_password,
        })
    }

    // ── Dashboard Mutations ──────────────────────────────────────────────────

    async fn create_event(&self, ctx: &Context<'_>, input: CreateEventInput) -> Result<Event> {
        let user_ctx = require_permission(ctx, "events.create")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let inner_t = tenant_id.clone();
        let inner_o = org_id.clone();

        let event = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, Event>(
                    "INSERT INTO events (tenant_id, organisation_id, title, description, event_date, end_date, start_time, end_time)
                     VALUES ($1::uuid, $2::uuid, $3, $4, $5::date, $6::date, $7, $8)
                     RETURNING id::text, title, description, event_date::text, end_date::text, start_time, end_time",
                )
                .bind(&inner_t)
                .bind(&inner_o)
                .bind(&input.title)
                .bind(&input.description)
                .bind(&input.event_date)
                .bind(&input.end_date)
                .bind(&input.start_time)
                .bind(&input.end_time)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;
        Ok(event)
    }

    async fn delete_event(&self, ctx: &Context<'_>, id: String) -> Result<bool> {
        let user_ctx = require_permission(ctx, "events.create")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                sqlx::query("DELETE FROM events WHERE id = $1::uuid")
                    .bind(&id)
                    .execute(conn)
                    .await?;
                Ok(())
            })
        })
        .await
        .map_err(|e| e.extend())?;
        Ok(true)
    }

    async fn create_subject(&self, ctx: &Context<'_>, input: CreateSubjectInput) -> Result<Subject> {
        let user_ctx = require_permission(ctx, "settings.update")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let inner_t = tenant_id.clone();
        let inner_o = org_id.clone();

        let subject = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, Subject>(
                    "INSERT INTO subjects (tenant_id, organisation_id, name, class_name)
                     VALUES ($1::uuid, $2::uuid, $3, $4)
                     RETURNING id::text, name, class_name, status",
                )
                .bind(&inner_t)
                .bind(&inner_o)
                .bind(&input.name)
                .bind(&input.class_name)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;
        Ok(subject)
    }

    async fn create_student_activity(&self, ctx: &Context<'_>, input: CreateStudentActivityInput) -> Result<StudentActivity> {
        let user_ctx = require_permission(ctx, "students.create")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let inner_t = tenant_id.clone();
        let inner_o = org_id.clone();

        let activity = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, StudentActivity>(
                    "INSERT INTO student_activities (tenant_id, organisation_id, student_id, title, description, activity_date)
                     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, COALESCE($6::date, CURRENT_DATE))
                     RETURNING id::text, student_id::text, title, description, activity_date::text",
                )
                .bind(&inner_t)
                .bind(&inner_o)
                .bind(&input.student_id)
                .bind(&input.title)
                .bind(&input.description)
                .bind(&input.activity_date)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;
        Ok(activity)
    }

    async fn create_admin_todo(&self, ctx: &Context<'_>, input: CreateAdminTodoInput) -> Result<AdminTodo> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let inner_t = tenant_id.clone();
        let inner_o = org_id.clone();
        let uid = user_ctx.user_id.clone();

        let todo = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, AdminTodo>(
                    "INSERT INTO admin_todos (tenant_id, organisation_id, user_id, title, due_time)
                     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
                     RETURNING id::text, title, due_time, status",
                )
                .bind(&inner_t)
                .bind(&inner_o)
                .bind(&uid)
                .bind(&input.title)
                .bind(&input.due_time)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;
        Ok(todo)
    }

    async fn update_admin_todo(&self, ctx: &Context<'_>, input: UpdateAdminTodoInput) -> Result<AdminTodo> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let todo = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                let row = sqlx::query_as::<_, AdminTodo>(
                    "UPDATE admin_todos SET status = $2 WHERE id = $1::uuid
                     RETURNING id::text, title, due_time, status",
                )
                .bind(&input.id)
                .bind(&input.status)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;
        Ok(todo)
    }

    async fn delete_admin_todo(&self, ctx: &Context<'_>, id: String) -> Result<bool> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                sqlx::query("DELETE FROM admin_todos WHERE id = $1::uuid")
                    .bind(&id)
                    .execute(conn)
                    .await?;
                Ok(())
            })
        })
        .await
        .map_err(|e| e.extend())?;
        Ok(true)
    }

    async fn add_class(&self, ctx: &Context<'_>, class_name: String) -> Result<bool> {
        let user_ctx = require_permission(ctx, "settings.update").map_err(|e| {
            tracing::error!("add_class permission error for user {}: {}", ctx.data_opt::<UserContext>().map(|u| u.user_id.as_str()).unwrap_or("unknown"), e.message);
            e
        })?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let inner_t = tenant_id.clone();
        let inner_o = org_id.clone();

        tracing::info!("Attempting to add class '{}' to org {} in tenant {}", class_name, org_id, tenant_id);

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            Box::pin(async move {
                // Upsert — append class_name to the JSONB array if not already present
                                let res = sqlx::query(
                                        "INSERT INTO organisation_settings (organisation_id, tenant_id, classes)
                                         VALUES ($1::uuid, $2::uuid, jsonb_build_array($3))
                                         ON CONFLICT (organisation_id)
                                         DO UPDATE SET classes = CASE
                                             WHEN NOT (organisation_settings.classes ? $3)
                                             THEN organisation_settings.classes || to_jsonb($3::text)
                                             ELSE organisation_settings.classes
                                         END",
                                )
                                .bind(&inner_o)
                                .bind(&inner_t)
                                .bind(&class_name)
                                .execute(conn)
                                .await.map_err(|e| {
                                        tracing::error!("SQL Error in add_class upsert: {e}");
                                        e
                                })?;

                tracing::info!("add_class execute result rows affected: {}", res.rows_affected());
                Ok(())
            })
        })
        .await
        .map_err(|e| {
            tracing::error!("execute_in_context error in add_class: {e}");
            e.extend()
        })?;
        Ok(true)
    }

    // ── Dashboard V2 Mutations ──────────────────────────────────────────────

    /// Create a class routine entry.
    async fn create_class_routine(
        &self,
        ctx: &Context<'_>,
        input: CreateClassRoutineInput,
    ) -> Result<ClassRoutine> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        let routine = execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let inp = CreateClassRoutineInput {
                teacher_id: input.teacher_id.clone(),
                class_name: input.class_name.clone(),
                section: input.section.clone(),
                day_of_week: input.day_of_week.clone(),
                start_time: input.start_time.clone(),
                end_time: input.end_time.clone(),
                room: input.room.clone(),
                subject_name: input.subject_name.clone(),
            };
            Box::pin(async move {
                let row = sqlx::query_as::<_, ClassRoutine>(
                    "INSERT INTO class_routines (tenant_id, organisation_id, teacher_id, class_name, section, day_of_week, start_time, end_time, room, subject_name)
                     VALUES (current_setting('app.current_tenant', true)::uuid, current_setting('app.current_org', true)::uuid,
                             $1::uuid, $2, $3, $4, $5, $6, $7, $8)
                     RETURNING id::text, teacher_id::text,
                              (SELECT name FROM users WHERE id = class_routines.teacher_id) AS teacher_name,
                              class_name, section, day_of_week, start_time, end_time, room, subject_name, status",
                )
                .bind(&inp.teacher_id)
                .bind(&inp.class_name)
                .bind(&inp.section)
                .bind(&inp.day_of_week)
                .bind(&inp.start_time)
                .bind(&inp.end_time)
                .bind(&inp.room)
                .bind(&inp.subject_name)
                .fetch_one(conn)
                .await?;
                Ok(row)
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(routine)
    }

    /// Delete a class routine entry.
    async fn delete_class_routine(&self, ctx: &Context<'_>, id: String) -> Result<bool> {
        let user_ctx = require_auth(ctx)?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let routine_id = id.clone();
            Box::pin(async move {
                sqlx::query("DELETE FROM class_routines WHERE id = $1::uuid")
                    .bind(&routine_id)
                    .execute(conn)
                    .await?;
                Ok(())
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(true)
    }

    /// Mark staff/teacher attendance.
    async fn mark_staff_attendance(
        &self,
        ctx: &Context<'_>,
        user_id: String,
        date: String,
        status: String,
        remarks: Option<String>,
    ) -> Result<bool> {
        let user_ctx = require_permission(ctx, "attendance.manage")?;
        let pool = ctx.data::<PgPool>()?;
        let tenant_id = user_ctx.tenant_id.clone();
        let org_id = user_ctx.org_id.clone();
        let marked_by = user_ctx.user_id.clone();

        execute_in_context(pool, &tenant_id, &org_id, |conn| {
            let uid = user_id.clone();
            let dt = date.clone();
            let st = status.clone();
            let rmk = remarks.clone().unwrap_or_default();
            let mb = marked_by.clone();
            Box::pin(async move {
                sqlx::query(
                    "INSERT INTO staff_attendance (tenant_id, organisation_id, user_id, date, status, marked_by, remarks)
                     VALUES (current_setting('app.current_tenant', true)::uuid, current_setting('app.current_org', true)::uuid,
                             $1::uuid, $2::date, $3, $4::uuid, $5)
                     ON CONFLICT (user_id, date) DO UPDATE SET status = $3, marked_by = $4::uuid, remarks = $5",
                )
                .bind(&uid)
                .bind(&dt)
                .bind(&st)
                .bind(&mb)
                .bind(&rmk)
                .execute(conn)
                .await?;
                Ok(())
            })
        })
        .await
        .map_err(|e| e.extend())?;

        Ok(true)
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
