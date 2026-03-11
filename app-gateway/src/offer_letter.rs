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

#[derive(sqlx::FromRow)]
struct OfferLetterData {
    user_name: String,
    employee_id: Option<String>,
    designation: Option<String>,
    department: Option<String>,
    date_of_joining: Option<String>,
    basic_pay: Option<i64>,
    allowances: Option<i64>,
    deductions: Option<i64>,
    org_name: String,
}

#[derive(Deserialize)]
pub struct OfferLetterQuery {
    #[serde(default = "default_letter_type")]
    letter_type: String,
}

#[derive(Deserialize)]
pub struct GenerateOfferLetterBody {
    #[serde(default = "default_letter_type")]
    pub letter_type: String,
    /// Custom opening paragraph (plain text). If omitted, uses the default.
    pub opening_paragraph: Option<String>,
    /// Custom terms & conditions (plain text items). If omitted, uses defaults.
    pub terms: Option<Vec<String>>,
    /// Optional extra notes appended after terms (plain text).
    pub additional_notes: Option<String>,
}

fn default_letter_type() -> String {
    "offer".to_string()
}

/// Escape special LaTeX characters in user-provided text.
fn latex_escape(s: &str) -> String {
    s.replace('\\', r"\textbackslash{}")
        .replace('&', r"\&")
        .replace('%', r"\%")
        .replace('$', r"\$")
        .replace('#', r"\#")
        .replace('_', r"\_")
        .replace('{', r"\{")
        .replace('}', r"\}")
        .replace('~', r"\textasciitilde{}")
        .replace('^', r"\textasciicircum{}")
}

fn format_currency(paise: i64) -> String {
    let rupees = paise as f64 / 100.0;
    // Format with Indian numbering system
    let whole = rupees as i64;
    if whole >= 10_000_000 {
        format!("Rs. {:.2} Cr", rupees / 10_000_000.0)
    } else if whole >= 100_000 {
        format!("Rs. {:.2} L", rupees / 100_000.0)
    } else {
        format!("Rs. {:.0}/-", rupees)
    }
}

/// Returns the default offer letter LaTeX template with placeholder tokens.
/// Available placeholders:
///   {{NAME}}, {{ORG}}, {{DESIGNATION}}, {{DEPARTMENT}}, {{EMP_ID}},
///   {{DOJ}}, {{BASIC_FMT}}, {{ALLOW_FMT}}, {{DEDUCT_FMT}}, {{NET_FMT}},
///   {{TITLE}}, {{TODAY}}, {{LETTER_ACTION}}, {{JOINING_CLAUSE}}, {{LETTER_TYPE_LOWER}}
pub fn default_template_content() -> String {
    r#"\documentclass[12pt,a4paper]{article}
\usepackage[margin=1in]{geometry}
\usepackage{graphicx}
\usepackage{array}
\usepackage{booktabs}
\usepackage{xcolor}
\usepackage{fancyhdr}
\usepackage{parskip}

\definecolor{primary}{HTML}{0D9488}
\definecolor{darktext}{HTML}{1E293B}
\definecolor{lighttext}{HTML}{64748B}

\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyfoot[C]{\footnotesize\color{lighttext} This is a computer-generated document. | {{ORG}}}

\begin{document}

% ── Header ──────────────────────────────────────────────────────────
\begin{center}
\vspace*{0.5cm}

{\fontsize{28}{34}\selectfont\bfseries\color{primary} {{ORG}}}

\vspace{0.3cm}
{\large\color{lighttext} Educational Institution}

\vspace{0.2cm}
\textcolor{primary}{\rule{0.4\textwidth}{1.5pt}}

\vspace{0.8cm}
{\LARGE\bfseries\color{darktext} {{TITLE}}}
\vspace{0.3cm}
\end{center}

% ── Date and Reference ──────────────────────────────────────────────
\begin{flushright}
\color{lighttext}
\textbf{Date:} {{TODAY}}\\
\textbf{Ref:} {{EMP_ID}}
\end{flushright}

\vspace{0.5cm}

% ── Body ────────────────────────────────────────────────────────────
\color{darktext}

Dear \textbf{{{NAME}}},

We are pleased to {{LETTER_ACTION}} you the position of \textbf{{{DESIGNATION}}} in the \textbf{{{DEPARTMENT}}} department at \textbf{{{ORG}}}. Your employee ID is \textbf{{{EMP_ID}}}.

{{JOINING_CLAUSE}}

% ── Compensation ────────────────────────────────────────────────────
\vspace{0.5cm}
\subsection*{\color{primary} Compensation Details}

\begin{center}
\begin{tabular}{>{}l >{}r}
\toprule
\textbf{Component} & \textbf{Amount (Monthly)} \\
\midrule
Basic Pay & {{BASIC_FMT}} \\
Allowances & {{ALLOW_FMT}} \\
Deductions & ({{DEDUCT_FMT}}) \\
\midrule
\textbf{Net Pay} & \textbf{{{NET_FMT}}} \\
\bottomrule
\end{tabular}
\end{center}

% ── Terms ───────────────────────────────────────────────────────────
\vspace{0.5cm}
\subsection*{\color{primary} Terms \& Conditions}

\begin{enumerate}
\item This {{LETTER_TYPE_LOWER}} is subject to satisfactory completion of the probation period.
\item You are expected to adhere to the policies, rules, and regulations of the institution.
\item Your compensation may be revised periodically based on performance and institutional policies.
\item Either party may terminate this engagement by providing one month's written notice.
\item All intellectual property created during the course of employment shall belong to the institution.
\end{enumerate}

% ── Signature ───────────────────────────────────────────────────────
\vspace{1.5cm}

\begin{minipage}[t]{0.45\textwidth}
\textbf{For {{ORG}}}\\[1.5cm]
\rule{0.8\textwidth}{0.5pt}\\
Authorized Signatory\\
\color{lighttext}\small Date: \rule{3cm}{0.5pt}
\end{minipage}
\hfill
\begin{minipage}[t]{0.45\textwidth}
\textbf{Employee Acceptance}\\[1.5cm]
\rule{0.8\textwidth}{0.5pt}\\
{{NAME}}\\
\color{lighttext}\small Date: \rule{3cm}{0.5pt}
\end{minipage}

\end{document}
"#.to_string()
}

