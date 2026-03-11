mod auth;
mod db;
mod errors;
mod graphql;
mod offer_letter;
mod uploads;

use axum::{extract::Extension, middleware, routing::{get, post}, Router};
use sqlx::postgres::PgPoolOptions;
use std::env;
use tower_http::cors::{Any, CorsLayer};
use tower_http::services::ServeDir;
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

    // Build the async-graphql schema.
    let pool_for_middleware = pool.clone();
    let pool_for_ext = pool.clone();
    let schema = build_schema(pool);

    // CORS — allow the frontend origin during development.
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Uploads directory for serving static files (student photos, etc.)
    let uploads_dir = env::var("UPLOADS_DIR").unwrap_or_else(|_| "./uploads".into());

    // Assemble the Axum router.
    let app = Router::new()
        .route("/graphql", post(graphql_handler))
        .route("/api/offer-letter/{user_id}", get(offer_letter::offer_letter_handler).post(offer_letter::generate_offer_letter_handler))
        .route("/api/students/{student_id}/photo", post(uploads::upload_student_photo))
        .route("/api/users/{user_id}/photo", post(uploads::upload_user_photo))
        .route("/api/me/photo", post(uploads::upload_my_photo))
        .nest_service("/uploads", ServeDir::new(&uploads_dir))
        .layer(middleware::from_fn_with_state(
            pool_for_middleware,
            auth_middleware,
        ))
        .layer(Extension(schema))
        .layer(Extension(pool_for_ext))
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
