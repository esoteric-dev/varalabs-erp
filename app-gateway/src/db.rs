use std::future::Future;
use std::pin::Pin;

use sqlx::PgPool;

use crate::errors::AppError;

/// Validate that an identifier is safe to interpolate into a `SET LOCAL` statement.
/// Allows only hex digits and hyphens (covers UUID format `xxxxxxxx-xxxx-…`).
fn validate_id(value: &str, label: &str) -> Result<(), AppError> {
    if value.is_empty() {
        return Err(AppError::Validation(format!("{label} must not be empty")));
    }
    if !value
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        return Err(AppError::Validation(format!(
            "{label} contains invalid characters"
        )));
    }
    Ok(())
}

/// Execute a database operation scoped to a specific tenant **and** organisation
/// via PostgreSQL RLS.
///
/// This function:
/// 1. Opens a transaction.
/// 2. Sets `app.current_tenant` and `app.current_org` for the duration of the
///    transaction (`SET LOCAL`).
/// 3. Runs the caller-supplied closure with the connection.
/// 4. Commits and returns the result.
///
/// Because `SET LOCAL` is transaction-scoped, the variables are automatically
/// cleared when the transaction ends — no risk of state leaking between requests.
pub async fn execute_in_context<T, F>(
    pool: &PgPool,
    tenant_id: &str,
    org_id: &str,
    f: F,
) -> Result<T, AppError>
where
    T: Send,
    F: for<'c> FnOnce(
        &'c mut sqlx::PgConnection,
    ) -> Pin<Box<dyn Future<Output = Result<T, AppError>> + Send + 'c>>,
{
    validate_id(tenant_id, "tenant_id")?;
    validate_id(org_id, "org_id")?;

    let mut tx = pool.begin().await?;

    // Drop to a non-privileged role so RLS policies are enforced.
    // The pool connects as avnadmin (BYPASSRLS), so without this the
    // policies would be silently skipped.
    sqlx::query("SET LOCAL ROLE app_user")
        .execute(&mut *tx)
        .await?;

    // PostgreSQL SET does not support $1 bind parameters, so we use format!().
    // Safety: both ids are validated above to contain only [a-zA-Z0-9_-].
    sqlx::query(&format!("SET LOCAL app.current_tenant = '{tenant_id}'"))
        .execute(&mut *tx)
        .await?;
    sqlx::query(&format!("SET LOCAL app.current_org = '{org_id}'"))
        .execute(&mut *tx)
        .await?;

    let result = f(&mut *tx).await?;

    tx.commit().await?;

    Ok(result)
}