/// Resolved data values used when building the final LaTeX document.
struct ResolvedValues {
    name: String,
    org: String,
    emp_id: String,
    designation: String,
    department: String,
    doj: String,
    basic_fmt: String,
    allow_fmt: String,
    deduct_fmt: String,
    net_fmt: String,
    title: String,
    today: String,
    letter_action: String,
    joining_clause: String,
    letter_type_lower: String,
}

fn resolve_values(data: &OfferLetterData, letter_type: &str) -> ResolvedValues {
    let name = latex_escape(&data.user_name);
    let org = latex_escape(&data.org_name);
    let emp_id = data
        .employee_id
        .as_deref()
        .map(latex_escape)
        .unwrap_or_default();
    let designation = data
        .designation
        .as_deref()
        .map(latex_escape)
        .unwrap_or_else(|| "Staff".to_string());
    let department = data
        .department
        .as_deref()
        .map(latex_escape)
        .unwrap_or_else(|| "General".to_string());
    let doj = data
        .date_of_joining
        .as_deref()
        .unwrap_or("the date of joining")
        .to_string();

    let basic = data.basic_pay.unwrap_or(0);
    let allowances = data.allowances.unwrap_or(0);
    let deductions = data.deductions.unwrap_or(0);
    let net = basic + allowances - deductions;

    let title = if letter_type == "joining" {
        "JOINING LETTER"
    } else {
        "OFFER LETTER"
    }
    .to_string();

    let letter_action = if letter_type == "joining" {
        "confirm"
    } else {
        "offer"
    }
    .to_string();

    let joining_clause = if letter_type == "joining" {
        format!(
            "Your date of joining is \\textbf{{{}}}. Please report to the administration office on the aforementioned date with all required documents.",
            doj
        )
    } else {
        format!(
            "Your expected date of joining is \\textbf{{{}}}. This offer is valid for 15 days from the date of issue. Please confirm your acceptance by signing and returning a copy of this letter.",
            doj
        )
    };

    let today = chrono::Utc::now().format("%B %d, %Y").to_string();

    ResolvedValues {
        name,
        org,
        emp_id,
        designation,
        department,
        doj,
        basic_fmt: format_currency(basic),
        allow_fmt: format_currency(allowances),
        deduct_fmt: format_currency(deductions),
        net_fmt: format_currency(net),
        title,
        today,
        letter_action,
        joining_clause,
        letter_type_lower: letter_type.to_string(),
    }
}

