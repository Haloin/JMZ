
mod analytics;
use analytics::{analytics_middleware, AnalyticsStore};
mod routes;
mod handlers;
mod models;
mod extractors;
mod download;
mod crypto;
mod youtube;
mod vimeo;
mod dailymotion;
mod db;
mod auth;
mod payments;
mod storage;
mod proxy;
mod admin;
use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    Router,
    middleware::from_fn,
    routing::{delete, get, post},
};
use tower_http::cors::{Any, CorsLayer};
use tower_http::compression::CompressionLayer;
use tower_http::trace::TraceLayer;
use tracing::{info, Level};
use tracing_subscriber::EnvFilter;
use crate::models::AppState;
use crate::routes::{health, extract, download, progress, cancel, history, formats, stream};
use crate::handlers::{ws_handler, request_logger};
use crate::auth::{register, login, me};
use crate::payments::{get_tiers, create_checkout, handle_webhook, cancel_subscription};
use crate::admin::{get_stats, get_users, get_downloads};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let filter = EnvFilter::try_from_env("RUST_LOG")
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .init();

    info!("Starting VidSnatch API");

    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:./data.db".to_string());

    let db_pool = db::init_db(&database_url).await?;
    info!("Database ready");

    let mut state = AppState::new().with_db(db_pool);

    if let (Ok(access), Ok(secret), Ok(region), Ok(bucket)) = (
        std::env::var("S3_ACCESS_KEY"),
        std::env::var("S3_SECRET_KEY"),
        std::env::var("S3_REGION"),
        std::env::var("S3_BUCKET"),
    ) {
        let endpoint = std::env::var("S3_ENDPOINT").ok();
        let s3 = storage::S3Storage::new(&access, &secret, &region, &bucket, endpoint.as_deref()).await?;
        state = state.with_storage(s3);
        info!("S3 storage configured");
    }

    let state = Arc::new(state);
    let app = create_router(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(9000);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    info!("Server stopped");
    Ok(())
}

fn create_router(state: Arc<AppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let api = Router::new()
        .route("/health", get(health))
        .route("/extract", post(extract))
        .route("/download", post(download))
        .route("/progress/{id}", get(progress))
        .route("/cancel/{id}", delete(cancel))
        .route("/history", get(history))
        .route("/formats", post(formats))
        .route("/stream", get(stream))
        .route("/ws", get(ws_handler))
        .route("/auth/register", post(register))
        .route("/auth/login", post(login))
        .route("/auth/me", get(me))
        .route("/payments/tiers", get(get_tiers))
        .route("/payments/checkout", post(create_checkout))
        .route("/payments/webhook", post(handle_webhook))
        .route("/payments/cancel", post(cancel_subscription))
        .route("/admin/stats", get(get_stats))
        .route("/admin/users", get(get_users))
        .route("/admin/downloads", get(get_downloads));

    Router::new()
        .nest("/api", api)
        .layer(from_fn(request_logger))
        .layer(cors)
        .layer(CompressionLayer::new())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("Failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("Failed to install SIGTERM handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}

