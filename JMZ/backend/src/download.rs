use std::sync::Arc;
use crate::models::{AppState, DownloadProgress};


pub async fn simulate_download_progress(state: Arc<AppState>, id: String) {
    let total: u64 = 100_000_000;
    let chunks: u64 = 20;
    let chunk_size = total / chunks;

    for i in 0..chunks {
        tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;

        let downloaded = chunk_size * (i + 1);
        let progress = (downloaded as f64 / total as f64) * 100.0;
        let speed: u64 = 5_000_000;
        let eta = (total - downloaded) / speed;

        let status = if i < chunks - 1 { "downloading" } else { "processing" };

        state.update_progress(&id, DownloadProgress {
            id: id.clone(),
            status: status.to_string(),
            progress,
            speed,
            downloaded_bytes: Some(downloaded),
            total_bytes: Some(total),
            eta: Some(eta),
            error: None,
        });
    }

    tokio::time::sleep(tokio::time::Duration::from_secs(1)).await;
    state.cancel_download(&id);
}


