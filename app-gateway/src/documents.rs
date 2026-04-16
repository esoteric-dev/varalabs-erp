//! Document generation: HTML templates → PDF via headless Chromium.
//!
//! Each organisation can store custom HTML templates per document type.
//! If none exists the built-in platform template is used as the fallback.
//!
//! Variable substitution uses `{{VAR_NAME}}` tokens inside the HTML.

use axum::{
    extract::{Extension, Path, Query},
    http::{header, StatusCode},
    response::{IntoResponse, Response},
};
use serde::Deserialize;
use sqlx::PgPool;
use std::io::Write;
use std::process::Command;

use crate::auth::UserContext;
use crate::db::execute_in_context;

// ── Platform-default HTML templates ─────────────────────────────────────────

/// Shared print CSS injected into every platform template.
const PRINT_CSS: &str = r#"
  @page { margin: 18mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px;
         line-height: 1.65; color: #1e293b; }
  h1,h2,h3 { line-height: 1.2; }
  table { border-collapse: collapse; width: 100%; }
  a { color: inherit; text-decoration: none; }
"#;

pub fn platform_template(doc_type: &str) -> Option<&'static str> {
    match doc_type {
        "offer_letter"          => Some(OFFER_LETTER_HTML),
        "joining_letter"        => Some(JOINING_LETTER_HTML),
        "bonafide_certificate"  => Some(BONAFIDE_HTML),
        "transfer_certificate"  => Some(TRANSFER_CERT_HTML),
        "id_card_staff"         => Some(ID_CARD_STAFF_HTML),
        "id_card_student"       => Some(ID_CARD_STUDENT_HTML),
        "payslip"               => Some(PAYSLIP_HTML),
        "fee_slip"              => Some(FEE_SLIP_HTML),
        _                       => None,
    }
}

// ── Variable substitution ────────────────────────────────────────────────────

/// Escape a user-provided string for safe insertion into HTML.
fn he(s: &str) -> String {
    s.replace('&', "&amp;")
     .replace('<', "&lt;")
     .replace('>', "&gt;")
     .replace('"', "&quot;")
}

pub struct StaffDocVars {
    pub org_name:    String,
    pub org_logo:    String,
    pub org_address: String,
    pub org_phone:   String,
    pub staff_name:  String,
    pub designation: String,
    pub department:  String,
    pub emp_id:      String,
    pub doj:         String,
    pub basic_pay:   String,
    pub allowances:  String,
    pub deductions:  String,
    pub net_pay:     String,
    pub month_year:  String,
    pub today:       String,
}

pub struct StudentDocVars {
    pub org_name:      String,
    pub org_logo:      String,
    pub org_address:   String,
    pub org_phone:     String,
    pub student_name:  String,
    pub class:         String,
    pub admission_no:  String,
    pub dob:           String,
    pub gender:        String,
    pub father_name:   String,
    pub parent_name:   String,
    pub parent_phone:  String,
    pub leaving_date:  String,
    pub academic_year: String,
    pub photo_url:     String,
    pub today:         String,
}

pub struct FeeSlipVars {
    pub org_name:      String,
    pub org_logo:      String,
    pub org_address:   String,
    pub org_phone:     String,
    pub student_name:  String,
    pub class:         String,
    pub admission_no:  String,
    pub fee_name:      String,
    pub amount_due:    String,
    pub amount_paid:   String,
    pub balance:       String,
    pub status:        String,
    pub due_date:      String,
    pub paid_date:     String,
    pub payment_mode:  String,
    pub receipt_no:    String,
    pub today:         String,
}

fn apply_org_branding(html: &str, name: &str, logo: &str, address: &str, phone: &str) -> String {
    html.replace("{{ORG_NAME}}",    &he(name))
        .replace("{{ORG_LOGO}}",    logo)          // URL — not HTML-escaped
        .replace("{{ORG_ADDRESS}}", &he(address))
        .replace("{{ORG_PHONE}}",   &he(phone))
}

pub fn apply_staff_vars(html: &str, v: &StaffDocVars) -> String {
    apply_org_branding(html, &v.org_name, &v.org_logo, &v.org_address, &v.org_phone)
        .replace("{{STAFF_NAME}}",  &he(&v.staff_name))
        .replace("{{DESIGNATION}}", &he(&v.designation))
        .replace("{{DEPARTMENT}}",  &he(&v.department))
        .replace("{{EMP_ID}}",      &he(&v.emp_id))
        .replace("{{DOJ}}",         &he(&v.doj))
        .replace("{{BASIC_PAY}}",   &v.basic_pay)
        .replace("{{ALLOWANCES}}",  &v.allowances)
        .replace("{{DEDUCTIONS}}",  &v.deductions)
        .replace("{{NET_PAY}}",     &v.net_pay)
        .replace("{{MONTH_YEAR}}",  &he(&v.month_year))
        .replace("{{TODAY}}",       &he(&v.today))
}

pub fn apply_student_vars(html: &str, v: &StudentDocVars) -> String {
    apply_org_branding(html, &v.org_name, &v.org_logo, &v.org_address, &v.org_phone)
        .replace("{{STUDENT_NAME}}",  &he(&v.student_name))
        .replace("{{CLASS}}",         &he(&v.class))
        .replace("{{ADMISSION_NO}}",  &he(&v.admission_no))
        .replace("{{DOB}}",           &he(&v.dob))
        .replace("{{GENDER}}",        &he(&v.gender))
        .replace("{{FATHER_NAME}}",   &he(&v.father_name))
        .replace("{{PARENT_NAME}}",   &he(&v.parent_name))
        .replace("{{PARENT_PHONE}}",  &he(&v.parent_phone))
        .replace("{{LEAVING_DATE}}",  &he(&v.leaving_date))
        .replace("{{ACADEMIC_YEAR}}", &he(&v.academic_year))
        .replace("{{PHOTO_URL}}",     &he(&v.photo_url))
        .replace("{{TODAY}}",         &he(&v.today))
}

pub fn apply_fee_slip_vars(html: &str, v: &FeeSlipVars) -> String {
    apply_org_branding(html, &v.org_name, &v.org_logo, &v.org_address, &v.org_phone)
        .replace("{{STUDENT_NAME}}",  &he(&v.student_name))
        .replace("{{CLASS}}",         &he(&v.class))
        .replace("{{ADMISSION_NO}}",  &he(&v.admission_no))
        .replace("{{FEE_NAME}}",      &he(&v.fee_name))
        .replace("{{AMOUNT_DUE}}",    &v.amount_due)
        .replace("{{AMOUNT_PAID}}",   &v.amount_paid)
        .replace("{{BALANCE}}",       &v.balance)
        .replace("{{STATUS_LOWER}}",  &he(&v.status.to_lowercase()))
        .replace("{{STATUS}}",        &he(&v.status))
        .replace("{{DUE_DATE}}",      &he(&v.due_date))
        .replace("{{PAID_DATE}}",     &he(&v.paid_date))
        .replace("{{PAYMENT_MODE}}",  &he(&v.payment_mode))
        .replace("{{RECEIPT_NO}}",    &he(&v.receipt_no))
        .replace("{{TODAY}}",         &he(&v.today))
}

