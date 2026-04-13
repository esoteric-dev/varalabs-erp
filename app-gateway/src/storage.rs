use aws_sdk_s3::{
    config::{Builder as S3ConfigBuilder, BehaviorVersion, Credentials, Region},
    presigning::PresigningConfigBuilder,
    Client as S3Client,
};
use std::{env, time::Duration};

/// Initialize an S3-compatible client. Works with MinIO, Cloudflare R2,
/// Backblaze B2, Wasabi, AWS S3, or any S3-compatible endpoint.
pub fn init_s3_client() -> S3Client {
    let endpoint = env::var("S3_ENDPOINT").ok();
    let access_key = env::var("S3_ACCESS_KEY").expect("S3_ACCESS_KEY must be set");
    let secret_key = env::var("S3_SECRET_KEY").expect("S3_SECRET_KEY must be set");
    let region_name = env::var("S3_REGION").unwrap_or_else(|_| "us-east-1".into());
    let bucket = env::var("S3_BUCKET").expect("S3_BUCKET must be set");

    if endpoint.is_none() {
        tracing::warn!("S3_ENDPOINT not set — using AWS S3 default.");
    }

    let credentials = Credentials::new(&access_key, &secret_key, None, None, "app-gateway");

    let mut config_builder = S3ConfigBuilder::default()
        .behavior_version(BehaviorVersion::latest())
        .credentials_provider(credentials)
        .region(Region::new(region_name))
        .force_path_style(true);

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

/// Generate a presigned URL for reading an object from S3.
/// The URL is valid for 7 days by default (configurable via S3_PRESIGN_TTL).
pub async fn generate_presigned_url(
    s3_client: &S3Client,
    key: &str,
) -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
    let bucket = bucket_name();
    let ttl_seconds = env::var("S3_PRESIGN_TTL")
        .ok()
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(604800); // 7 days

    let mut presign_builder = PresigningConfigBuilder::default();
    presign_builder.set_expires_in(Some(Duration::from_secs(ttl_seconds)));
    let presign_config = presign_builder.build()?;

    let presigned = s3_client
        .get_object()
        .bucket(&bucket)
        .key(key)
        .presigned(presign_config)
        .await?;

    Ok(presigned.uri().to_string())
}

/// Determine how to serve uploaded files.
/// - If S3_PUBLIC_URL is set: use it as a base (e.g. `https://cdn.varalabs.dev`)
///   and append the key directly (public bucket or CDN).
/// - Otherwise: presigned URLs will be generated at read time.
pub fn uploads_serving_strategy() -> Option<String> {
    env::var("S3_PUBLIC_URL").ok()
}
