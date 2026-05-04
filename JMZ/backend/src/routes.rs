use axum::{
    body::Body,
    extract::{Path, Query, State},
    response::{IntoResponse, Response, Sse},
    Json,
};
use axum::response::sse::Event;
use std::convert::Infallible;
use std::sync::Arc;
use std::time::Duration;
use tokio_stream::StreamExt;
use uuid::Uuid;

use crate::auth::AuthUser;
use crate::crypto::{decrypt, encrypt, generate_key, generate_nonce, generate_stream_id, hmac_sign, hmac_verify};
use crate::db::{Download, User};
use crate::download::simulate_download_progress;
use crate::extractors::detect_platform;
use crate::models::{AppState, DownloadProgress, DownloadRequest, ExtractRequest, VideoFormat, VideoInfo};
use crate::youtube::YouTubeExtractor;

#[derive(serde::Deserialize)]
pub struct StreamQuery {
    id: String,
    exp: i64,
    sig: String,
    sec: String,
    iv: String,
}

pub async fn health() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "version": env!("CARGO_PKG_VERSION"),
    }))
}

pub async fn extract(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ExtractRequest>,
) -> Result<Json<VideoInfo>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    if req.url.is_empty() {
        return Err(bad_request("URL is required"));
    }

    let platform = detect_platform(&req.url);
    if platform != "youtube" {
        return Err(bad_request("Only YouTube URLs are currently supported"));
    }

    let extractor = YouTubeExtractor::new();
    extractor.extract(&req.url).await.map(Json).map_err(|e| {
        bad_request(&format!("Failed to extract video: {}", e))
    })
}

pub async fn download(
    auth_user: AuthUser,
    State(state): State<Arc<AppState>>,
    Json(req): Json<DownloadRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let pool = state.db.as_ref().ok_or_else(|| internal("Database not initialized"))?;

    let user = User::get_by_id(pool, &auth_user.user_id)
        .await
        .map_err(|_| internal("Database error"))?
        .ok_or_else(|| not_found("User not found"))?;

    if !user.can_download() {
        return Err((
            axum::http::StatusCode::FORBIDDEN,
            Json(serde_json::json!({
                "error": "Download limit reached. Please upgrade your subscription.",
                "downloads_used": user.downloads_used,
                "downloads_limit": user.downloads_limit,
                "upgrade_url": "/pricing",
            })),
        ));
    }

    let platform = detect_platform(&req.url);
    if platform != "youtube" {
        return Err(bad_request("Only YouTube URLs are currently supported"));
    }

    let extractor = YouTubeExtractor::new();
    let info = extractor.extract(&req.url).await.map_err(|e| {
        bad_request(&format!("Failed to extract video: {}", e))
    })?;

    let audio_only = req.audio_only.unwrap_or(false);
    let format = select_format(&info.formats, req.quality.as_deref(), audio_only)
        .ok_or_else(|| bad_request("No suitable format found for this video"))?;

    let download_record = Download::create(
        pool,
        &user.id,
        &req.url,
        Some(&info.title),
        Some("youtube"),
        Some(&format.quality),
        Some(&format.ext),
    )
    .await
    .map_err(|_| internal("Failed to create download record"))?;

    user.increment_downloads(pool)
        .await
        .map_err(|_| internal("Failed to update download count"))?;

    let download_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().timestamp();
    let expires = now + 3600;

    let key = generate_key();
    let nonce = generate_nonce();
    let secret = generate_stream_id();

    let ticket = serde_json::json!({
        "url": format.url,
        "filename": sanitize_filename(&info.title, &format.ext),
    });

    let encrypted = encrypt(ticket.to_string().as_bytes(), &key, &nonce);
    {
        let mut cache = state.stream_cache.lock().unwrap();
        cache.insert(download_id.clone(), (encrypted, key, nonce));
    }

    let sig_input = format!("{},{},{},{}", download_id, expires, hex::encode(nonce), secret);
    let signature = hmac_sign(&sig_input, &state.jwt_secret);

    let stream_url = format!(
        "/api/stream?id={}&exp={}&sig={}&sec={}&iv={}",
        download_id,
        expires * 1000,
        signature,
        secret,
        hex::encode(nonce),
    );

    state.create_download(download_id.clone());

    let state_clone = state.clone();
    let id_clone = download_id.clone();
    tokio::spawn(async move {
        simulate_download_progress(state_clone, id_clone).await;
    });

    Ok(Json(serde_json::json!({
        "id": download_id,
        "download_id": download_record.id,
        "stream_url": stream_url,
        "filename": sanitize_filename(&info.title, &format.ext),
        "status": "ready",
        "expires_in": 3600,
        "remaining_downloads": user.downloads_limit - user.downloads_used - 1,
    })))
}

