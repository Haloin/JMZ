use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::models::{VideoInfo, VideoFormat};
use crate::proxy::fetch_with_proxy_rotation;

const YOUTUBE_INNERTUBE_KEY: &str = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const INNERTUBE_CLIENT_VERSION: &str = "2.20240101.00.00";
const MAX_VIDEO_DURATION_SECS: u64 = 7200;

#[derive(Debug, Serialize)]
struct PlayerRequest {
    #[serde(rename = "videoId")]
    video_id: String,
    context: PlayerContext,
}

#[derive(Debug, Serialize)]
struct PlayerContext {
    client: ClientInfo,
}

#[derive(Debug, Serialize)]
struct ClientInfo {
    #[serde(rename = "clientName")]
    client_name: String,
    #[serde(rename = "clientVersion")]
    client_version: String,
    hl: String,
    gl: String,
}

#[derive(Debug, Deserialize)]
struct PlayerResponse {
    #[serde(rename = "videoDetails")]
    video_details: Option<VideoDetails>,
    #[serde(rename = "streamingData")]
    streaming_data: Option<StreamingData>,
    #[serde(rename = "playabilityStatus")]
    playability_status: Option<PlayabilityStatus>,
}

#[derive(Debug, Deserialize)]
struct VideoDetails {
    #[serde(rename = "videoId")]
    video_id: String,
    title: String,
    author: String,
    #[serde(rename = "lengthSeconds")]
    length_seconds: String,
    #[serde(rename = "viewCount")]
    view_count: String,
    thumbnail: Thumbnails,
}

#[derive(Debug, Deserialize)]
struct Thumbnails {
    thumbnails: Vec<Thumbnail>,
}

#[derive(Debug, Deserialize, Clone)]
struct Thumbnail {
    url: String,
    width: Option<u32>,
    height: Option<u32>,
}

#[derive(Debug, Deserialize)]
struct PlayabilityStatus {
    status: String,
    reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct StreamingData {
    formats: Vec<YtFormat>,
    #[serde(rename = "adaptiveFormats")]
    adaptive_formats: Vec<YtFormat>,
}

#[derive(Debug, Deserialize, Clone)]
struct YtFormat {
    itag: u32,
    url: Option<String>,
    #[serde(rename = "mimeType")]
    mime_type: String,
    width: Option<u32>,
    height: Option<u32>,
    #[serde(rename = "contentLength")]
    content_length: Option<String>,
    #[serde(rename = "qualityLabel")]
    quality_label: Option<String>,
    #[serde(rename = "audioQuality")]
    audio_quality: Option<String>,
}

pub struct YouTubeExtractor {
    client: Client,
}

impl YouTubeExtractor {
    pub fn new() -> Self {
        Self {
            client: Client::builder()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .unwrap_or_default(),
        }
    }

    pub fn extract_video_id(&self, url: &str) -> Option<String> {
        let patterns = [
            regex::Regex::new(r"(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})").unwrap(),
        ];
        for re in &patterns {
            if let Some(caps) = re.captures(url) {
                return caps.get(1).map(|m| m.as_str().to_string());
            }
        }
        None
    }

    pub async fn extract(&self, url: &str) -> anyhow::Result<VideoInfo> {
        let video_id = self
            .extract_video_id(url)
            .ok_or_else(|| anyhow::anyhow!("Invalid YouTube URL"))?;

        let player = self.fetch_player(&video_id).await?;

        if let Some(status) = player.playability_status {
            if status.status != "OK" {
                return Err(anyhow::anyhow!(
                    "Video unavailable: {}",
                    status.reason.unwrap_or_else(|| "Unknown reason".to_string())
                ));
            }
        }

        let details = player
            .video_details
            .ok_or_else(|| anyhow::anyhow!("No video details returned"))?;

        let streaming = player
            .streaming_data
            .ok_or_else(|| anyhow::anyhow!("No streaming data returned â€” video may be restricted"))?;

        let duration: u64 = details
            .length_seconds
            .parse()
            .unwrap_or(0);

        if duration > MAX_VIDEO_DURATION_SECS {
            return Err(anyhow::anyhow!(
                "Video is too long ({}min). Maximum supported length is {}min.",
                duration / 60,
                MAX_VIDEO_DURATION_SECS / 60,
            ));
        }

        let thumbnail = details
            .thumbnail
            .thumbnails
            .iter()
            .max_by_key(|t| t.width.unwrap_or(0))
            .map(|t| t.url.clone());

        let formats = self.parse_formats(&streaming.formats, &streaming.adaptive_formats);

        Ok(VideoInfo {
            id: details.video_id.clone(),
            url: url.to_string(),
            title: details.title,
            author: details.author,
            duration: Some(duration),
            thumbnail,
            views: Some(format_view_count(&details.view_count)),
            upload_date: None,
            platform: "youtube".to_string(),
            formats,
        })
    }

