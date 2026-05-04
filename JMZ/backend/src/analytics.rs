use axum::{
    extract::Request,
    middleware::Next,
    response::Response,
};
use std::time::Instant;
use tracing::{info, Span};
use tracing::field::Empty;

#[derive(Clone, Debug)]
pub struct AnalyticsEvent {
    pub endpoint: String,
    pub method: String,
    pub status_code: u16,
    pub duration_ms: u64,
    pub user_id: Option<String>,
    pub user_agent: Option<String>,
    pub ip_address: Option<String>,
}

pub async fn analytics_middleware(
    request: Request,
    next: Next,
) -> Response {
    let start = Instant::now();
    let endpoint = request.uri().path().to_string();
    let method = request.method().to_string();
    
    // Extract user info if available
    let user_id = request.headers()
        .get("x-user-id")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    
    let user_agent = request.headers()
        .get("user-agent")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    
    let ip_address = request.headers()
        .get("x-forwarded-for")
        .or_else(|| request.headers().get("x-real-ip"))
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let response = next.run(request).await;
    let duration = start.elapsed();
    let status_code = response.status().as_u16();

    // Log analytics event
    info!(
        endpoint = %endpoint,
        method = %method,
        status_code = status_code,
        duration_ms = duration.as_millis() as u64,
        user_id = ?user_id,
        "API request"
    );

    // In production, send to analytics service (e.g., Mixpanel, Amplitude, or custom DB)
    // Example: analytics_service.track(event).await;

    response
}

// Basic usage statistics store
use std::sync::{Arc, Mutex};
use std::collections::HashMap;

#[derive(Default, Debug)]
pub struct UsageStats {
    pub total_requests: u64,
    pub requests_by_endpoint: HashMap<String, u64>,
    pub requests_by_user: HashMap<String, u64>,
    pub error_count: u64,
    pub avg_response_time_ms: f64,
}

#[derive(Clone)]
pub struct AnalyticsStore {
    stats: Arc<Mutex<UsageStats>>,
}

impl AnalyticsStore {
    pub fn new() -> Self {
        Self {
            stats: Arc::new(Mutex::new(UsageStats::default())),
        }
    }

    pub fn record_request(&self, endpoint: &str, user_id: Option<&str>, duration_ms: u64, is_error: bool) {
        if let Ok(mut stats) = self.stats.lock() {
            stats.total_requests += 1;
            *stats.requests_by_endpoint.entry(endpoint.to_string()).or_insert(0) += 1;
            
            if let Some(uid) = user_id {
                *stats.requests_by_user.entry(uid.to_string()).or_insert(0) += 1;
            }
            
            if is_error {
                stats.error_count += 1;
            }
            
            // Update rolling average
            let n = stats.total_requests as f64;
            stats.avg_response_time_ms = 
                (stats.avg_response_time_ms * (n - 1.0) + duration_ms as f64) / n;
        }
    }

    pub fn get_stats(&self) -> Option<UsageStats> {
        self.stats.lock().ok().map(|s| UsageStats {
            total_requests: s.total_requests,
            requests_by_endpoint: s.requests_by_endpoint.clone(),
            requests_by_user: s.requests_by_user.clone(),
            error_count: s.error_count,
            avg_response_time_ms: s.avg_response_time_ms,
        })
    }
}