pub async fn progress(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Sse<impl tokio_stream::Stream<Item = Result<Event, Infallible>>> {
    let stream = tokio_stream::wrappers::IntervalStream::new(
        tokio::time::interval(Duration::from_millis(500)),
    )
    .take(240)
    .map(move |_| {
        let event = match state.get_progress(&id) {
            Some(progress) => serde_json::to_string(&progress).unwrap_or_default(),
            None => {
                let done = DownloadProgress {
                    id: id.clone(),
                    status: "completed".to_string(),
                    progress: 100.0,
                    speed: 0,
                    downloaded_bytes: None,
                    total_bytes: None,
                    eta: None,
                    error: None,
                };
                serde_json::to_string(&done).unwrap_or_default()
            }
        };
        Ok(Event::default().data(event))
    });

    Sse::new(stream)
}

pub async fn cancel(
    State(state): State<Arc<AppState>>,
    Path(id): Path<String>,
) -> Json<serde_json::Value> {
    state.cancel_download(&id);
    Json(serde_json::json!({"success": true}))
}

pub async fn history(
    auth_user: AuthUser,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<Download>>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let pool = state.db.as_ref().ok_or_else(|| internal("Database not initialized"))?;

    let downloads = Download::get_by_user(pool, &auth_user.user_id)
        .await
        .map_err(|_| internal("Database error"))?;

    Ok(Json(downloads))
}

pub async fn formats(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<ExtractRequest>,
) -> Result<Json<serde_json::Value>, (axum::http::StatusCode, Json<serde_json::Value>)> {
    let platform = detect_platform(&req.url);
    if platform != "youtube" {
        return Err(bad_request("Only YouTube URLs are currently supported"));
    }

    let extractor = YouTubeExtractor::new();
    let info = extractor.extract(&req.url).await.map_err(|e| {
        bad_request(&format!("Failed to extract video: {}", e))
    })?;

    Ok(Json(serde_json::json!({
        "title": info.title,
        "author": info.author,
        "duration": info.duration,
        "thumbnail": info.thumbnail,
        "platform": info.platform,
        "formats": info.formats,
    })))
}

pub async fn stream(
    State(state): State<Arc<AppState>>,
    Query(query): Query<StreamQuery>,
) -> impl IntoResponse {
    let now = chrono::Utc::now().timestamp();

    if query.exp / 1000 <= now {
        return error_response(axum::http::StatusCode::GONE, "Stream link has expired");
    }

    let sig_input = format!("{},{},{},{}", query.id, query.exp, query.iv, query.sec);
    if !hmac_verify(&sig_input, &query.sig, &state.jwt_secret) {
        return error_response(axum::http::StatusCode::FORBIDDEN, "Invalid stream signature");
    }

    let (encrypted, key, nonce) = {
        let cache = state.stream_cache.lock().unwrap();
        match cache.get(&query.id) {
            Some(data) => data.clone(),
            None => return error_response(axum::http::StatusCode::NOT_FOUND, "Stream not found"),
        }
    };

    let iv_bytes = match hex::decode(&query.iv) {
        Ok(b) => b,
        Err(_) => return error_response(axum::http::StatusCode::BAD_REQUEST, "Invalid IV"),
    };

    let iv_arr: [u8; 12] = match iv_bytes.try_into() {
        Ok(arr) => arr,
        Err(_) => return error_response(axum::http::StatusCode::BAD_REQUEST, "Invalid IV length"),
    };

    let decrypted = match decrypt(&encrypted, &key, &iv_arr) {
        Some(d) => d,
        None => return error_response(axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Decryption failed"),
    };

    let ticket: serde_json::Value = match serde_json::from_slice(&decrypted) {
        Ok(t) => t,
        Err(_) => return error_response(axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Invalid ticket"),
    };

    let video_url = ticket["url"].as_str().unwrap_or("");
    let filename = ticket["filename"].as_str().unwrap_or("video.mp4");

    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(300))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()
    {
        Ok(c) => c,
        Err(_) => return error_response(axum::http::StatusCode::INTERNAL_SERVER_ERROR, "Failed to create HTTP client"),
    };

    let upstream = match client.get(video_url).send().await {
        Ok(r) => r,
        Err(_) => return error_response(axum::http::StatusCode::BAD_GATEWAY, "Failed to fetch video stream"),
    };

    let content_type = upstream
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("video/mp4")
        .to_string();

    let content_length = upstream
        .headers()
        .get("content-length")
        .cloned();

    let stream = upstream.bytes_stream();
    let mut builder = Response::builder()
        .status(axum::http::StatusCode::OK)
        .header("Content-Type", content_type)
        .header("Content-Disposition", format!("attachment; filename=\"{}\"", filename))
        .header("Accept-Ranges", "bytes");

    if let Some(cl) = content_length {
        builder = builder.header("Content-Length", cl);
    }

    builder.body(Body::from_stream(stream)).unwrap()
}

fn select_format(formats: &[VideoFormat], quality: Option<&str>, audio_only: bool) -> Option<VideoFormat> {
    if formats.is_empty() {
        return None;
    }

    let mut candidates: Vec<&VideoFormat> = if audio_only {
        formats.iter().filter(|f| f.has_audio && !f.has_video).collect()
    } else {
        formats.iter().filter(|f| f.has_video).collect()
    };

    if candidates.is_empty() {
        candidates = formats.iter().collect();
    }

    if let Some(q) = quality {
        let normalized = q.to_lowercase();
        if let Some(fmt) = candidates.iter().find(|f| f.quality.to_lowercase().contains(&normalized)) {
            return Some((*fmt).clone());
        }
    }

    candidates.sort_by(|a, b| b.height.unwrap_or(0).cmp(&a.height.unwrap_or(0)));
    candidates.first().cloned().cloned()
}

fn sanitize_filename(name: &str, ext: &str) -> String {
    let base: String = name
        .chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == ' ' || c == '-' || c == '_' { c } else { '_' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("_");
    format!("{}.{}", base, ext)
}

fn bad_request(msg: &str) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (axum::http::StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": msg})))
}

fn internal(msg: &str) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (axum::http::StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": msg})))
}

fn not_found(msg: &str) -> (axum::http::StatusCode, Json<serde_json::Value>) {
    (axum::http::StatusCode::NOT_FOUND, Json(serde_json::json!({"error": msg})))
}

fn error_response(status: axum::http::StatusCode, msg: &str) -> Response {
    Response::builder()
        .status(status)
        .header("Content-Type", "text/plain")
        .body(Body::from(msg.to_string()))
        .unwrap()
}


