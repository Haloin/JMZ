use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Request, State,
    },
    middleware::Next,
    response::Response,
};
use std::sync::Arc;
use futures::{sink::SinkExt, stream::StreamExt};
use tracing::{info, warn};

use crate::models::AppState;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(mut socket: WebSocket, _state: Arc<AppState>) {
    let welcome = r#"{"type":"connected","message":"WebSocket connected"}"#;
    if socket.send(Message::Text(welcome.to_string())).await.is_err() {
        return;
    }

    while let Some(msg) = socket.recv().await {
        match msg {
            Ok(Message::Text(text)) => {
                let reply = serde_json::json!({
                    "type": "ack",
                    "timestamp": chrono::Utc::now().timestamp_millis(),
                });
                if socket.send(Message::Text(reply.to_string())).await.is_err() {
                    break;
                }
            }
            Ok(Message::Close(_)) | Err(_) => break,
            _ => {}
        }
    }
}

pub async fn request_logger(req: Request, next: Next) -> Response {
    let method = req.method().clone();
    let path = req.uri().path().to_string();
    let start = std::time::Instant::now();

    let response = next.run(req).await;

    info!(
        "{} {} â†’ {} ({:?})",
        method,
        path,
        response.status().as_u16(),
        start.elapsed()
    );

    response
}

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use once_cell::sync::Lazy;

static RATE_LIMITS: Lazy<Mutex<HashMap<String, Vec<u64>>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

const RATE_LIMIT_WINDOW_SECS: u64 = 60;
const RATE_LIMIT_MAX_REQUESTS: usize = 60;

pub async fn rate_limit(req: Request, next: Next) -> Response {
    let client_ip = req
        .headers()
        .get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.split(',').next())
        .unwrap_or("unknown")
        .trim()
        .to_string();

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let allowed = {
        let mut map = RATE_LIMITS.lock().unwrap();
        let timestamps = map.entry(client_ip.clone()).or_default();
        timestamps.retain(|&t| now - t < RATE_LIMIT_WINDOW_SECS);
        if timestamps.len() >= RATE_LIMIT_MAX_REQUESTS {
            false
        } else {
            timestamps.push(now);
            true
        }
    };

    if !allowed {
        warn!("Rate limit exceeded for {}", client_ip);
        return Response::builder()
            .status(axum::http::StatusCode::TOO_MANY_REQUESTS)
            .header("Retry-After", "60")
            .body(axum::body::Body::from("Rate limit exceeded"))
            .unwrap();
    }

    next.run(req).await
}