/// Build a LaTeX document by replacing placeholders in a template with actual data.
fn build_latex_from_template(data: &OfferLetterData, letter_type: &str, template: &str) -> String {
    let v = resolve_values(data, letter_type);

    template
        .replace("{{NAME}}", &v.name)
        .replace("{{ORG}}", &v.org)
        .replace("{{DESIGNATION}}", &v.designation)
        .replace("{{DEPARTMENT}}", &v.department)
        .replace("{{EMP_ID}}", &v.emp_id)
        .replace("{{DOJ}}", &v.doj)
        .replace("{{BASIC_FMT}}", &v.basic_fmt)
        .replace("{{ALLOW_FMT}}", &v.allow_fmt)
        .replace("{{DEDUCT_FMT}}", &v.deduct_fmt)
        .replace("{{NET_FMT}}", &v.net_fmt)
        .replace("{{TITLE}}", &v.title)
        .replace("{{TODAY}}", &v.today)
        .replace("{{LETTER_ACTION}}", &v.letter_action)
        .replace("{{JOINING_CLAUSE}}", &v.joining_clause)
        .replace("{{LETTER_TYPE_LOWER}}", &v.letter_type_lower)
}

/// Build LaTeX using the default built-in template.
fn build_latex(data: &OfferLetterData, letter_type: &str) -> String {
    let template = default_template_content();
    build_latex_from_template(data, letter_type, &template)
}

/// Default opening paragraph (plain text, will be LaTeX-escaped).
fn default_opening_paragraph(v: &ResolvedValues) -> String {
    format!(
        "We are pleased to {} you the position of {} in the {} department at {}. Your employee ID is {}.",
        v.letter_action, v.designation, v.department, v.org, v.emp_id
    )
}

/// Default terms & conditions items (plain text).
fn default_terms(letter_type: &str) -> Vec<String> {
    vec![
        format!("This {} is subject to satisfactory completion of the probation period.", letter_type),
        "You are expected to adhere to the policies, rules, and regulations of the institution.".to_string(),
        "Your compensation may be revised periodically based on performance and institutional policies.".to_string(),
        "Either party may terminate this engagement by providing one month's written notice.".to_string(),
        "All intellectual property created during the course of employment shall belong to the institution.".to_string(),
    ]
}

/// Public accessor for default terms (used by GraphQL query).
pub fn get_default_terms(letter_type: &str) -> Vec<String> {
    default_terms(letter_type)
}