    async fn fetch_player(&self, video_id: &str) -> anyhow::Result<PlayerResponse> {
        let endpoint = format!(
            "https://youtubei.googleapis.com/youtubei/v1/player?key={}",
            YOUTUBE_INNERTUBE_KEY
        );

        let body = PlayerRequest {
            video_id: video_id.to_string(),
            context: PlayerContext {
                client: ClientInfo {
                    client_name: "WEB".to_string(),
                    client_version: INNERTUBE_CLIENT_VERSION.to_string(),
                    hl: "en".to_string(),
                    gl: "US".to_string(),
                },
            },
        };

        let resp = self
            .client
            .post(&endpoint)
            .json(&body)
            .send()
            .await;

        match resp {
            Ok(r) if r.status().is_success() => Ok(r.json::<PlayerResponse>().await?),
            _ => {
                tracing::warn!("Primary YouTube request failed, trying proxy rotation");
                let proxy_resp = fetch_with_proxy_rotation(&endpoint, 3).await?;
                if !proxy_resp.status().is_success() {
                    return Err(anyhow::anyhow!(
                        "YouTube API returned status {}",
                        proxy_resp.status()
                    ));
                }
                Ok(proxy_resp.json::<PlayerResponse>().await?)
            }
        }
    }

    fn parse_formats(&self, formats: &[YtFormat], adaptive: &[YtFormat]) -> Vec<VideoFormat> {
        let mut result: Vec<VideoFormat> = formats
            .iter()
            .chain(adaptive.iter())
            .filter_map(|f| {
                let url = f.url.as_ref()?;
                let quality = f
                    .quality_label
                    .clone()
                    .unwrap_or_else(|| format!("{}p", f.height.unwrap_or(0)));

                let (vcodec, acodec) = parse_codecs(&f.mime_type);
                let has_video = f.width.is_some();
                let has_audio = f.audio_quality.is_some() || (!has_video && acodec.is_some());

                Some(VideoFormat {
                    format_id: f.itag.to_string(),
                    ext: if has_video { "mp4".to_string() } else { "m4a".to_string() },
                    quality,
                    width: f.width.map(|w| w as i32),
                    height: f.height.map(|h| h as i32),
                    filesize: f.content_length.as_ref().and_then(|s| s.parse().ok()),
                    url: url.clone(),
                    vcodec,
                    acodec,
                    has_video,
                    has_audio,
                })
            })
            .collect();

        result.sort_by(|a, b| b.height.unwrap_or(0).cmp(&a.height.unwrap_or(0)));
        result.dedup_by(|a, b| a.format_id == b.format_id);
        result
    }
}

fn parse_codecs(mime: &str) -> (Option<String>, Option<String>) {
    let vcodec = if mime.contains("avc1") || mime.contains("avc") {
        Some("h264".to_string())
    } else if mime.contains("vp9") {
        Some("vp9".to_string())
    } else if mime.contains("av01") {
        Some("av1".to_string())
    } else {
        None
    };

    let acodec = if mime.contains("mp4a") {
        Some("aac".to_string())
    } else if mime.contains("opus") {
        Some("opus".to_string())
    } else {
        None
    };

    (vcodec, acodec)
}

fn format_view_count(count: &str) -> String {
    let n: u64 = count.parse().unwrap_or(0);
    if n >= 1_000_000_000 {
        format!("{:.1}B", n as f64 / 1_000_000_000.0)
    } else if n >= 1_000_000 {
        format!("{:.1}M", n as f64 / 1_000_000.0)
    } else if n >= 1_000 {
        format!("{:.1}K", n as f64 / 1_000.0)
    } else {
        count.to_string()
    }
}


