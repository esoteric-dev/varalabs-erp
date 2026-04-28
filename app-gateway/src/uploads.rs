use axum::{
    extract::{Extension, Multipart, Path},
    http::{StatusCode, header},
    response::{IntoResponse, Redirect, Response},
};
use aws_sdk_s3::Client as S3Client;
use image::ImageReader;
use sqlx::PgPool;
use std::io::Cursor;

use crate::auth::{SystemRole, UserContext};
use crate::storage::{bucket_name, generate_presigned_url, uploads_serving_strategy};

type UploadError = (StatusCode, axum::Json<serde_json::Value>);

/// Extract and compress the photo from multipart form data.
/// Returns the WebP-encoded bytes.
async fn extract_and_compress_photo(
    multipart: &mut Multipart,
) -> Result<Vec<u8>, UploadError> {
    let mut file_data: Option<Vec<u8>> = None;
    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("photo") {
            let bytes = field.bytes().await.map_err(|e| {
                tracing::error!("Failed to read upload: {e}");
                (
                    StatusCode::BAD_REQUEST,
                    axum::Json(serde_json::json!({ "error": "Failed to read uploaded file" })),
                )
            })?;
            file_data = Some(bytes.to_vec());
            break;
        }
    }

    let file_data = file_data.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            axum::Json(serde_json::json!({ "error": "No 'photo' field found in upload" })),
        )
    })?;

    if file_data.len() > 10 * 1024 * 1024 {
        return Err((
            StatusCode::BAD_REQUEST,
            axum::Json(serde_json::json!({ "error": "File too large (max 10MB)" })),
        ));
    }

    let img = ImageReader::new(Cursor::new(&file_data))
        .with_guessed_format()
        .map_err(|e| {
            tracing::error!("Failed to guess image format: {e}");
            (
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({ "error": "Invalid image format" })),
            )
        })?
        .decode()
        .map_err(|e| {
            tracing::error!("Failed to decode image: {e}");
            (
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({ "error": "Failed to decode image" })),
            )
        })?;

    let img = if img.width() > 512 || img.height() > 512 {
        img.resize(512, 512, image::imageops::FilterType::Lanczos3)
    } else {
        img
    };

    let mut webp_cursor: Cursor<Vec<u8>> = Cursor::new(Vec::new());
    img.write_to(&mut webp_cursor, image::ImageFormat::WebP)
        .map_err(|e| {
            tracing::error!("Failed to encode WebP: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({ "error": "Failed to compress image" })),
            )
        })?;

    Ok(webp_cursor.into_inner())
}

/// Upload WebP bytes to S3 under the given prefix. Returns the S3 key (relative path).
async fn save_photo_to_s3(
    s3_client: &S3Client,
    subdirectory: &str,
    id: &str,
    webp_buf: &[u8],
) -> Result<String, UploadError> {
    let bucket = bucket_name();
    let key = format!("{}/{}.webp", subdirectory, id);

    s3_client
        .put_object()
        .bucket(&bucket)
        .key(&key)
        .body(webp_buf.to_vec().into())
        .content_type("image/webp")
        .send()
        .await
        .map_err(|e| {
            tracing::error!("S3 upload failed: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({ "error": "Failed to upload file to storage" })),
            )
        })?;

    // Return relative path stored in DB (used to generate presigned URL)
    Ok(format!("/uploads/{}", key))
}

/// Upload a student photo: receives multipart form, compresses to WebP, saves to S3.
pub async fn upload_student_photo(
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    Extension(s3_client): Extension<S3Client>,
    Path(student_id): Path<String>,
    mut multipart: Multipart,
) -> Result<axum::Json<serde_json::Value>, UploadError> {
    let user_ctx = user_ctx.ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({ "error": "Authentication required" })),
        )
    })?.0;

    let webp_buf = extract_and_compress_photo(&mut multipart).await?;
    let photo_url = save_photo_to_s3(&s3_client, "students", &student_id, &webp_buf).await?;

    let tenant_id = user_ctx.tenant_id.clone();
    let org_id = user_ctx.org_id.clone();

    crate::db::execute_in_context(&pool, &tenant_id, &org_id, |conn| {
        let sid = student_id.clone();
        let url = photo_url.clone();
        Box::pin(async move {
            sqlx::query("UPDATE students SET photo_url = $1 WHERE id = $2::uuid")
                .bind(&url)
                .bind(&sid)
                .execute(&mut *conn)
                .await?;
            sqlx::query(
                "UPDATE users SET photo_url = $1 WHERE id = (SELECT user_id FROM students WHERE id = $2::uuid)"
            )
                .bind(&url)
                .bind(&sid)
                .execute(conn)
                .await?;
            Ok(())
        })
    })
    .await
    .map_err(|e| {
        tracing::error!("DB error updating photo_url: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({ "error": "Failed to update student record" })),
        )
    })?;

    // Generate presigned URL for immediate use
    let serving_url = match uploads_serving_strategy() {
        Some(base) => format!("{}/{}", base.trim_end_matches('/'), photo_url.trim_start_matches('/')),
        None => {
            let key = photo_url.trim_start_matches('/');
            generate_presigned_url(&s3_client, key).await.unwrap_or(photo_url.clone())
        }
    };

    tracing::info!(student_id = %student_id, size_bytes = webp_buf.len(), "Student photo uploaded to S3");

    Ok(axum::Json(serde_json::json!({
        "photoUrl": serving_url,
        "sizeBytes": webp_buf.len(),
    })))
}

