use aws_sdk_s3::{
    config::{Builder as S3ConfigBuilder, BehaviorVersion, Credentials, Region},
    Client as S3Client,
};
use std::env;

/// Initialize an S3-compatible client. Works with MinIO, Cloudflare R2,
/// Backblaze B2, Wasabi, AWS S3, or any S3-compatible endpoint.
pub fn init_s3_client() -> S3Client {
    let endpoint = env::var("S3_ENDPOINT").ok();
    let access_key = env::var("S3_ACCESS_KEY").expect("S3_ACCESS_KEY must be set");
    let secret_key = env::var("S3_SECRET_KEY").expect("S3_SECRET_KEY must be set");
    let region_name = env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".into());
    let bucket = env::var("S3_BUCKET").expect("S3_BUCKET must be set");

    // Validate required config at startup
    if endpoint.is_none() {
        tracing::warn!("S3_ENDPOINT not set — using AWS S3 default. Set S3_ENDPOINT for MinIO/R2/etc.");
    }

    let credentials = Credentials::new(&access_key, &secret_key, None, None, "app-gateway");

    let mut config_builder = S3ConfigBuilder::default()
        .behavior_version(BehaviorVersion::latest())
        .credentials_provider(credentials)
        .region(Region::new(region_name))
        .force_path_style(true); // Required for MinIO and self-hosted S3

    if let Some(ref ep) = endpoint {
        config_builder = config_builder.endpoint_url(ep);
    }

    let config = config_builder.build();

    tracing::info!(
        bucket = %bucket,
        endpoint = ?endpoint,
        "S3 client initialized"
    );

    S3Client::from_conf(config)
}

/// Get the bucket name from environment variables.
pub fn bucket_name() -> String {
    env::var("S3_BUCKET").expect("S3_BUCKET must be set")
}

/// Get the base URL for serving uploaded files.
/// If S3_PUBLIC_URL is set, use it directly (for CloudFront, CDN, etc.).
/// Otherwise, construct from S3_ENDPOINT or use the internal proxy path.
pub fn uploads_base_url() -> String {
    if let Ok(public_url) = env::var("S3_PUBLIC_URL") {
        // e.g. https://cdn.varalabs.dev or https://bucket.r2.dev
        public_url
    } else if let Some(endpoint) = env::var("S3_ENDPOINT").ok() {
        // For MinIO: use the endpoint as base (nginx will proxy)
        // Internal Docker networking: http://minio:9000
        // But frontend needs a reachable URL, so we fall through to nginx proxy path
        "/uploads".into()
    } else {
        // Fallback: assume nginx proxies /uploads to the backend
        "/uploads".into()
    }
}