/// Build LaTeX with structured user-editable fields (no LaTeX knowledge needed).
fn build_latex_with_fields(
    data: &OfferLetterData,
    letter_type: &str,
    opening_paragraph: Option<&str>,
    terms: Option<&[String]>,
    additional_notes: Option<&str>,
) -> String {
    let v = resolve_values(data, letter_type);

    // Build the opening paragraph
    let opening = match opening_paragraph {
        Some(text) if !text.trim().is_empty() => latex_escape(text.trim()),
        _ => default_opening_paragraph(&v),
    };

    // Build terms list
    let terms_items = match terms {
        Some(items) if !items.is_empty() => items
            .iter()
            .map(|t| format!("\\item {}", latex_escape(t.trim())))
            .collect::<Vec<_>>()
            .join("\n"),
        _ => default_terms(letter_type)
            .iter()
            .map(|t| format!("\\item {}", t))
            .collect::<Vec<_>>()
            .join("\n"),
    };

    // Build additional notes section
    let notes_section = match additional_notes {
        Some(text) if !text.trim().is_empty() => format!(
            r#"\vspace{{0.5cm}}
\subsection*{{\color{{primary}} Additional Notes}}

{}"#,
            latex_escape(text.trim())
        ),
        _ => String::new(),
    };

    format!(
        r#"\documentclass[12pt,a4paper]{{article}}
\usepackage[margin=1in]{{geometry}}
\usepackage{{graphicx}}
\usepackage{{array}}
\usepackage{{booktabs}}
\usepackage{{xcolor}}
\usepackage{{fancyhdr}}
\usepackage{{parskip}}

\definecolor{{primary}}{{HTML}}{{0D9488}}
\definecolor{{darktext}}{{HTML}}{{1E293B}}
\definecolor{{lighttext}}{{HTML}}{{64748B}}

\pagestyle{{fancy}}
\fancyhf{{}}
\renewcommand{{\headrulewidth}}{{0pt}}
\fancyfoot[C]{{\footnotesize\color{{lighttext}} This is a computer-generated document. | {org}}}

\begin{{document}}

% ── Header ──────────────────────────────────────────────────────────
\begin{{center}}
\vspace*{{0.5cm}}

{{\fontsize{{28}}{{34}}\selectfont\bfseries\color{{primary}} {org}}}

\vspace{{0.3cm}}
{{\large\color{{lighttext}} Educational Institution}}

\vspace{{0.2cm}}
\textcolor{{primary}}{{\rule{{0.4\textwidth}}{{1.5pt}}}}

\vspace{{0.8cm}}
{{\LARGE\bfseries\color{{darktext}} {title}}}
\vspace{{0.3cm}}
\end{{center}}

% ── Date and Reference ──────────────────────────────────────────────
\begin{{flushright}}
\color{{lighttext}}
\textbf{{Date:}} {today}\\
\textbf{{Ref:}} {emp_id}
\end{{flushright}}

\vspace{{0.5cm}}

% ── Body ────────────────────────────────────────────────────────────
\color{{darktext}}

Dear \textbf{{{name}}},

{opening}

{joining_clause}

% ── Compensation ────────────────────────────────────────────────────
\vspace{{0.5cm}}
\subsection*{{\color{{primary}} Compensation Details}}

\begin{{center}}
\begin{{tabular}}{{>{{}}l >{{}}r}}
\toprule
\textbf{{Component}} & \textbf{{Amount (Monthly)}} \\
\midrule
Basic Pay & {basic_fmt} \\
Allowances & {allow_fmt} \\
Deductions & ({deduct_fmt}) \\
\midrule
\textbf{{Net Pay}} & \textbf{{{net_fmt}}} \\
\bottomrule
\end{{tabular}}
\end{{center}}

% ── Terms ───────────────────────────────────────────────────────────
\vspace{{0.5cm}}
\subsection*{{\color{{primary}} Terms \& Conditions}}

\begin{{enumerate}}
{terms_items}
\end{{enumerate}}

{notes_section}

% ── Signature ───────────────────────────────────────────────────────
\vspace{{1.5cm}}

\begin{{minipage}}[t]{{0.45\textwidth}}
\textbf{{For {org}}}\\[1.5cm]
\rule{{0.8\textwidth}}{{0.5pt}}\\
Authorized Signatory\\
\color{{lighttext}}\small Date: \rule{{3cm}}{{0.5pt}}
\end{{minipage}}
\hfill
\begin{{minipage}}[t]{{0.45\textwidth}}
\textbf{{Employee Acceptance}}\\[1.5cm]
\rule{{0.8\textwidth}}{{0.5pt}}\\
{name}\\
\color{{lighttext}}\small Date: \rule{{3cm}}{{0.5pt}}
\end{{minipage}}

\end{{document}}
"#,
        org = v.org,
        title = v.title,
        today = v.today,
        emp_id = v.emp_id,
        name = v.name,
        opening = opening,
        joining_clause = v.joining_clause,
        basic_fmt = v.basic_fmt,
        allow_fmt = v.allow_fmt,
        deduct_fmt = v.deduct_fmt,
        net_fmt = v.net_fmt,
        terms_items = terms_items,
        notes_section = notes_section,
    )
}

