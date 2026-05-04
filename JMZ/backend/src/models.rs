use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoInfo {
    pub id: String,
    pub url: String,
    pub title: String,
    pub author: String,
    pub duration: Option<u64>,
    pub thumbnail: Option<String>,
    pub views: Option<String>,
    pub upload_date: Option<String>,
    pub platform: String,
    pub formats: Vec<VideoFormat>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoFormat {
    pub format_id: String,
    pub ext: String,
    pub quality: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub filesize: Option<i64>,
    pub url: String,
    pub vcodec: Option<String>,
    pub acodec: Option<String>,
    pub has_video: bool,
    pub has_audio: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadRequest {
    pub url: String,
    pub title: Option<String>,
    pub quality: Option<String>,
    pub format: Option<String>,
    pub audio_only: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractRequest {
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgress {
    pub id: String,
    pub status: String,
    pub progress: f64,
    pub speed: u64,
    pub downloaded_bytes: Option<u64>,
    pub total_bytes: Option<u64>,
    pub eta: Option<u64>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadRecord {
    pub id: String,
    pub title: String,
    pub url: String,
    pub thumbnail: Option<String>,
    pub quality: String,
    pub platform: String,
    pub completed_at: DateTime<Utc>,
    pub file_path: Option<String>,
}

pub struct AppState {
    pub downloads: Mutex<HashMap<String, DownloadProgress>>,
    pub stream_cache: Mutex<HashMap<String, (Vec<u8>, [u8; 32], [u8; 12])>>,
    pub jwt_secret: String,
    pub db: Option<crate::db::DbPool>,
    pub storage: Option<crate::storage::S3Storage>,
    pub stripe_secret: Option<String>,
    pub stripe_webhook_secret: Option<String>,
}

impl AppState {
    pub fn new() -> Self {
        let jwt_secret = std::env::var("JWT_SECRET")
            .unwrap_or_else(|_| {
                let random: String = (0..32)
                    .map(|_| rand::random::<u8>())
                    .map(|b| format!("{:02x}", b))
                    .collect();
                tracing::warn!("JWT_SECRET not set â€” using generated key (sessions will not survive restarts)");
                random
            });

        Self {
            downloads: Mutex::new(HashMap::new()),
            stream_cache: Mutex::new(HashMap::new()),
            jwt_secret,
            db: None,
            storage: None,
            stripe_secret: std::env::var("STRIPE_SECRET_KEY").ok(),
            stripe_webhook_secret: std::env::var("STRIPE_WEBHOOK_SECRET").ok(),
        }
    }

    pub fn with_db(mut self, db: crate::db::DbPool) -> Self {
        self.db = Some(db);
        self
    }

    pub fn with_storage(mut self, storage: crate::storage::S3Storage) -> Self {
        self.storage = Some(storage);
        self
    }

    pub fn create_download(&self, id: String) {
        let mut map = self.downloads.lock().unwrap();
        map.insert(id.clone(), DownloadProgress {
            id,
            status: "pending".to_string(),
            progress: 0.0,
            speed: 0,
            downloaded_bytes: None,
            total_bytes: None,
            eta: None,
            error: None,
        });
    }

    pub fn update_progress(&self, id: &str, progress: DownloadProgress) {
        let mut map = self.downloads.lock().unwrap();
        if let Some(p) = map.get_mut(id) {
            *p = progress;
        }
    }

    pub fn get_progress(&self, id: &str) -> Option<DownloadProgress> {
        self.downloads.lock().unwrap().get(id).cloned()
    }

    pub fn cancel_download(&self, id: &str) {
        self.downloads.lock().unwrap().remove(id);
    }
}


