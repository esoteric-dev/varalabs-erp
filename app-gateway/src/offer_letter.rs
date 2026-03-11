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

fn build_latex(data: &OfferLetterData, letter_type: &str) -> String {
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
        .unwrap_or("the date of joining");

    let basic = data.basic_pay.unwrap_or(0);
    let allowances = data.allowances.unwrap_or(0);
    let deductions = data.deductions.unwrap_or(0);
    let net = basic + allowances - deductions;

    let title = if letter_type == "joining" {
        "JOINING LETTER"
    } else {
        "OFFER LETTER"
    };

    let today = chrono::Utc::now().format("%B %d, %Y").to_string();

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

We are pleased to {letter_action} you the position of \textbf{{{designation}}} in the \textbf{{{department}}} department at \textbf{{{org}}}. Your employee ID is \textbf{{{emp_id}}}.

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
\item This {letter_type_lower} is subject to satisfactory completion of the probation period.
\item You are expected to adhere to the policies, rules, and regulations of the institution.
\item Your compensation may be revised periodically based on performance and institutional policies.
\item Either party may terminate this engagement by providing one month's written notice.
\item All intellectual property created during the course of employment shall belong to the institution.
\end{{enumerate}}

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
        org = org,
        title = title,
        today = today,
        emp_id = emp_id,
        name = name,
        designation = designation,
        department = department,
        letter_action = if letter_type == "joining" {
            "confirm"
        } else {
            "offer"
        },
        joining_clause = if letter_type == "joining" {
            format!(
                "Your date of joining is \\textbf{{{}}}. Please report to the administration office on the aforementioned date with all required documents.",
                doj
            )
        } else {
            format!(
                "Your expected date of joining is \\textbf{{{}}}. This offer is valid for 15 days from the date of issue. Please confirm your acceptance by signing and returning a copy of this letter.",
                doj
            )
        },
        basic_fmt = format_currency(basic),
        allow_fmt = format_currency(allowances),
        deduct_fmt = format_currency(deductions),
        net_fmt = format_currency(net),
        letter_type_lower = letter_type,
    )
}

pub async fn offer_letter_handler(
    Path(user_id): Path<String>,
    Query(params): Query<OfferLetterQuery>,
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
) -> Response {
    // Require authentication
    let ctx = match user_ctx {
        Some(Extension(ctx)) => ctx,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                "Authentication required",
            )
                .into_response();
        }
    };

    // Check permission
    if ctx.system_role != crate::auth::SystemRole::Superadmin
        && !ctx.permissions.contains("users.view")
    {
        return (StatusCode::FORBIDDEN, "Access denied").into_response();
    }

    let tenant_id = ctx.tenant_id.clone();
    let org_id = ctx.org_id.clone();

    // Fetch employee data from DB
    let data = match execute_in_context(&pool, &tenant_id, &org_id, |conn| {
        let uid = user_id.clone();
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
    {
        Ok(Some(data)) => data,
        Ok(None) => {
            return (StatusCode::NOT_FOUND, "User not found").into_response();
        }
        Err(e) => {
            tracing::error!("DB error fetching offer letter data: {e}");
            return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response();
        }
    };

    // Generate LaTeX
    let latex_src = build_latex(&data, &params.letter_type);

    // Compile LaTeX to PDF in a temp directory
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
                        data.user_name.replace(' ', "_").to_lowercase(),
                        params.letter_type
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