/// Upload own profile photo (any authenticated user).
pub async fn upload_my_photo(
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    Extension(s3_client): Extension<S3Client>,
    mut multipart: Multipart,
) -> Result<axum::Json<serde_json::Value>, UploadError> {
    let user_ctx = user_ctx.ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({ "error": "Authentication required" })),
        )
    })?.0;

    let user_id = &user_ctx.user_id;

    let webp_buf = extract_and_compress_photo(&mut multipart).await?;
    let photo_url = save_photo_to_s3(&s3_client, "users", user_id, &webp_buf).await?;

    sqlx::query("UPDATE users SET photo_url = $1 WHERE id = $2::uuid")
        .bind(&photo_url)
        .bind(user_id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error updating user photo_url: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({ "error": "Failed to update profile photo" })),
            )
        })?;

    let serving_url = match uploads_serving_strategy() {
        Some(base) => format!("{}/{}", base.trim_end_matches('/'), photo_url.trim_start_matches('/')),
        None => {
            let key = photo_url.trim_start_matches('/');
            generate_presigned_url(&s3_client, key).await.unwrap_or(photo_url.clone())
        }
    };

    tracing::info!(user_id = %user_id, size_bytes = webp_buf.len(), "User photo uploaded to S3");

    Ok(axum::Json(serde_json::json!({
        "photoUrl": serving_url,
        "sizeBytes": webp_buf.len(),
    })))
}

/// Upload an organisation logo. JPEG/PNG → WebP 256×256; SVG stored as-is.
/// Requires settings.update permission.
pub async fn upload_org_logo(
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    Extension(s3_client): Extension<S3Client>,
    mut multipart: Multipart,
) -> Result<axum::Json<serde_json::Value>, UploadError> {
    let user_ctx = user_ctx
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                axum::Json(serde_json::json!({ "error": "Authentication required" })),
            )
        })?
        .0;

    if user_ctx.system_role != crate::auth::SystemRole::Superadmin
        && user_ctx.system_role != crate::auth::SystemRole::TenantAdmin
        && !user_ctx.permissions.contains("settings.update")
    {
        return Err((
            StatusCode::FORBIDDEN,
            axum::Json(serde_json::json!({ "error": "Access denied" })),
        ));
    }

    let org_id = user_ctx.org_id.clone();
    let tenant_id = user_ctx.tenant_id.clone();

    let mut file_bytes: Option<Vec<u8>> = None;
    let mut content_type_str = String::from("application/octet-stream");
    while let Ok(Some(field)) = multipart.next_field().await {
        if field.name() == Some("logo") {
            content_type_str = field
                .content_type()
                .unwrap_or("application/octet-stream")
                .to_string();
            let bytes = field.bytes().await.map_err(|e| {
                tracing::error!("Failed to read logo upload: {e}");
                (
                    StatusCode::BAD_REQUEST,
                    axum::Json(serde_json::json!({ "error": "Failed to read uploaded file" })),
                )
            })?;
            file_bytes = Some(bytes.to_vec());
            break;
        }
    }

    let bytes = file_bytes.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            axum::Json(serde_json::json!({ "error": "No 'logo' field found in upload" })),
        )
    })?;

    if bytes.len() > 5 * 1024 * 1024 {
        return Err((
            StatusCode::BAD_REQUEST,
            axum::Json(serde_json::json!({ "error": "File too large (max 5 MB)" })),
        ));
    }

    let is_svg = content_type_str.contains("svg")
        || bytes.starts_with(b"<svg")
        || bytes.starts_with(b"<?xml");

    let bucket = bucket_name();

    let logo_url = if is_svg {
        let key = format!("orgs/{}.svg", org_id);
        s3_client
            .put_object()
            .bucket(&bucket)
            .key(&key)
            .body(bytes.to_vec().into())
            .content_type("image/svg+xml")
            .send()
            .await
            .map_err(|e| {
                tracing::error!("S3 SVG upload failed: {e}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(serde_json::json!({ "error": "Failed to save SVG" })),
                )
            })?;
        format!("/uploads/{}", key)
    } else {
        let img = ImageReader::new(Cursor::new(&bytes))
            .with_guessed_format()
            .map_err(|e| {
                tracing::error!("Image format error: {e}");
                (
                    StatusCode::BAD_REQUEST,
                    axum::Json(serde_json::json!({ "error": "Invalid image format" })),
                )
            })?
            .decode()
            .map_err(|e| {
                tracing::error!("Image decode error: {e}");
                (
                    StatusCode::BAD_REQUEST,
                    axum::Json(serde_json::json!({ "error": "Failed to decode image" })),
                )
            })?;

        let img = img.resize(256, 256, image::imageops::FilterType::Lanczos3);
        let mut buf: Cursor<Vec<u8>> = Cursor::new(Vec::new());
        img.write_to(&mut buf, image::ImageFormat::WebP).map_err(|e| {
            tracing::error!("WebP encode error: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({ "error": "Failed to encode image" })),
            )
        })?;

        let key = format!("orgs/{}.webp", org_id);
        s3_client
            .put_object()
            .bucket(&bucket)
            .key(&key)
            .body(buf.into_inner().to_vec().into())
            .content_type("image/webp")
            .send()
            .await
            .map_err(|e| {
                tracing::error!("S3 WebP upload failed: {e:#}");
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    axum::Json(serde_json::json!({ "error": "Failed to upload image — S3 storage may be unavailable" })),
                )
            })?;
        format!("/uploads/{}", key)
    };

    crate::db::execute_in_context(&pool, &tenant_id, &org_id, |conn| {
        let url = logo_url.clone();
        let oid = org_id.clone();
        Box::pin(async move {
            sqlx::query("UPDATE organisations SET logo_url = $1 WHERE id = $2::uuid")
                .bind(&url)
                .bind(&oid)
                .execute(&mut *conn)
                .await?;
            Ok(())
        })
    })
    .await
    .map_err(|e| {
        tracing::error!("DB error updating logo_url: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            axum::Json(serde_json::json!({ "error": "Failed to update organisation" })),
        )
    })?;

    let serving_url = match uploads_serving_strategy() {
        Some(base) => format!("{}/{}", base.trim_end_matches('/'), logo_url.trim_start_matches('/')),
        None => {
            let key = logo_url.trim_start_matches('/');
            generate_presigned_url(&s3_client, key).await.unwrap_or(logo_url.clone())
        }
    };

    tracing::info!(org_id = %org_id, is_svg = is_svg, "Org logo uploaded to S3");

    Ok(axum::Json(serde_json::json!({ "logoUrl": serving_url })))
}

