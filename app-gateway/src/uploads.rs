use axum::{
    extract::{Extension, Multipart, Path},
    http::StatusCode,
    response::Json,
};
use image::ImageReader;
use sqlx::PgPool;
use std::{io::Cursor, path::PathBuf};

use crate::auth::UserContext;

/// Directory where photos are stored (WebP format).
fn uploads_dir() -> PathBuf {
    let dir = std::env::var("UPLOADS_DIR").unwrap_or_else(|_| "./uploads".into());
    PathBuf::from(dir)
}

type UploadError = (StatusCode, Json<serde_json::Value>);

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
                    Json(serde_json::json!({ "error": "Failed to read uploaded file" })),
                )
            })?;
            file_data = Some(bytes.to_vec());
            break;
        }
    }

    let file_data = file_data.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "No 'photo' field found in upload" })),
        )
    })?;

    if file_data.len() > 10 * 1024 * 1024 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "File too large (max 10MB)" })),
        ));
    }

    let img = ImageReader::new(Cursor::new(&file_data))
        .with_guessed_format()
        .map_err(|e| {
            tracing::error!("Failed to guess image format: {e}");
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "Invalid image format" })),
            )
        })?
        .decode()
        .map_err(|e| {
            tracing::error!("Failed to decode image: {e}");
            (
                StatusCode::BAD_REQUEST,
                Json(serde_json::json!({ "error": "Failed to decode image" })),
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
                Json(serde_json::json!({ "error": "Failed to compress image" })),
            )
        })?;

    Ok(webp_cursor.into_inner())
}

/// Save WebP bytes to disk under the given subdirectory. Returns the public URL path.
async fn save_photo(subdirectory: &str, id: &str, webp_buf: &[u8]) -> Result<String, UploadError> {
    let dir = uploads_dir().join(subdirectory);
    tokio::fs::create_dir_all(&dir).await.map_err(|e| {
        tracing::error!("Failed to create uploads dir: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "Storage error" })),
        )
    })?;

    let filename = format!("{}.webp", id);
    let filepath = dir.join(&filename);

    tokio::fs::write(&filepath, webp_buf).await.map_err(|e| {
        tracing::error!("Failed to write file: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "Failed to save file" })),
        )
    })?;

    Ok(format!("/uploads/{}/{}", subdirectory, filename))
}

/// Upload a student photo: receives multipart form, compresses to WebP, saves to disk.
pub async fn upload_student_photo(
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    Path(student_id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, UploadError> {
    let user_ctx = user_ctx.ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Authentication required" })),
        )
    })?.0;

    let webp_buf = extract_and_compress_photo(&mut multipart).await?;
    let photo_url = save_photo("students", &student_id, &webp_buf).await?;

    let tenant_id = user_ctx.tenant_id.clone();
    let org_id = user_ctx.org_id.clone();

    crate::db::execute_in_context(&pool, &tenant_id, &org_id, |conn| {
        let sid = student_id.clone();
        let url = photo_url.clone();
        Box::pin(async move {
            // Update student record
            sqlx::query("UPDATE students SET photo_url = $1 WHERE id = $2::uuid")
                .bind(&url)
                .bind(&sid)
                .execute(&mut *conn)
                .await?;
            // Also update the linked user record so the navbar photo works
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
            Json(serde_json::json!({ "error": "Failed to update student record" })),
        )
    })?;

    tracing::info!(student_id = %student_id, size_bytes = webp_buf.len(), "Student photo uploaded");

    Ok(Json(serde_json::json!({
        "photoUrl": photo_url,
        "sizeBytes": webp_buf.len(),
    })))
}

/// Upload own profile photo (any authenticated user).
pub async fn upload_my_photo(
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, UploadError> {
    let user_ctx = user_ctx.ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Authentication required" })),
        )
    })?.0;

    let user_id = &user_ctx.user_id;

    let webp_buf = extract_and_compress_photo(&mut multipart).await?;
    let photo_url = save_photo("users", user_id, &webp_buf).await?;

    // Update the users table directly (no RLS needed — updating own record by user_id)
    sqlx::query("UPDATE users SET photo_url = $1 WHERE id = $2::uuid")
        .bind(&photo_url)
        .bind(user_id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error updating user photo_url: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to update profile photo" })),
            )
        })?;

    tracing::info!(user_id = %user_id, size_bytes = webp_buf.len(), "User photo uploaded");

    Ok(Json(serde_json::json!({
        "photoUrl": photo_url,
        "sizeBytes": webp_buf.len(),
    })))
}