/// Fetch employee data from the database for offer letter generation.
async fn fetch_offer_letter_data(
    pool: &PgPool,
    tenant_id: &str,
    org_id: &str,
    user_id: &str,
) -> std::result::Result<Option<OfferLetterData>, crate::errors::AppError> {
    let uid = user_id.to_string();
    execute_in_context(pool, tenant_id, org_id, |conn| {
        Box::pin(async move {
            let row = sqlx::query_as::<_, OfferLetterData>(
                "SELECT
                    u.name AS user_name,
                    uo.employee_id,
                    sd.designation,
                    sd.department,
                    sd.date_of_joining::text,
                    ss.basic_pay,
                    ss.allowances,
                    ss.deductions,
                    o.name AS org_name
                 FROM users u
                 JOIN user_organisations uo ON uo.user_id = u.id
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
            Ok(row)
        })
    })
    .await
}

/// Compile LaTeX source to PDF and return the response.
fn compile_and_respond(latex_src: &str, user_name: &str, letter_type: &str) -> Response {
    let tmp_dir = match tempfile::tempdir() {
        Ok(d) => d,
        Err(e) => {
            tracing::error!("Failed to create temp dir: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Server error").into_response();
        }
    };

    let tex_path = tmp_dir.path().join("letter.tex");
    if let Err(e) = std::fs::File::create(&tex_path).and_then(|mut f| f.write_all(latex_src.as_bytes())) {
        tracing::error!("Failed to write .tex file: {e}");
        return (StatusCode::INTERNAL_SERVER_ERROR, "Server error").into_response();
    }

    // Try tectonic first, then pdflatex
    let compile_result = Command::new("tectonic")
        .arg(&tex_path)
        .arg("--outdir")
        .arg(tmp_dir.path())
        .output()
        .or_else(|_| {
            Command::new("pdflatex")
                .arg("-interaction=nonstopmode")
                .arg(format!("-output-directory={}", tmp_dir.path().display()))
                .arg(&tex_path)
                .output()
        });

    match compile_result {
        Ok(output) if output.status.success() => {
            let pdf_path = tmp_dir.path().join("letter.pdf");
            match std::fs::read(&pdf_path) {
                Ok(pdf_bytes) => {
                    let filename = format!(
                        "{}_{}_letter.pdf",
                        user_name.replace(' ', "_").to_lowercase(),
                        letter_type
                    );
                    (
                        StatusCode::OK,
                        [
                            (header::CONTENT_TYPE, "application/pdf"),
                            (
                                header::CONTENT_DISPOSITION,
                                &format!("attachment; filename=\"{}\"", filename),
                            ),
                        ],
                        pdf_bytes,
                    )
                        .into_response()
                }
                Err(e) => {
                    tracing::error!("Failed to read generated PDF: {e}");
                    (StatusCode::INTERNAL_SERVER_ERROR, "PDF generation failed").into_response()
                }
            }
        }
        Ok(output) => {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let stdout = String::from_utf8_lossy(&output.stdout);
            tracing::error!("LaTeX compilation failed.\nstdout: {stdout}\nstderr: {stderr}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("LaTeX compilation failed: {stderr}"),
            )
                .into_response()
        }
        Err(e) => {
            tracing::error!("Neither tectonic nor pdflatex found: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "LaTeX compiler not found. Install tectonic or texlive-latex-base.",
            )
                .into_response()
        }
    }
}

/// Check auth and permission for offer letter endpoints. Returns the UserContext.
fn check_offer_letter_auth(user_ctx: &Option<Extension<UserContext>>) -> std::result::Result<&UserContext, Response> {
    match user_ctx {
        Some(Extension(ctx)) => {
            if ctx.system_role != crate::auth::SystemRole::Superadmin
                && !ctx.permissions.contains("users.view")
            {
                return Err((StatusCode::FORBIDDEN, "Access denied").into_response());
            }
            Ok(ctx)
        }
        None => Err((StatusCode::UNAUTHORIZED, "Authentication required").into_response()),
    }
}

/// GET /api/offer-letter/{user_id} -- generate with default template (backward-compatible).
pub async fn offer_letter_handler(
    Path(user_id): Path<String>,
    Query(params): Query<OfferLetterQuery>,
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
) -> Response {
    let ctx = match check_offer_letter_auth(&user_ctx) {
        Ok(c) => c,
        Err(resp) => return resp,
    };

    let data = match fetch_offer_letter_data(&pool, &ctx.tenant_id, &ctx.org_id, &user_id).await {
        Ok(Some(data)) => data,
        Ok(None) => return (StatusCode::NOT_FOUND, "User not found").into_response(),
        Err(e) => {
            tracing::error!("DB error fetching offer letter data: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response();
        }
    };

    let latex_src = build_latex(&data, &params.letter_type);
    compile_and_respond(&latex_src, &data.user_name, &params.letter_type)
}

/// POST /api/offer-letter/{user_id} -- generate with optional custom fields.
pub async fn generate_offer_letter_handler(
    Path(user_id): Path<String>,
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    axum::Json(body): axum::Json<GenerateOfferLetterBody>,
) -> Response {
    let ctx = match check_offer_letter_auth(&user_ctx) {
        Ok(c) => c,
        Err(resp) => return resp,
    };

    let data = match fetch_offer_letter_data(&pool, &ctx.tenant_id, &ctx.org_id, &user_id).await {
        Ok(Some(data)) => data,
        Ok(None) => return (StatusCode::NOT_FOUND, "User not found").into_response(),
        Err(e) => {
            tracing::error!("DB error fetching offer letter data: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response();
        }
    };

    let has_customizations = body.opening_paragraph.is_some()
        || body.terms.is_some()
        || body.additional_notes.is_some();

    let latex_src = if has_customizations {
        build_latex_with_fields(
            &data,
            &body.letter_type,
            body.opening_paragraph.as_deref(),
            body.terms.as_deref(),
            body.additional_notes.as_deref(),
        )
    } else {
        build_latex(&data, &body.letter_type)
    };

    compile_and_respond(&latex_src, &data.user_name, &body.letter_type)
}
