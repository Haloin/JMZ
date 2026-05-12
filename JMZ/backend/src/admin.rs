// Admin Panel Module
// Provides user management and analytics for administrators
use axum::{
    extract::{State, Query},
    Json,
};
use serde::Deserialize;
use std::sync::Arc;
use tracing::{info, error};

use crate::models::AppState;
use crate::auth::AuthUser;
use crate::error::{AppError, Result};

/// Admin dashboard statistics
#[derive(serde::Serialize)]
pub struct AdminStats {
    pub total_users: i64,
    pub total_downloads: i64,
    pub total_revenue: f64,
    pub active_downloads: i64,
    pub users_today: i64,
    pub downloads_today: i64,
    pub popular_sites: Vec<(String, i64)>,
}

/// User list for admin management
#[derive(serde::Serialize)]
pub struct AdminUser {
    pub id: String,
    pub email: String,
    pub created_at: String,
    pub last_login: Option<String>,
    pub download_count: i64,
    pub is_premium: bool,
}

/// Admin query parameters
#[derive(Deserialize)]
pub struct AdminQuery {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub search: Option<String>,
}

#[derive(serde::Serialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub tier: String,
    pub created_at: String,
    pub download_count: i64,
}

#[derive(serde::Serialize)]
pub struct DownloadInfo {
    pub id: String,
    pub title: String,
    pub platform: String,
    pub status: String,
    pub user_email: String,
    pub created_at: String,
}

/// Get admin dashboard statistics
pub async fn get_stats(
    _user: AuthUser,
    State(state): State<Arc<AppState>>,
) -> Result<Json<AdminStats>> {
    // Verify admin access
    // In production, check if user has admin role
    
    info!("Admin stats requested by: {}", _user.email);
    
    // Mock data - in production, query actual database
    let stats = AdminStats {
        total_users: 1247,
        total_downloads: 8934,
        total_revenue: 12580.50,
        active_downloads: 23,
        users_today: 12,
        downloads_today: 156,
    };
    
    Ok(Json(stats))
}

pub async fn get_users(
    _user: AuthUser,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<UserInfo>>> {
    info!("Admin users list requested by: {}", _user.email);
    
    // Mock data - in production, query actual database
    let users = vec![
        UserInfo {
            id: "1".to_string(),
            email: "user1@example.com".to_string(),
            tier: "pro".to_string(),
            created_at: "2024-01-15".to_string(),
            download_count: 45,
        },
        UserInfo {
            id: "2".to_string(),
            email: "user2@example.com".to_string(),
            tier: "basic".to_string(),
            created_at: "2024-01-14".to_string(),
            download_count: 12,
        },
    ];
    
    Ok(Json(users))
}

pub async fn get_downloads(
    _user: AuthUser,
    State(state): State<Arc<AppState>>,
) -> Result<Json<Vec<DownloadInfo>>> {
    info!("Admin downloads list requested by: {}", _user.email);
    
    // Mock data - in production, query actual database
    let downloads = vec![
        DownloadInfo {
            id: "1".to_string(),
            title: "Amazing Video".to_string(),
            platform: "youtube".to_string(),
            status: "completed".to_string(),
            user_email: "user1@example.com".to_string(),
            created_at: "2024-01-15".to_string(),
        },
        DownloadInfo {
            id: "2".to_string(),
            title: "Tutorial Series".to_string(),
            platform: "vimeo".to_string(),
            status: "processing".to_string(),
            user_email: "user2@example.com".to_string(),
            created_at: "2024-01-15".to_string(),
        },
    ];
    
    Ok(Json(downloads))
}