/// Upload an organisation logo. JPEG/PNG → WebP 256×256; SVG stored as-is.
/// Requires settings.update permission.
pub async fn upload_org_logo(
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, UploadError> {
    let user_ctx = user_ctx
        .ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({ "error": "Authentication required" })),
            )
        })?
        .0;

    if user_ctx.system_role != crate::auth::SystemRole::Superadmin
        && !user_ctx.permissions.contains("settings.update")
    {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "Access denied" })),
        ));
    }

    let org_id    = user_ctx.org_id.clone();
    let tenant_id = user_ctx.tenant_id.clone();

    // Read the "logo" field from multipart.
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
                    Json(serde_json::json!({ "error": "Failed to read uploaded file" })),
                )
            })?;
            file_bytes = Some(bytes.to_vec());
            break;
        }
    }

    let bytes = file_bytes.ok_or_else(|| {
        (
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "No 'logo' field found in upload" })),
        )
    })?;

    if bytes.len() > 5 * 1024 * 1024 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({ "error": "File too large (max 5 MB)" })),
        ));
    }

    let is_svg = content_type_str.contains("svg")
        || bytes.starts_with(b"<svg")
        || bytes.starts_with(b"<?xml");

    let dir = uploads_dir().join("orgs");
    tokio::fs::create_dir_all(&dir).await.map_err(|e| {
        tracing::error!("Failed to create orgs dir: {e}");
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(serde_json::json!({ "error": "Storage error" })),
        )
    })?;

    let logo_url = if is_svg {
        let filename = format!("{}.svg", org_id);
        tokio::fs::write(dir.join(&filename), &bytes).await.map_err(|e| {
            tracing::error!("Failed to write SVG: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to save file" })),
            )
        })?;
        format!("/uploads/orgs/{}", filename)
    } else {
        // Decode, resize to 256×256, encode as WebP.
        let img = ImageReader::new(Cursor::new(&bytes))
            .with_guessed_format()
            .map_err(|e| {
                tracing::error!("Image format error: {e}");
                (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": "Invalid image format" })),
                )
            })?
            .decode()
            .map_err(|e| {
                tracing::error!("Image decode error: {e}");
                (
                    StatusCode::BAD_REQUEST,
                    Json(serde_json::json!({ "error": "Failed to decode image" })),
                )
            })?;

        let img = img.resize(256, 256, image::imageops::FilterType::Lanczos3);
        let mut buf: Cursor<Vec<u8>> = Cursor::new(Vec::new());
        img.write_to(&mut buf, image::ImageFormat::WebP).map_err(|e| {
            tracing::error!("WebP encode error: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to encode image" })),
            )
        })?;

        let filename = format!("{}.webp", org_id);
        tokio::fs::write(dir.join(&filename), buf.into_inner()).await.map_err(|e| {
            tracing::error!("Failed to write WebP: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to save file" })),
            )
        })?;
        format!("/uploads/orgs/{}", filename)
    };

    // Persist the URL on the organisation record (RLS scoped).
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
            Json(serde_json::json!({ "error": "Failed to update organisation" })),
        )
    })?;

    tracing::info!(org_id = %org_id, is_svg = is_svg, "Org logo uploaded");

    Ok(Json(serde_json::json!({ "logoUrl": logo_url })))
}

/// Admin uploads a photo for any user. Requires users.manage permission.
pub async fn upload_user_photo(
    Extension(pool): Extension<PgPool>,
    user_ctx: Option<Extension<UserContext>>,
    Path(user_id): Path<String>,
    mut multipart: Multipart,
) -> Result<Json<serde_json::Value>, UploadError> {
    let user_ctx = user_ctx.ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({ "error": "Authentication required" })),
        )
    })?.0;

    // Check permission (admin only)
    if user_ctx.system_role != crate::auth::SystemRole::Superadmin
        && !user_ctx.permissions.contains("users.manage")
    {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({ "error": "Access denied" })),
        ));
    }

    let webp_buf = extract_and_compress_photo(&mut multipart).await?;
    let photo_url = save_photo("users", &user_id, &webp_buf).await?;

    // Update the users table
    sqlx::query("UPDATE users SET photo_url = $1 WHERE id = $2::uuid")
        .bind(&photo_url)
        .bind(&user_id)
        .execute(&pool)
        .await
        .map_err(|e| {
            tracing::error!("DB error updating user photo_url: {e}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({ "error": "Failed to update photo" })),
            )
        })?;

    tracing::info!(user_id = %user_id, size_bytes = webp_buf.len(), "Admin uploaded user photo");

    Ok(Json(serde_json::json!({
        "photoUrl": photo_url,
        "sizeBytes": webp_buf.len(),
    })))
}