// ── DB helpers ───────────────────────────────────────────────────────────────

#[derive(sqlx::FromRow)]
struct StaffRow {
    user_name:       String,
    employee_id:     Option<String>,
    designation:     Option<String>,
    department:      Option<String>,
    date_of_joining: Option<String>,
    basic_pay:       Option<i64>,
    allowances:      Option<i64>,
    deductions:      Option<i64>,
    org_name:        String,
    org_logo:        Option<String>,
    org_address:     Option<String>,
    org_phone:       Option<String>,
}

#[derive(sqlx::FromRow)]
struct StudentRow {
    name:           String,
    class_name:     String,
    admission_number: Option<String>,
    date_of_birth:  Option<String>,
    gender:         Option<String>,
    photo_url:      Option<String>,
    org_name:       String,
    org_logo:       Option<String>,
    org_address:    Option<String>,
    org_phone:      Option<String>,
    father_name:    Option<String>,
    guardian_name:  Option<String>,
    guardian_phone: Option<String>,
}

#[derive(sqlx::FromRow)]
struct FeeSlipRow {
    student_name:    String,
    class_name:      String,
    admission_number: Option<String>,
    fee_name:        String,
    amount_due:      i64,
    amount_paid:     i64,
    status:          String,
    due_date:        String,
    paid_date:       Option<String>,
    payment_mode:    Option<String>,
    receipt_number:  Option<String>,
    org_name:        String,
    org_logo:        Option<String>,
    org_address:     Option<String>,
    org_phone:       Option<String>,
}

fn fmt_currency(paise: i64) -> String {
    let rupees = paise as f64 / 100.0;
    let whole = rupees as i64;
    if whole >= 10_000_000 {
        format!("₹{:.2} Cr", rupees / 10_000_000.0)
    } else if whole >= 100_000 {
        format!("₹{:.2} L", rupees / 100_000.0)
    } else {
        format!("₹{:.0}/-", rupees)
    }
}

async fn fetch_staff_vars(
    pool: &PgPool,
    tenant_id: &str,
    org_id: &str,
    user_id: &str,
) -> Result<Option<StaffDocVars>, crate::errors::AppError> {
    let uid = user_id.to_string();
    execute_in_context(pool, tenant_id, org_id, |conn| {
        Box::pin(async move {
            let row = sqlx::query_as::<_, StaffRow>(
                "SELECT u.name AS user_name,
                        uo.employee_id,
                        sd.designation,
                        sd.department,
                        sd.date_of_joining::text,
                        ss.basic_pay,
                        ss.allowances,
                        ss.deductions,
                        o.name    AS org_name,
                        o.logo_url AS org_logo,
                        o.address  AS org_address,
                        o.phone    AS org_phone
                   FROM users u
                   JOIN user_organisations uo
                     ON uo.user_id = u.id
                    AND uo.organisation_id = current_setting('app.current_org', true)::uuid
                   JOIN organisations o ON o.id = uo.organisation_id
                   LEFT JOIN staff_details sd ON sd.user_id = u.id
                   LEFT JOIN staff_salaries ss ON ss.user_id = u.id
                    AND ss.effective_from = (
                            SELECT MAX(ss2.effective_from) FROM staff_salaries ss2
                            WHERE ss2.user_id = u.id AND ss2.effective_from <= CURRENT_DATE
                        )
                  WHERE u.id = $1::uuid",
            )
            .bind(&uid)
            .fetch_optional(conn)
            .await?;
            Ok(row.map(|r| {
                let basic      = r.basic_pay.unwrap_or(0);
                let allowances = r.allowances.unwrap_or(0);
                let deductions = r.deductions.unwrap_or(0);
                let net        = basic + allowances - deductions;
                StaffDocVars {
                    org_name:    r.org_name,
                    org_logo:    r.org_logo.unwrap_or_default(),
                    org_address: r.org_address.unwrap_or_default(),
                    org_phone:   r.org_phone.unwrap_or_default(),
                    staff_name:  r.user_name,
                    designation: r.designation.unwrap_or_else(|| "Staff".into()),
                    department:  r.department.unwrap_or_else(|| "General".into()),
                    emp_id:      r.employee_id.unwrap_or_default(),
                    doj:         r.date_of_joining.unwrap_or_else(|| "—".into()),
                    basic_pay:   fmt_currency(basic),
                    allowances:  fmt_currency(allowances),
                    deductions:  fmt_currency(deductions),
                    net_pay:     fmt_currency(net),
                    month_year:  chrono::Utc::now().format("%B %Y").to_string(),
                    today:       chrono::Utc::now().format("%d %B %Y").to_string(),
                }
            }))
        })
    })
    .await
}

async fn fetch_student_vars(
    pool: &PgPool,
    tenant_id: &str,
    org_id: &str,
    student_id: &str,
) -> Result<Option<StudentDocVars>, crate::errors::AppError> {
    let sid = student_id.to_string();
    execute_in_context(pool, tenant_id, org_id, |conn| {
        Box::pin(async move {
            let row = sqlx::query_as::<_, StudentRow>(
                "SELECT s.name, s.class_name, s.admission_number, s.date_of_birth::text,
                        s.gender, s.photo_url,
                        o.name     AS org_name,
                        o.logo_url AS org_logo,
                        o.address  AS org_address,
                        o.phone    AS org_phone,
                        sp.father_name, sp.guardian_name, sp.guardian_phone
                   FROM students s
                   JOIN organisations o ON o.id = s.organisation_id
                   LEFT JOIN student_parents sp ON sp.student_id = s.id
                  WHERE s.id = $1::uuid",
            )
            .bind(&sid)
            .fetch_optional(conn)
            .await?;
            Ok(row.map(|r| StudentDocVars {
                org_name:      r.org_name,
                org_logo:      r.org_logo.unwrap_or_default(),
                org_address:   r.org_address.unwrap_or_default(),
                org_phone:     r.org_phone.unwrap_or_default(),
                student_name:  r.name,
                class:         r.class_name,
                admission_no:  r.admission_number.unwrap_or_default(),
                dob:           r.date_of_birth.unwrap_or_default(),
                gender:        r.gender.unwrap_or_default(),
                father_name:   r.father_name.clone().unwrap_or_default(),
                parent_name:   r.guardian_name.clone().or_else(|| r.father_name.clone())
                                 .unwrap_or_default(),
                parent_phone:  r.guardian_phone.unwrap_or_default(),
                leaving_date:  chrono::Utc::now().format("%d %B %Y").to_string(),
                academic_year: "2024-25".into(),
                photo_url:     r.photo_url.unwrap_or_default(),
                today:         chrono::Utc::now().format("%d %B %Y").to_string(),
            }))
        })
    })
    .await
}

