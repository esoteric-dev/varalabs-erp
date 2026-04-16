mod auth;
mod db;
mod errors;
mod graphql;
mod documents;
mod mobile;
mod offer_letter; // kept for any remaining internal references
mod storage;
mod uploads;

use axum::{extract::Extension, middleware, routing::{delete, get, post}, Router};
use aws_sdk_s3::Client as S3Client;
use sqlx::postgres::PgPoolOptions;
use std::env;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::EnvFilter;

use crate::auth::{auth_middleware, UserContext};
use crate::graphql::{build_schema, AppSchema};

use async_graphql_axum::{GraphQLRequest, GraphQLResponse};

/// GraphQL handler that bridges Axum extensions → async-graphql context data.
async fn graphql_handler(
    Extension(schema): Extension<AppSchema>,
    user_ctx: Option<Extension<UserContext>>,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let mut request = req.into_inner();

    if let Some(Extension(ctx)) = user_ctx {
        request = request.data(ctx);
    }

    schema.execute(request).await.into()
}

#[tokio::main]
async fn main() {
    // Load .env file if present (ignored in production where env vars are set directly).
    dotenvy::dotenv().ok();

    // Initialise structured logging.
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("app_gateway=debug,tower_http=debug")),
        )
        .init();

    // Connect to PostgreSQL.
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .connect(&database_url)
        .await
        .expect("Failed to connect to PostgreSQL");

    tracing::info!("Connected to PostgreSQL");

    // Run migrations.
    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Failed to run database migrations");

    tracing::info!("Migrations applied");

    // Initialize S3-compatible storage (MinIO, R2, Backblaze, Wasabi, AWS S3, etc.)
    let s3_client = storage::init_s3_client();

    // Build the async-graphql schema.
    let pool_for_middleware = pool.clone();
    let pool_for_ext = pool.clone();
    let schema = build_schema(pool);

    // CORS — allow the frontend origin during development.
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Assemble the Axum router.
    let app = Router::new()
        // Health check — used by monitoring and Android connectivity pre-flight.
        .route("/health", get(|| async { "ok" }))
        .route("/graphql", post(graphql_handler))
        // Mobile REST auth endpoints (unauthenticated)
        .route("/api/mobile/auth", post(mobile::mobile_auth_handler))
        .route("/api/mobile/auth/select-org", post(mobile::mobile_select_org_handler))
        .route("/api/mobile/refresh", post(mobile::mobile_refresh_handler))
        // Mobile logout (requires Bearer token)
        .route("/api/mobile/logout", delete(mobile::mobile_logout_handler))
        // New document generation endpoints
        .route("/api/documents/{entity_id}/generate", get(documents::generate_document_handler))
        .route("/api/documents/preview", post(documents::preview_document_handler))
        // Backward-compatible offer letter path (GET = default template, POST = custom content)
        .route("/api/offer-letter/{user_id}", get(documents::offer_letter_compat_handler))
        .route("/api/offer-letter/{user_id}", post(documents::offer_letter_custom_handler))
        .route("/api/organisations/logo", post(uploads::upload_org_logo))
        .route("/api/students/{student_id}/photo", post(uploads::upload_student_photo))
        .route("/api/users/{user_id}/photo", post(uploads::upload_user_photo))
        .route("/api/me/photo", post(uploads::upload_my_photo))
        // Uploaded files — generates presigned URL redirect to S3
        .route("/uploads/{*rest}", get(uploads::serve_uploaded_file))
        .layer(middleware::from_fn_with_state(
            pool_for_middleware,
            auth_middleware,
        ))
        .layer(Extension(schema))
        .layer(Extension(pool_for_ext))
        .layer(Extension(s3_client))
        .layer(cors);

    let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| "0.0.0.0:3000".into());
    let listener = tokio::net::TcpListener::bind(&bind_addr)
        .await
        .expect("Failed to bind address");

    tracing::info!("app-gateway listening on {bind_addr}");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
