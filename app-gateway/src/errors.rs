use async_graphql::ErrorExtensions;
use std::fmt;

/// Unified application error type.
///
/// Implements `ErrorExtensions` so resolvers can convert it into a rich
/// `async_graphql::Error` with an error code via `.extend()`.
#[derive(Debug)]
#[allow(dead_code)]
pub enum AppError {
    Db(sqlx::Error),
    Auth(String),
    Validation(String),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Db(e) => write!(f, "Database error: {e}"),
            AppError::Auth(msg) => write!(f, "{msg}"),
            AppError::Validation(msg) => write!(f, "{msg}"),
        }
    }
}

impl std::error::Error for AppError {}

impl From<sqlx::Error> for AppError {
    fn from(e: sqlx::Error) -> Self {
        AppError::Db(e)
    }
}

impl ErrorExtensions for AppError {
    fn extend(&self) -> async_graphql::Error {
        match self {
            AppError::Auth(msg) => async_graphql::Error::new(msg.clone()).extend_with(
                |_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "UNAUTHENTICATED");
                },
            ),
            AppError::Validation(msg) => async_graphql::Error::new(msg.clone()).extend_with(
                |_, ext: &mut async_graphql::ErrorExtensionValues| {
                    ext.set("code", "BAD_USER_INPUT");
                },
            ),
            AppError::Db(e) => {
                tracing::error!("Database error: {e}");
                async_graphql::Error::new("Internal server error").extend_with(
                    |_, ext: &mut async_graphql::ErrorExtensionValues| {
                        ext.set("code", "INTERNAL_SERVER_ERROR");
                    },
                )
            }
        }
    }
}
