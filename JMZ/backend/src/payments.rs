use axum::{
    extract::State,
    http::StatusCode,
    Json,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::auth::AuthUser;
use crate::db::{DbPool, User};
use crate::models::AppState;

#[derive(Debug, Clone, Serialize)]
pub struct TierInfo {
    pub id: &'static str,
    pub name: &'static str,
    pub price_monthly_cents: i64,
    pub downloads_per_month: i64,
    pub storage_gb: i64,
    pub features: Vec<&'static str>,
}

pub const TIERS: &[TierInfo] = &[
    TierInfo {
        id: "free",
        name: "Free",
        price_monthly_cents: 0,
        downloads_per_month: 10,
        storage_gb: 1,
        features: &["10 downloads/month", "1 GB storage", "720p max quality"],
    },
    TierInfo {
        id: "basic",
        name: "Basic",
        price_monthly_cents: 999,
        downloads_per_month: 100,
        storage_gb: 10,
        features: &["100 downloads/month", "10 GB storage", "1080p max quality", "Download history"],
    },
    TierInfo {
        id: "pro",
        name: "Pro",
        price_monthly_cents: 1999,
        downloads_per_month: 1000,
        storage_gb: 100,
        features: &["1,000 downloads/month", "100 GB storage", "4K max quality", "API access", "Batch downloads"],
    },
    TierInfo {
        id: "private",
        name: "Private",
        price_monthly_cents: 4999,
        downloads_per_month: 999999,
        storage_gb: 500,
        features: &[
            "Unlimited downloads",
            "500 GB storage",
            "4K max quality",
            "Proxy rotation",
            "Stealth mode",
            "No activity logging",
            "24/7 priority support",
        ],
    },
];

#[derive(Debug, Deserialize)]
pub struct CreateCheckoutRequest {
    pub tier: String,
    pub yearly: Option<bool>,
    pub success_url: Option<String>,
    pub cancel_url: Option<String>,
}

pub async fn get_tiers() -> Json<Vec<TierInfo>> {
    Json(TIERS.to_vec())
}

pub async fn create_checkout(
    auth_user: AuthUser,
    State(state): State<Arc<AppState>>,
    Json(req): Json<CreateCheckoutRequest>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let pool = db_pool(&state)?;
    let stripe_secret = stripe_secret(&state)?;

    let user = User::get_by_id(pool, &auth_user.user_id)
        .await
        .map_err(|_| internal("Database error"))?
        .ok_or_else(|| not_found("User not found"))?;

    let price_id = price_id_for_tier(&req.tier, req.yearly.unwrap_or(false)).ok_or_else(|| {
        bad_request("Invalid subscription tier")
    })?;

    let stripe = stripe::Client::new(stripe_secret);

    let customer_id = match user.stripe_customer_id.clone() {
        Some(id) => id,
        None => {
            let customer = stripe::CreateCustomer {
                email: Some(&user.email),
                metadata: Some(std::collections::HashMap::from([(
                    "user_id".to_string(),
                    user.id.clone(),
                )])),
                ..Default::default()
            };
            stripe::Customer::create(&stripe, customer)
                .await
                .map_err(|_| internal("Failed to create billing customer"))?
                .id
                .to_string()
        }
    };

    let success_url = req.success_url.as_deref().unwrap_or("https://vidsnatch.com/portal?upgraded=1");
    let cancel_url = req.cancel_url.as_deref().unwrap_or("https://vidsnatch.com/pricing");

    let session = stripe::CreateCheckoutSession {
        customer: Some(customer_id.parse().unwrap()),
        line_items: Some(vec![stripe::CreateCheckoutSessionLineItems {
            price: Some(price_id.to_string()),
            quantity: Some(1),
            ..Default::default()
        }]),
        mode: Some(stripe::CheckoutSessionMode::Subscription),
        success_url: Some(success_url),
        cancel_url: Some(cancel_url),
        client_reference_id: Some(&user.id),
        ..Default::default()
    };

    let session = stripe::CheckoutSession::create(&stripe, session)
        .await
        .map_err(|e| {
            tracing::error!("Stripe checkout error: {:?}", e);
            internal("Failed to create checkout session")
        })?;

    let url = session.url.ok_or_else(|| internal("No checkout URL in response"))?;

    Ok(Json(serde_json::json!({"checkout_url": url})))
}

pub async fn handle_webhook(
    State(state): State<Arc<AppState>>,
    headers: axum::http::HeaderMap,
    body: String,
) -> Result<StatusCode, (StatusCode, Json<serde_json::Value>)> {
    let pool = db_pool(&state)?;
    let webhook_secret = state.stripe_webhook_secret.as_ref().ok_or_else(|| {
        bad_request("Webhook secret not configured")
    })?;

    let sig = headers
        .get("stripe-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| bad_request("Missing Stripe-Signature header"))?;

    let event = stripe::Webhook::construct_event(&body, sig, webhook_secret)
        .map_err(|_| bad_request("Invalid webhook signature"))?;

    match event.event_type {
        stripe::EventType::CheckoutSessionCompleted => {
            if let stripe::EventObject::CheckoutSession(session) = event.data.object {
                on_checkout_complete(pool, session).await.ok();
            }
        }
        stripe::EventType::CustomerSubscriptionDeleted => {
            if let stripe::EventObject::Subscription(sub) = event.data.object {
                on_subscription_cancelled(pool, sub).await.ok();
            }
        }
        _ => {}
    }

    Ok(StatusCode::OK)
}

pub async fn cancel_subscription(
    auth_user: AuthUser,
    State(state): State<Arc<AppState>>,
) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)> {
    let pool = db_pool(&state)?;
    let stripe_secret = stripe_secret(&state)?;

    let user = User::get_by_id(pool, &auth_user.user_id)
        .await
        .map_err(|_| internal("Database error"))?
        .ok_or_else(|| not_found("User not found"))?;

    let sub_id = user.stripe_subscription_id.as_ref().ok_or_else(|| {
        bad_request("No active subscription to cancel")
    })?;

    let stripe = stripe::Client::new(stripe_secret);
    stripe::Subscription::cancel(
        &stripe,
        &sub_id.parse().unwrap(),
        stripe::CancelSubscription::default(),
    )
    .await
    .map_err(|_| internal("Failed to cancel subscription with Stripe"))?;

    user.update_subscription(pool, "free", None, None)
        .await
        .map_err(|_| internal("Failed to update subscription"))?;

    Ok(Json(serde_json::json!({"message": "Subscription cancelled"})))
}

async fn on_checkout_complete(pool: &DbPool, session: stripe::CheckoutSession) -> anyhow::Result<()> {
    let user_id = session.client_reference_id.ok_or_else(|| anyhow::anyhow!("No client_reference_id"))?;
    let sub_id = session.subscription.ok_or_else(|| anyhow::anyhow!("No subscription ID"))?.to_string();

    let user = User::get_by_id(pool, &user_id).await?.ok_or_else(|| anyhow::anyhow!("User not found"))?;
    let expires = chrono::Utc::now() + chrono::Duration::days(30);

    let tier = session
        .line_items
        .as_ref()
        .and_then(|li| li.data.first())
        .and_then(|item| item.price.as_ref())
        .and_then(|p| p.id.to_str().ok())
        .map(|id| tier_from_price_id(id))
        .unwrap_or("basic");

    user.update_subscription(pool, tier, Some(&sub_id), Some(expires)).await?;
    tracing::info!("User {} upgraded to {}", user_id, tier);
    Ok(())
}

async fn on_subscription_cancelled(pool: &DbPool, sub: stripe::Subscription) -> anyhow::Result<()> {
    let sub_id = sub.id.to_string();
    let user: Option<crate::db::User> = sqlx::query_as(
        "SELECT * FROM users WHERE stripe_subscription_id = ?",
    )
    .bind(&sub_id)
    .fetch_optional(pool)
    .await?;

    if let Some(u) = user {
        u.update_subscription(pool, "free", None, None).await?;
        tracing::info!("User {} downgraded to free (subscription cancelled)", u.id);
    }
    Ok(())
}

fn price_id_for_tier(tier: &str, yearly: bool) -> Option<&'static str> {
    match (tier, yearly) {
        ("basic", false)   => Some("price_basic_monthly"),
        ("basic", true)    => Some("price_basic_yearly"),
        ("pro", false)     => Some("price_pro_monthly"),
        ("pro", true)      => Some("price_pro_yearly"),
        ("private", false) => Some("price_private_monthly"),
        ("private", true)  => Some("price_private_yearly"),
        _                  => None,
    }
}

fn tier_from_price_id(price_id: &str) -> &'static str {
    if price_id.contains("private") { "private" }
    else if price_id.contains("pro") { "pro" }
    else if price_id.contains("basic") { "basic" }
    else { "free" }
}

fn db_pool(state: &AppState) -> Result<&DbPool, (StatusCode, Json<serde_json::Value>)> {
    state.db.as_ref().ok_or_else(|| internal("Database not initialized"))
}

fn stripe_secret(state: &AppState) -> Result<&str, (StatusCode, Json<serde_json::Value>)> {
    state.stripe_secret.as_deref().ok_or_else(|| bad_request("Payment processing not configured"))
}

fn bad_request(msg: &str) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": msg})))
}

fn internal(msg: &str) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": msg})))
}

fn not_found(msg: &str) -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": msg})))
}