/// Fetch the org's default template for a given type, or None if not set.
async fn fetch_org_template(
    pool: &PgPool,
    tenant_id: &str,
    org_id: &str,
    doc_type: &str,
) -> Result<Option<String>, crate::errors::AppError> {
    let dt = doc_type.to_string();
    execute_in_context(pool, tenant_id, org_id, |conn| {
        Box::pin(async move {
            let row: Option<(String,)> = sqlx::query_as(
                "SELECT html_content FROM document_templates
                  WHERE document_type = $1 AND is_default = true
                  LIMIT 1",
            )
            .bind(&dt)
            .fetch_optional(conn)
            .await?;
            Ok(row.map(|(c,)| c))
        })
    })
    .await
}

async fn fetch_fee_slip_vars(
    pool: &PgPool,
    tenant_id: &str,
    org_id: &str,
    fee_record_id: &str,
) -> Result<Option<FeeSlipVars>, crate::errors::AppError> {
    let fid = fee_record_id.to_string();
    execute_in_context(pool, tenant_id, org_id, |conn| {
        Box::pin(async move {
            let row = sqlx::query_as::<_, FeeSlipRow>(
                "SELECT s.name        AS student_name,
                        s.class_name,
                        s.admission_number,
                        fs.name       AS fee_name,
                        fr.amount_due,
                        fr.amount_paid,
                        fr.status,
                        fr.due_date::text,
                        fr.paid_date::text,
                        fr.payment_mode,
                        fr.receipt_number,
                        o.name        AS org_name,
                        o.logo_url    AS org_logo,
                        o.address     AS org_address,
                        o.phone       AS org_phone
                   FROM fee_records fr
                   JOIN students s    ON s.id  = fr.student_id
                   JOIN fee_structures fs ON fs.id = fr.fee_structure_id
                   JOIN organisations o   ON o.id  = fr.organisation_id
                  WHERE fr.id = $1::uuid",
            )
            .bind(&fid)
            .fetch_optional(conn)
            .await?;
            Ok(row.map(|r| {
                let balance = r.amount_due - r.amount_paid;
                FeeSlipVars {
                    org_name:     r.org_name,
                    org_logo:     r.org_logo.unwrap_or_default(),
                    org_address:  r.org_address.unwrap_or_default(),
                    org_phone:    r.org_phone.unwrap_or_default(),
                    student_name: r.student_name,
                    class:        r.class_name,
                    admission_no: r.admission_number.unwrap_or_default(),
                    fee_name:     r.fee_name,
                    amount_due:   fmt_currency(r.amount_due),
                    amount_paid:  fmt_currency(r.amount_paid),
                    balance:      fmt_currency(balance),
                    status:       r.status.replace('_', " ").to_uppercase(),
                    due_date:     r.due_date,
                    paid_date:    r.paid_date.unwrap_or_else(|| "—".into()),
                    payment_mode: r.payment_mode.map(|m| m.replace('_', " ")).unwrap_or_else(|| "—".into()),
                    receipt_no:   r.receipt_number.unwrap_or_else(|| "—".into()),
                    today:        chrono::Utc::now().format("%d %B %Y").to_string(),
                }
            }))
        })
    })
    .await
}

// ── PDF rendering ────────────────────────────────────────────────────────────

pub fn html_to_pdf(html: &str, filename: &str) -> Response {
    let tmp_dir = match tempfile::tempdir() {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("tempdir: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Server error").into_response();
        }
    };

    let html_path = tmp_dir.path().join("doc.html");
    let pdf_path  = tmp_dir.path().join("doc.pdf");

    if let Err(e) = std::fs::File::create(&html_path)
        .and_then(|mut f| f.write_all(html.as_bytes()))
    {
        tracing::error!("write html: {e}");
        return (StatusCode::INTERNAL_SERVER_ERROR, "Server error").into_response();
    }

    let file_url = format!("file://{}", html_path.display());

    // Try chromium then chromium-browser then google-chrome
    let result = ["chromium", "chromium-browser", "google-chrome"]
        .iter()
        .find_map(|bin| {
            Command::new(bin)
                .args([
                    "--headless",
                    "--disable-gpu",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--run-all-compositor-stages-before-draw",
                    &format!("--print-to-pdf={}", pdf_path.display()),
                    "--print-to-pdf-no-header",
                    &file_url,
                ])
                .output()
                .ok()
                .filter(|o| o.status.success())
        });

    if result.is_none() {
        tracing::error!("No chromium binary found or PDF generation failed");
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "PDF generation failed: chromium not available",
        )
            .into_response();
    }

    match std::fs::read(&pdf_path) {
        Ok(bytes) => (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, "application/pdf".to_string()),
                (
                    header::CONTENT_DISPOSITION,
                    format!("attachment; filename=\"{}\"", filename),
                ),
            ],
            bytes,
        )
            .into_response(),
        Err(e) => {
            tracing::error!("read pdf: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, "PDF read error").into_response()
        }
    }
}

// ── Route handlers ───────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct GenerateQuery {
    #[serde(default = "default_doc_type")]
    pub doc_type: String,
    /// For student docs, pass the student_id as query param
    pub student_id: Option<String>,
    /// For fee_slip: the fee_record_id (entity_id is ignored when this is set)
    pub fee_record_id: Option<String>,
    /// For payslip: month (1–12), defaults to current month
    pub month: Option<u32>,
    /// For payslip: year (e.g. 2026), defaults to current year
    pub year: Option<i32>,
    /// Optional: use a specific template id instead of the default
    pub template_id: Option<String>,
}

fn default_doc_type() -> String { "offer_letter".into() }

fn auth_check(
    user_ctx: &Option<Extension<UserContext>>,
) -> Result<&UserContext, Response> {
    match user_ctx {
        Some(Extension(ctx)) => {
            if ctx.system_role != crate::auth::SystemRole::Superadmin
                && !ctx.permissions.contains("users.view")
                && !ctx.permissions.contains("students.view")
            {
                return Err((StatusCode::FORBIDDEN, "Access denied").into_response());
            }
            Ok(ctx)
        }
        None => Err((StatusCode::UNAUTHORIZED, "Authentication required").into_response()),
    }
}