/// Admin uploads a photo for any user.
/// Superadmin and tenant_admin may upload directly; other users require users.manage.
pub async fn upload_user_photo(
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    Extension(s3_client): Extension<S3Client>,
    Path(user_id): Path<String>,
    mut multipart: Multipart,
) -> Result<axum::Json<serde_json::Value>, UploadError> {
    let user_ctx = user_ctx.ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({ "error": "Authentication required" })),
        )
    })?.0;

    if user_ctx.system_role != SystemRole::Superadmin
        && user_ctx.system_role != SystemRole::TenantAdmin
        && !user_ctx.role_slugs.iter().any(|slug| slug == "admin")
        && !user_ctx.permissions.contains("users.manage")
    {
        return Err((
            StatusCode::FORBIDDEN,
            axum::Json(serde_json::json!({ "error": "Access denied" })),
        ));
    }

    let webp_buf = extract_and_compress_photo(&mut multipart).await?;
    let photo_url = save_photo_to_s3(&s3_client, "users", &user_id, &webp_buf).await?;

    sqlx::query("UPDATE users SET photo_url = $1 WHERE id = $2::uuid")
        .bind(&photo_url)
        .bind(&user_id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error updating user photo_url: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                axum::Json(serde_json::json!({ "error": "Failed to update photo" })),
            )
        })?;

    let serving_url = match uploads_serving_strategy() {
        Some(base) => format!("{}/{}", base.trim_end_matches('/'), photo_url.trim_start_matches('/')),
        None => {
            let key = photo_url.trim_start_matches('/');
            generate_presigned_url(&s3_client, key).await.unwrap_or(photo_url.clone())
        }
    };

    tracing::info!(user_id = %user_id, size_bytes = webp_buf.len(), "Admin uploaded user photo to S3");

    Ok(axum::Json(serde_json::json!({
        "photoUrl": serving_url,
        "sizeBytes": webp_buf.len(),
    })))
}

/// Serve uploaded files via presigned URL redirect.
/// Handles GET /uploads/{subdirectory}/{id}.webp
pub async fn serve_uploaded_file(
    Extension(s3_client): Extension<S3Client>,
    Path(rest): Path<String>,
) -> Response {
    match uploads_serving_strategy() {
        // Public bucket or CDN — redirect directly
        Some(base) => {
            let url = format!("{}/{}", base.trim_end_matches('/'), rest);
            Redirect::temporary(&url).into_response()
        }
        // Private bucket — generate presigned URL and redirect
        None => {
            match generate_presigned_url(&s3_client, &rest).await {
                Ok(presigned) => Redirect::temporary(&presigned).into_response(),
                Err(e) => {
                    tracing::error!("Failed to generate presigned URL: {e}");
                    (
                        StatusCode::INTERNAL_SERVER_ERROR,
                        [(header::CONTENT_TYPE, "text/plain")],
                        "Failed to generate download link",
                    ).into_response()
                }
            }
        }
    }
}
