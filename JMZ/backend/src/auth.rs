
use axum::{
    extract::{FromRequestParts, State},
    http::{request::Parts, StatusCode},
    Json,
};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::db::{DbPool, User};
use crate::models::AppState;


#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub email: String,
    pub is_admin: bool,
    pub tier: String,
    pub exp: i64,
    pub iat: i64,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub name: Option<String>,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserResponse,
}

#[derive(Debug, Serialize)]
pub struct UserResponse {
    pub id: String,
    pub email: String,
    pub subscription_tier: String,
    pub downloads_used: i64,
    pub downloads_limit: i64,
    pub storage_used_bytes: i64,
    pub storage_limit_bytes: i64,
    pub has_active_subscription: bool,
}

impl From<User> for UserResponse {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            subscription_tier: user.subscription_tier.clone(),
            downloads_used: user.downloads_used,
            downloads_limit: user.downloads_limit,
            storage_used_bytes: user.storage_used_bytes,
            storage_limit_bytes: user.storage_limit_bytes,
            has_active_subscription: user.has_active_subscription(),
        }
    }
}

pub fn create_token(user: &User, secret: &str) -> anyhow::Result<String> {
    let now = chrono::Utc::now();
    let exp = now + chrono::Duration::days(30);

    let claims = Claims {
        sub: user.id.clone(),
        email: user.email.clone(),
        is_admin: user.is_admin,
        tier: user.subscription_tier.clone(),
        exp: exp.timestamp(),
        iat: now.timestamp(),
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;

    Ok(token)
}

pub fn verify_token(token: &str, secret: &str) -> anyhow::Result<Claims> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;
    Ok(token_data.claims)
}

pub struct AuthUser {
    pub user_id: String,
    pub email: String,
    pub is_admin: bool,
    pub tier: String,
}

impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.strip_prefix("Bearer "))
            .ok_or((
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Missing authorization header"})),
            ))?;

        let state = parts
            .extensions
            .get::<Arc<AppState>>()
            .ok_or((
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(serde_json::json!({"error": "Internal server error"})),
            ))?;

        let claims = verify_token(token, &state.jwt_secret).map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                Json(serde_json::json!({"error": "Invalid or expired token"})),
            )
        })?;

        Ok(AuthUser {
            user_id: claims.sub,
            email: claims.email,
            is_admin: claims.is_admin,
            tier: claims.tier,
        })
    }
}

pub struct AdminUser {
    pub user_id: String,
    pub email: String,
}

impl<S> FromRequestParts<S> for AdminUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, Json<serde_json::Value>);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let auth_user = AuthUser::from_request_parts(parts, state).await?;
        if !auth_user.is_admin {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({"error": "Admin access required"})),
            ));
        }
        Ok(AdminUser { user_id: auth_user.user_id, email: auth_user.email })
    }
}

pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RegisterRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<serde_json::Value>)> {
    if req.email.is_empty() || req.password.len() < 8 {
        return Err((
            StatusCode::BAD_REQUEST,
            Json(serde_json::json!({"error": "Valid email and password (min 8 characters) are required"})),
        ));
    }

    let pool = db_pool(&state)?;

    if User::get_by_email(pool, &req.email).await.is_ok_and(|u| u.is_some()) {
        return Err((
            StatusCode::CONFLICT,
            Json(serde_json::json!({"error": "Email already registered"})),
        ));
    }

    let user = User::create(pool, &req.email, &req.password)
        .await
        .map_err(|_| internal("Failed to create account"))?;

    let token = create_token(&user, &state.jwt_secret)
        .map_err(|_| internal("Failed to create session"))?;

    Ok(Json(AuthResponse { token, user: user.into() }))
}

pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LoginRequest>,
) -> Result<Json<AuthResponse>, (StatusCode, Json<serde_json::Value>)> {
    let pool = db_pool(&state)?;

    let user = User::get_by_email(pool, &req.email)
        .await
        .map_err(|_| internal("Database error"))?
        .ok_or((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid email or password"})),
        ))?;

    if !user.verify_password(&req.password) {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(serde_json::json!({"error": "Invalid email or password"})),
        ));
    }

    if !user.is_active {
        return Err((
            StatusCode::FORBIDDEN,
            Json(serde_json::json!({"error": "Account is deactivated"})),
        ));
    }

    let token = create_token(&user, &state.jwt_secret)
        .map_err(|_| internal("Failed to create session"))?;

    Ok(Json(AuthResponse { token, user: user.into() }))
}

pub async fn me(
    auth_user: AuthUser,
    State(state): State<Arc<AppState>>,
) -> Result<Json<UserResponse>, (StatusCode, Json<serde_json::Value>)> {
    let pool = db_pool(&state)?;

    let user = User::get_by_id(pool, &auth_user.user_id)
        .await
        .map_err(|_| internal("Database error"))?
        .ok_or((
            StatusCode::NOT_FOUND,
            Json(serde_json::json!({"error": "User not found"})),
        ))?;

    Ok(Json(user.into()))
}

fn db_pool(state: &AppState) -> Result<&crate::db::DbPool, (StatusCode, Json<serde_json::Value>)> {
    state.db.as_ref().ok_or((
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(serde_json::json!({"error": "Database not initialized"})),
    ))
}

fn internal(msg: &str) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": msg})))
}