/// GET /api/documents/{entity_id}/generate?doc_type=offer_letter
///
/// `entity_id` is a user_id for staff docs, or overridden by `student_id` query
/// param for student docs.
pub async fn generate_document_handler(
    Path(entity_id): Path<String>,
    Query(params): Query<GenerateQuery>,
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
) -> Response {
    let ctx = match auth_check(&user_ctx) {
        Ok(c) => c,
        Err(r) => return r,
    };

    let is_student_doc = matches!(
        params.doc_type.as_str(),
        "bonafide_certificate" | "transfer_certificate" | "id_card_student"
    );

    // Load template HTML (org custom → platform fallback)
    let html_template = if let Some(tid) = &params.template_id {
        // Specific template requested
        let tid = tid.clone();
        let dt  = params.doc_type.clone();
        let result = execute_in_context(&pool, &ctx.tenant_id, &ctx.org_id, |conn| {
            Box::pin(async move {
                let row: Option<(String,)> = sqlx::query_as(
                    "SELECT html_content FROM document_templates WHERE id = $1::uuid AND document_type = $2",
                )
                .bind(&tid)
                .bind(&dt)
                .fetch_optional(conn)
                .await?;
                Ok(row.map(|(c,)| c))
            })
        })
        .await;
        match result {
            Ok(Some(html)) => html,
            _ => match platform_template(&params.doc_type) {
                Some(t) => t.to_string(),
                None => return (StatusCode::BAD_REQUEST, "Unknown document type").into_response(),
            },
        }
    } else {
        // Use org's default, or platform fallback
        match fetch_org_template(&pool, &ctx.tenant_id, &ctx.org_id, &params.doc_type).await {
            Ok(Some(html)) => html,
            _ => match platform_template(&params.doc_type) {
                Some(t) => t.to_string(),
                None => return (StatusCode::BAD_REQUEST, "Unknown document type").into_response(),
            },
        }
    };

    if params.doc_type == "fee_slip" {
        let fid = params.fee_record_id.as_deref().unwrap_or(&entity_id);
        match fetch_fee_slip_vars(&pool, &ctx.tenant_id, &ctx.org_id, fid).await {
            Ok(Some(vars)) => {
                let html  = apply_fee_slip_vars(&html_template, &vars);
                let fname = format!("fee_slip_{}_{}.pdf",
                    vars.student_name.replace(' ', "_").to_lowercase(),
                    vars.today.replace(' ', "_"),
                );
                html_to_pdf(&html, &fname)
            }
            Ok(None) => (StatusCode::NOT_FOUND, "Fee record not found").into_response(),
            Err(e) => {
                tracing::error!("DB: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
            }
        }
    } else if is_student_doc {
        let sid = params.student_id.as_deref().unwrap_or(&entity_id);
        match fetch_student_vars(&pool, &ctx.tenant_id, &ctx.org_id, sid).await {
            Ok(Some(vars)) => {
                let html = apply_student_vars(&html_template, &vars);
                let fname = format!("{}_{}_{}.pdf",
                    vars.student_name.replace(' ', "_").to_lowercase(),
                    params.doc_type,
                    vars.today.replace(' ', "_"),
                );
                html_to_pdf(&html, &fname)
            }
            Ok(None) => (StatusCode::NOT_FOUND, "Student not found").into_response(),
            Err(e) => {
                tracing::error!("DB: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
            }
        }
    } else {
        // Staff doc (offer_letter, joining_letter, id_card_staff, payslip)
        match fetch_staff_vars(&pool, &ctx.tenant_id, &ctx.org_id, &entity_id).await {
            Ok(Some(mut vars)) => {
                // For payslip override month_year from query params
                if params.doc_type == "payslip" {
                    let now = chrono::Utc::now();
                    let m = params.month.unwrap_or_else(|| now.format("%m").to_string().parse().unwrap_or(1));
                    let y = params.year.unwrap_or_else(|| now.format("%Y").to_string().parse().unwrap_or(2024));
                    let month_name = match m {
                        1 => "January", 2 => "February", 3 => "March", 4 => "April",
                        5 => "May",     6 => "June",     7 => "July",  8 => "August",
                        9 => "September", 10 => "October", 11 => "November", _ => "December",
                    };
                    vars.month_year = format!("{} {}", month_name, y);
                }
                let html = apply_staff_vars(&html_template, &vars);
                let fname = format!("{}_{}.pdf",
                    vars.staff_name.replace(' ', "_").to_lowercase(),
                    params.doc_type,
                );
                html_to_pdf(&html, &fname)
            }
            Ok(None) => (StatusCode::NOT_FOUND, "User not found").into_response(),
            Err(e) => {
                tracing::error!("DB: {e}");
                (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
            }
        }
    }
}

/// POST /api/documents/preview
/// Body: { "html": "<full HTML string>" }
/// Returns the PDF bytes for live preview in the template editor.
pub async fn preview_document_handler(
    user_ctx: Option<Extension<UserContext>>,
    axum::Json(body): axum::Json<PreviewBody>,
) -> Response {
    if auth_check(&user_ctx).is_err() {
        return (StatusCode::UNAUTHORIZED, "Authentication required").into_response();
    }
    html_to_pdf(&body.html, "preview.pdf")
}

#[derive(Deserialize)]
pub struct PreviewBody {
    pub html: String,
}

// Backward-compatible wrapper for the old offer-letter endpoint
pub async fn offer_letter_compat_handler(
    Path(user_id): Path<String>,
    Query(params): Query<CompatQuery>,
    pool: Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
) -> Response {
    let doc_type = if params.letter_type.as_deref() == Some("joining") {
        "joining_letter"
    } else {
        "offer_letter"
    };
    generate_document_handler(
        Path(user_id),
        Query(GenerateQuery {
            doc_type: doc_type.into(),
            student_id: None,
            fee_record_id: None,
            month: None,
            year: None,
            template_id: None,
        }),
        pool,
        user_ctx,
    )
    .await
}

/// POST /api/offer-letter/{user_id}
/// Body: { letter_type?, opening_paragraph?, terms?, additional_notes? }
/// Generates a custom offer/joining letter PDF with optional overrides for
/// the opening paragraph, terms list, and additional notes.
pub async fn offer_letter_custom_handler(
    Path(user_id): Path<String>,
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    axum::Json(body): axum::Json<OfferLetterCustomBody>,
) -> Response {
    let ctx = match auth_check(&user_ctx) {
        Ok(c) => c,
        Err(r) => return r,
    };

    let doc_type = if body.letter_type.as_deref() == Some("joining") {
        "joining_letter"
    } else {
        "offer_letter"
    };

    // Load staff vars and org template (same as compat GET handler)
    let html_template = match fetch_org_template(&pool, &ctx.tenant_id, &ctx.org_id, doc_type).await {
        Ok(Some(html)) => html,
        _ => match platform_template(doc_type) {
            Some(t) => t.to_string(),
            None => return (StatusCode::BAD_REQUEST, "Unknown document type").into_response(),
        },
    };

    match fetch_staff_vars(&pool, &ctx.tenant_id, &ctx.org_id, &user_id).await {
        Ok(Some(vars)) => {
            let mut html = apply_staff_vars(&html_template, &vars);

            // Apply custom overrides: replace placeholder tokens if the template
            // contains them, or inject them before the signature block.
            if let Some(ref para) = body.opening_paragraph {
                if html.contains("{{OPENING_PARAGRAPH}}") {
                    html = html.replace("{{OPENING_PARAGRAPH}}", &he(para));
                }
            }
            if let Some(ref terms) = body.terms {
                if html.contains("{{TERMS_LIST}}") {
                    let items: String = terms
                        .iter()
                        .map(|t| format!("<li>{}</li>", he(t)))
                        .collect();
                    html = html.replace("{{TERMS_LIST}}", &items);
                }
            }
            if let Some(ref notes) = body.additional_notes {
                if html.contains("{{ADDITIONAL_NOTES}}") {
                    html = html.replace("{{ADDITIONAL_NOTES}}", &he(notes));
                }
            }

            let fname = format!(
                "{}_{}.pdf",
                vars.staff_name.replace(' ', "_").to_lowercase(),
                doc_type,
            );
            html_to_pdf(&html, &fname)
        }
        Ok(None) => (StatusCode::NOT_FOUND, "User not found").into_response(),
        Err(e) => {
            tracing::error!("DB: {e}");
            (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response()
        }
    }
}

#[derive(Deserialize)]
pub struct OfferLetterCustomBody {
    pub letter_type: Option<String>,
    pub opening_paragraph: Option<String>,
    pub terms: Option<Vec<String>>,
    pub additional_notes: Option<String>,
}

#[derive(Deserialize)]
pub struct CompatQuery {
    pub letter_type: Option<String>,
}

// ── Platform HTML templates ──────────────────────────────────────────────────

static OFFER_LETTER_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page{size:A4;margin:20mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.65;color:#1e293b}
.hdr{display:flex;align-items:center;gap:18px;padding-bottom:18px;border-bottom:3px solid #0d9488;margin-bottom:28px}
.hdr-logo{height:64px;width:64px;object-fit:contain;flex-shrink:0}
.hdr-text{flex:1;text-align:center}
.org{font-size:24px;font-weight:700;color:#0d9488;margin-bottom:2px}
.sub{color:#64748b;font-size:12px}
.title{font-size:20px;font-weight:700;text-align:center;letter-spacing:1.5px;margin-bottom:22px;color:#1e293b}
.meta{display:flex;justify-content:space-between;color:#64748b;font-size:12px;margin-bottom:22px}
p{margin-bottom:14px}
table{margin:18px 0;border-radius:4px;overflow:hidden}
thead tr{background:#0d9488;color:#fff}
th,td{padding:9px 14px;text-align:left;font-size:12.5px}
tbody tr{border-bottom:1px solid #e2e8f0}
tbody tr:last-child{font-weight:700;background:#f8fafc;border-top:2px solid #0d9488}
.sec{font-size:14px;font-weight:600;color:#0d9488;margin:22px 0 10px}
ol{padding-left:20px}li{margin-bottom:6px;font-size:12.5px}
.sigs{display:flex;justify-content:space-between;margin-top:60px}
.sig{width:44%}.sigline{border-top:1px solid #cbd5e1;margin-top:50px;padding-top:8px;font-size:11.5px;color:#64748b}
.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:10px;color:#94a3b8;padding:6px;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="hdr">
  <img class="hdr-logo" src="{{ORG_LOGO}}" onerror="this.style.display='none'">
  <div class="hdr-text">
    <div class="org">{{ORG_NAME}}</div>
    <div class="sub">{{ORG_ADDRESS}}</div>
    <div class="sub">{{ORG_PHONE}}</div>
  </div>
</div>
<div class="title">OFFER LETTER</div>
<div class="meta"><span><strong>Date:</strong> {{TODAY}}</span><span><strong>Ref:</strong> {{EMP_ID}}</span></div>
<p>Dear <strong>{{STAFF_NAME}}</strong>,</p>
<p>We are pleased to offer you the position of <strong>{{DESIGNATION}}</strong> in the <strong>{{DEPARTMENT}}</strong> department at <strong>{{ORG_NAME}}</strong>. Your employee ID is <strong>{{EMP_ID}}</strong>.</p>
<p>Your expected date of joining is <strong>{{DOJ}}</strong>. This offer is valid for 15 days from the date of issue. Please confirm your acceptance by signing and returning a copy of this letter.</p>
<div class="sec">Compensation Details</div>
<table>
  <thead><tr><th>Component</th><th>Amount (Monthly)</th></tr></thead>
  <tbody>
    <tr><td>Basic Pay</td><td>{{BASIC_PAY}}</td></tr>
    <tr><td>Allowances</td><td>{{ALLOWANCES}}</td></tr>
    <tr><td>Deductions</td><td>({{DEDUCTIONS}})</td></tr>
    <tr><td>Net Pay</td><td>{{NET_PAY}}</td></tr>
  </tbody>
</table>
<div class="sec">Terms &amp; Conditions</div>
<ol>
  <li>This offer is subject to satisfactory completion of the probation period.</li>
  <li>You are expected to adhere to all policies and regulations of the institution.</li>
  <li>Compensation may be revised periodically based on performance and institutional policies.</li>
  <li>Either party may terminate this engagement with one month's written notice.</li>
  <li>All intellectual property created during employment shall belong to the institution.</li>
</ol>
<div class="sigs">
  <div class="sig"><div>For <strong>{{ORG_NAME}}</strong></div><div class="sigline">Authorised Signatory</div></div>
  <div class="sig"><div>Employee Acceptance</div><div class="sigline">{{STAFF_NAME}}</div></div>
</div>
<div class="footer">Computer-generated document &mdash; {{ORG_NAME}}</div>
</body></html>"#;

static JOINING_LETTER_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page{size:A4;margin:20mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.65;color:#1e293b}
.hdr{display:flex;align-items:center;gap:18px;padding-bottom:18px;border-bottom:3px solid #0d9488;margin-bottom:28px}
.hdr-logo{height:64px;width:64px;object-fit:contain;flex-shrink:0}
.hdr-text{flex:1;text-align:center}
.org{font-size:24px;font-weight:700;color:#0d9488;margin-bottom:2px}
.sub{color:#64748b;font-size:12px}
.title{font-size:20px;font-weight:700;text-align:center;letter-spacing:1.5px;margin-bottom:22px}
.meta{display:flex;justify-content:space-between;color:#64748b;font-size:12px;margin-bottom:22px}
p{margin-bottom:14px}
table{margin:18px 0}
thead tr{background:#0d9488;color:#fff}
th,td{padding:9px 14px;text-align:left;font-size:12.5px;border-bottom:1px solid #e2e8f0}
tbody tr:last-child{font-weight:700;background:#f8fafc;border-top:2px solid #0d9488}
.sec{font-size:14px;font-weight:600;color:#0d9488;margin:22px 0 10px}
ol{padding-left:20px}li{margin-bottom:6px;font-size:12.5px}
.sigs{display:flex;justify-content:space-between;margin-top:60px}
.sig{width:44%}.sigline{border-top:1px solid #cbd5e1;margin-top:50px;padding-top:8px;font-size:11.5px;color:#64748b}
.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:10px;color:#94a3b8;padding:6px;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="hdr">
  <img class="hdr-logo" src="{{ORG_LOGO}}" onerror="this.style.display='none'">
  <div class="hdr-text">
    <div class="org">{{ORG_NAME}}</div>
    <div class="sub">{{ORG_ADDRESS}}</div>
    <div class="sub">{{ORG_PHONE}}</div>
  </div>
</div>
<div class="title">JOINING LETTER</div>
<div class="meta"><span><strong>Date:</strong> {{TODAY}}</span><span><strong>Ref:</strong> {{EMP_ID}}</span></div>
<p>Dear <strong>{{STAFF_NAME}}</strong>,</p>
<p>We are pleased to confirm your appointment as <strong>{{DESIGNATION}}</strong> in the <strong>{{DEPARTMENT}}</strong> department at <strong>{{ORG_NAME}}</strong>. Your employee ID is <strong>{{EMP_ID}}</strong>.</p>
<p>Your date of joining is <strong>{{DOJ}}</strong>. Please report to the administration office on the aforementioned date with all required documents.</p>
<div class="sec">Compensation Details</div>
<table>
  <thead><tr><th>Component</th><th>Amount (Monthly)</th></tr></thead>
  <tbody>
    <tr><td>Basic Pay</td><td>{{BASIC_PAY}}</td></tr>
    <tr><td>Allowances</td><td>{{ALLOWANCES}}</td></tr>
    <tr><td>Deductions</td><td>({{DEDUCTIONS}})</td></tr>
    <tr><td>Net Pay</td><td>{{NET_PAY}}</td></tr>
  </tbody>
</table>
<div class="sec">Terms &amp; Conditions</div>
<ol>
  <li>Your appointment is subject to verification of all documents submitted.</li>
  <li>You will be on probation for a period of six months from the date of joining.</li>
  <li>You are bound by the service rules and code of conduct of the institution.</li>
  <li>Either party may terminate this engagement with one month's written notice.</li>
</ol>
<div class="sigs">
  <div class="sig"><div>For <strong>{{ORG_NAME}}</strong></div><div class="sigline">Authorised Signatory</div></div>
  <div class="sig"><div>Employee Acceptance</div><div class="sigline">{{STAFF_NAME}}</div></div>
</div>
<div class="footer">Computer-generated document &mdash; {{ORG_NAME}}</div>
</body></html>"#;

static BONAFIDE_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page{size:A4;margin:25mm 20mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.8;color:#1e293b}
.hdr{display:flex;align-items:center;gap:18px;margin-bottom:12px}
.hdr-logo{height:64px;width:64px;object-fit:contain;flex-shrink:0}
.hdr-text{flex:1;text-align:center}
.org{font-size:26px;font-weight:700;color:#0d9488}
.sub{font-size:12px;color:#64748b;margin-top:2px}
.divider{border:none;border-top:2px solid #0d9488;margin:12px auto;width:60%}
.title{font-size:18px;font-weight:700;text-align:center;text-decoration:underline;text-underline-offset:4px;margin:28px 0}
.serno{text-align:right;font-size:12px;color:#64748b;margin-bottom:20px}
.body{text-align:justify}
.body p{margin-bottom:16px}
.info{display:inline-block;min-width:160px;font-weight:600}
.seal{margin-top:60px;display:flex;justify-content:flex-end}
.sig{width:220px;text-align:center}
.sigline{border-top:1px solid #1e293b;padding-top:6px;margin-top:50px;font-size:12px}
.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:10px;color:#94a3b8;padding:6px;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="hdr">
  <img class="hdr-logo" src="{{ORG_LOGO}}" onerror="this.style.display='none'">
  <div class="hdr-text">
    <div class="org">{{ORG_NAME}}</div>
    <div class="sub">{{ORG_ADDRESS}}</div>
    <div class="sub">{{ORG_PHONE}}</div>
  </div>
</div>
<hr class="divider">
<div class="serno">Date: {{TODAY}}</div>
<div class="title">BONAFIDE CERTIFICATE</div>
<div class="body">
  <p>This is to certify that <span class="info">{{STUDENT_NAME}}</span> is / was a bonafide student of this institution.</p>
  <p>
    <span class="info">Class:</span> {{CLASS}}<br>
    <span class="info">Admission No.:</span> {{ADMISSION_NO}}<br>
    <span class="info">Date of Birth:</span> {{DOB}}<br>
    <span class="info">Gender:</span> {{GENDER}}<br>
    <span class="info">Academic Year:</span> {{ACADEMIC_YEAR}}
  </p>
  <p>This certificate is issued for academic/official purposes as requested by the student / guardian.</p>
</div>
<div class="seal">
  <div class="sig">
    <div class="sigline">Principal / Head of Institution<br>{{ORG_NAME}}</div>
  </div>
</div>
<div class="footer">Computer-generated document &mdash; {{ORG_NAME}}</div>
</body></html>"#;

static TRANSFER_CERT_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page{size:A4;margin:20mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.8;color:#1e293b}
.hdr{display:flex;align-items:center;gap:18px;margin-bottom:12px}
.hdr-logo{height:64px;width:64px;object-fit:contain;flex-shrink:0}
.hdr-text{flex:1;text-align:center}
.org{font-size:24px;font-weight:700;color:#0d9488}
.sub{font-size:12px;color:#64748b;margin-top:2px}
hr{border:none;border-top:2px solid #0d9488;margin:12px auto;width:60%}
.title{font-size:18px;font-weight:700;text-align:center;text-decoration:underline;margin:22px 0}
.meta{display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:18px}
table{width:100%;margin:16px 0}
td{padding:7px 0;vertical-align:top}
td:first-child{width:220px;font-weight:500;color:#475569}
.certify{margin:20px 0;font-style:italic;font-size:12.5px;color:#475569}
.sigs{display:flex;justify-content:space-between;margin-top:50px}
.sig{width:200px;text-align:center}
.sigline{border-top:1px solid #1e293b;padding-top:6px;margin-top:40px;font-size:11.5px}
.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:10px;color:#94a3b8;padding:6px;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="hdr">
  <img class="hdr-logo" src="{{ORG_LOGO}}" onerror="this.style.display='none'">
  <div class="hdr-text">
    <div class="org">{{ORG_NAME}}</div>
    <div class="sub">{{ORG_ADDRESS}}</div>
    <div class="sub">{{ORG_PHONE}}</div>
  </div>
</div>
<hr>
<div class="title">TRANSFER CERTIFICATE</div>
<div class="meta"><span>Date of Issue: {{TODAY}}</span><span>Adm No.: {{ADMISSION_NO}}</span></div>
<table>
  <tr><td>Student Name</td><td><strong>{{STUDENT_NAME}}</strong></td></tr>
  <tr><td>Father's Name</td><td>{{FATHER_NAME}}</td></tr>
  <tr><td>Date of Birth</td><td>{{DOB}}</td></tr>
  <tr><td>Gender</td><td>{{GENDER}}</td></tr>
  <tr><td>Class Last Studied</td><td>{{CLASS}}</td></tr>
  <tr><td>Date of Leaving</td><td>{{LEAVING_DATE}}</td></tr>
</table>
<p class="certify">
  Certified that the above-mentioned particulars are correct and the student is eligible for
  admission to the next higher class. This certificate is issued on the request of the parent/guardian.
</p>
<div class="sigs">
  <div class="sig"><div class="sigline">Class Teacher</div></div>
  <div class="sig"><div class="sigline">Principal / Head of Institution<br>{{ORG_NAME}}</div></div>
</div>
<div class="footer">Computer-generated document &mdash; {{ORG_NAME}}</div>
</body></html>"#;

static ID_CARD_STAFF_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page{size:85.6mm 54mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{width:85.6mm;height:54mm;font-family:'Segoe UI',Arial,sans-serif;background:#fff;overflow:hidden}
.card{display:flex;height:100%;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.left{width:26mm;background:#0d9488;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4mm}
.photo{width:18mm;height:18mm;border-radius:50%;border:2px solid #fff;background:#e2e8f0;object-fit:cover}
.org-abbr{color:#fff;font-size:7px;font-weight:700;text-align:center;margin-top:3mm;line-height:1.3}
.right{flex:1;padding:4mm 4mm 3mm 3mm;display:flex;flex-direction:column;justify-content:space-between}
.org{font-size:7px;font-weight:700;color:#0d9488;text-transform:uppercase;letter-spacing:.5px}
.name{font-size:10px;font-weight:700;color:#1e293b;margin-top:1.5mm}
.desg{font-size:8px;color:#64748b;margin-top:1mm}
.dept{font-size:7.5px;color:#94a3b8;margin-top:.5mm}
.id-row{font-size:7px;color:#475569;margin-top:2mm}
.id-row strong{color:#1e293b}
.barcode{font-size:7px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:2mm;margin-top:1mm;text-align:center;letter-spacing:2px;font-family:monospace}
</style></head><body>
<div class="card">
  <div class="left">
    <img class="photo" src="{{PHOTO_URL}}" onerror="this.style.display='none'">
    <img style="height:10mm;width:10mm;object-fit:contain;margin-top:2mm;border-radius:2px" src="{{ORG_LOGO}}" onerror="this.style.display='none'">
    <div class="org-abbr">{{ORG_NAME}}</div>
  </div>
  <div class="right">
    <div>
      <div class="org">{{ORG_NAME}}</div>
      <div class="name">{{STAFF_NAME}}</div>
      <div class="desg">{{DESIGNATION}}</div>
      <div class="dept">{{DEPARTMENT}}</div>
      <div class="id-row">ID: <strong>{{EMP_ID}}</strong></div>
    </div>
    <div class="barcode">{{EMP_ID}}</div>
  </div>
</div>
</body></html>"#;

static ID_CARD_STUDENT_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page{size:85.6mm 54mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{width:85.6mm;height:54mm;font-family:'Segoe UI',Arial,sans-serif;background:#fff;overflow:hidden}
.card{display:flex;height:100%;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.left{width:26mm;background:#1d4ed8;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4mm}
.photo{width:18mm;height:18mm;border-radius:50%;border:2px solid #fff;background:#e2e8f0;object-fit:cover}
.org-abbr{color:#fff;font-size:7px;font-weight:700;text-align:center;margin-top:3mm;line-height:1.3}
.right{flex:1;padding:4mm 4mm 3mm 3mm;display:flex;flex-direction:column;justify-content:space-between}
.org{font-size:7px;font-weight:700;color:#1d4ed8;text-transform:uppercase;letter-spacing:.5px}
.name{font-size:10px;font-weight:700;color:#1e293b;margin-top:1.5mm}
.class{font-size:8px;color:#64748b;margin-top:1mm}
.row{font-size:7px;color:#475569;margin-top:.8mm}
.row strong{color:#1e293b}
.barcode{font-size:7px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:2mm;margin-top:1mm;text-align:center;letter-spacing:2px;font-family:monospace}
</style></head><body>
<div class="card">
  <div class="left">
    <img class="photo" src="{{PHOTO_URL}}" onerror="this.style.display='none'">
    <img style="height:10mm;width:10mm;object-fit:contain;margin-top:2mm;border-radius:2px" src="{{ORG_LOGO}}" onerror="this.style.display='none'">
    <div class="org-abbr">{{ORG_NAME}}</div>
  </div>
  <div class="right">
    <div>
      <div class="org">{{ORG_NAME}}</div>
      <div class="name">{{STUDENT_NAME}}</div>
      <div class="class">Class: {{CLASS}}</div>
      <div class="row">Adm: <strong>{{ADMISSION_NO}}</strong></div>
      <div class="row">Parent: <strong>{{PARENT_NAME}}</strong></div>
      <div class="row">Ph: <strong>{{PARENT_PHONE}}</strong></div>
    </div>
    <div class="barcode">{{ADMISSION_NO}}</div>
  </div>
</div>
</body></html>"#;

static PAYSLIP_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page{size:A4;margin:20mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.65;color:#1e293b}
.hdr{display:flex;align-items:center;gap:18px;padding-bottom:16px;border-bottom:3px solid #0d9488;margin-bottom:24px}
.hdr-logo{height:64px;width:64px;object-fit:contain;flex-shrink:0}
.hdr-text{flex:1;text-align:center}
.org{font-size:24px;font-weight:700;color:#0d9488;margin-bottom:2px}
.sub{color:#64748b;font-size:12px}
.title{font-size:18px;font-weight:700;text-align:center;letter-spacing:1px;margin-bottom:20px;color:#1e293b}
.period{text-align:center;font-size:13px;color:#0d9488;font-weight:600;margin-bottom:22px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin-bottom:24px}
.info-row{display:flex;gap:8px}
.info-label{color:#64748b;font-size:12px;min-width:120px}
.info-val{font-weight:600;font-size:12px;color:#1e293b}
.sec{font-size:13px;font-weight:600;color:#0d9488;margin:0 0 10px}
table{margin-bottom:20px;border-radius:4px;overflow:hidden}
thead tr{background:#0d9488;color:#fff}
th,td{padding:9px 14px;text-align:left;font-size:12.5px}
tbody tr{border-bottom:1px solid #e2e8f0}
tbody tr.net{font-weight:700;background:#f0fdfa;border-top:2px solid #0d9488;color:#0f766e}
.sigs{display:flex;justify-content:space-between;margin-top:60px}
.sig{width:44%}.sigline{border-top:1px solid #cbd5e1;margin-top:50px;padding-top:8px;font-size:11.5px;color:#64748b}
.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:10px;color:#94a3b8;padding:6px;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="hdr">
  <img class="hdr-logo" src="{{ORG_LOGO}}" onerror="this.style.display='none'">
  <div class="hdr-text">
    <div class="org">{{ORG_NAME}}</div>
    <div class="sub">{{ORG_ADDRESS}}</div>
    <div class="sub">{{ORG_PHONE}}</div>
  </div>
</div>
<div class="title">SALARY SLIP</div>
<div class="period">Pay Period: {{MONTH_YEAR}}</div>
<div class="info-grid">
  <div class="info-row"><span class="info-label">Employee Name</span><span class="info-val">{{STAFF_NAME}}</span></div>
  <div class="info-row"><span class="info-label">Employee ID</span><span class="info-val">{{EMP_ID}}</span></div>
  <div class="info-row"><span class="info-label">Designation</span><span class="info-val">{{DESIGNATION}}</span></div>
  <div class="info-row"><span class="info-label">Department</span><span class="info-val">{{DEPARTMENT}}</span></div>
  <div class="info-row"><span class="info-label">Date of Joining</span><span class="info-val">{{DOJ}}</span></div>
  <div class="info-row"><span class="info-label">Date of Issue</span><span class="info-val">{{TODAY}}</span></div>
</div>
<div class="sec">Salary Breakdown</div>
<table>
  <thead><tr><th>Component</th><th>Amount</th></tr></thead>
  <tbody>
    <tr><td>Basic Pay</td><td>{{BASIC_PAY}}</td></tr>
    <tr><td>Allowances</td><td>{{ALLOWANCES}}</td></tr>
    <tr><td>Deductions</td><td>({{DEDUCTIONS}})</td></tr>
    <tr class="net"><td>Net Pay</td><td>{{NET_PAY}}</td></tr>
  </tbody>
</table>
<div class="sigs">
  <div class="sig"><div>Accounts / Payroll</div><div class="sigline">Authorised Signatory</div></div>
  <div class="sig"><div>Employee Acknowledgement</div><div class="sigline">{{STAFF_NAME}}</div></div>
</div>
<div class="footer">Computer-generated payslip &mdash; {{ORG_NAME}} &mdash; {{MONTH_YEAR}}</div>
</body></html>"#;

static FEE_SLIP_HTML: &str = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
@page{size:A4;margin:20mm}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.65;color:#1e293b}
.hdr{display:flex;align-items:center;gap:18px;padding-bottom:16px;border-bottom:3px solid #0d9488;margin-bottom:24px}
.hdr-logo{height:64px;width:64px;object-fit:contain;flex-shrink:0}
.hdr-text{flex:1;text-align:center}
.org{font-size:24px;font-weight:700;color:#0d9488;margin-bottom:2px}
.sub{color:#64748b;font-size:12px}
.title{font-size:18px;font-weight:700;text-align:center;letter-spacing:1px;margin-bottom:22px}
.receipt-row{display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:22px}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;margin-bottom:24px}
.info-row{display:flex;gap:8px}
.info-label{color:#64748b;font-size:12px;min-width:120px}
.info-val{font-weight:600;font-size:12px;color:#1e293b}
.sec{font-size:13px;font-weight:600;color:#0d9488;margin:0 0 10px}
table{margin-bottom:20px;border-radius:4px;overflow:hidden}
thead tr{background:#0d9488;color:#fff}
th,td{padding:9px 14px;text-align:left;font-size:12.5px}
tbody tr{border-bottom:1px solid #e2e8f0}
tbody tr.balance{font-weight:700;background:#f8fafc;border-top:2px solid #0d9488}
.status-badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.5px}
.status-paid{background:#d1fae5;color:#065f46}
.status-partial{background:#fef9c3;color:#92400e}
.status-pending,.status-overdue{background:#fee2e2;color:#991b1b}
.sigs{display:flex;justify-content:space-between;margin-top:60px}
.sig{width:44%}.sigline{border-top:1px solid #cbd5e1;margin-top:50px;padding-top:8px;font-size:11.5px;color:#64748b}
.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:10px;color:#94a3b8;padding:6px;border-top:1px solid #e2e8f0}
</style></head><body>
<div class="hdr">
  <img class="hdr-logo" src="{{ORG_LOGO}}" onerror="this.style.display='none'">
  <div class="hdr-text">
    <div class="org">{{ORG_NAME}}</div>
    <div class="sub">{{ORG_ADDRESS}}</div>
    <div class="sub">{{ORG_PHONE}}</div>
  </div>
</div>
<div class="title">FEE RECEIPT</div>
<div class="receipt-row">
  <span><strong>Receipt No.:</strong> {{RECEIPT_NO}}</span>
  <span><strong>Date:</strong> {{TODAY}}</span>
</div>
<div class="sec">Student Details</div>
<div class="info-grid">
  <div class="info-row"><span class="info-label">Student Name</span><span class="info-val">{{STUDENT_NAME}}</span></div>
  <div class="info-row"><span class="info-label">Class</span><span class="info-val">{{CLASS}}</span></div>
  <div class="info-row"><span class="info-label">Admission No.</span><span class="info-val">{{ADMISSION_NO}}</span></div>
  <div class="info-row"><span class="info-label">Payment Mode</span><span class="info-val">{{PAYMENT_MODE}}</span></div>
</div>
<div class="sec">Fee Details</div>
<table>
  <thead><tr><th>Description</th><th>Amount Due</th><th>Amount Paid</th><th>Balance</th></tr></thead>
  <tbody>
    <tr><td>{{FEE_NAME}}</td><td>{{AMOUNT_DUE}}</td><td>{{AMOUNT_PAID}}</td><td>{{BALANCE}}</td></tr>
    <tr class="balance"><td colspan="2">Due Date: {{DUE_DATE}} &nbsp;|&nbsp; Paid Date: {{PAID_DATE}}</td><td colspan="2">Balance: {{BALANCE}}</td></tr>
  </tbody>
</table>
<div style="margin-bottom:24px">
  Status: <span class="status-badge status-{{STATUS_LOWER}}">{{STATUS}}</span>
</div>
<div class="sigs">
  <div class="sig"><div>For <strong>{{ORG_NAME}}</strong></div><div class="sigline">Accounts / Fee Clerk</div></div>
  <div class="sig"><div>Parent / Guardian Acknowledgement</div><div class="sigline">&nbsp;</div></div>
</div>
<div class="footer">Computer-generated fee receipt &mdash; {{ORG_NAME}} &mdash; {{TODAY}}</div>
</body></html>"#;

// Keep the unused import warning from appearing
const _: &str = PRINT_CSS;
