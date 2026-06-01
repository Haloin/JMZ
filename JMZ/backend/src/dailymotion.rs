
use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::models::{VideoInfo, VideoFormat};
use crate::proxy::fetch_with_proxy_rotation;

const DAILYMOTION_API_BASE: &str = "https://www.dailymotion.com/services/oembed";
const MAX_VIDEO_DURATION_SECS: u64 = 7200; 


#[derive(Debug, Deserialize)]
struct DailymotionOEmbed {
    title: String,
    author_name: String,
    duration: Option<u64>,
    thumbnail_url: String,
    upload_date: String,
}


pub async fn extract_video_info(url: &str) -> Result<VideoInfo, Box<dyn std::error::Error>> {
    let client = Client::new();
    
   
    let video_id = extract_dailymotion_id(url)?;
    

    let oembed_url = format!("{}?url=https://dailymotion.com/video/{}", DAILYMOTION_API_BASE, video_id);
    
    let response = fetch_with_proxy_rotation(&client, &oembed_url).await?;
    let oembed: DailymotionOEmbed = serde_json::from_str(&response)?;
    
    
    if let Some(duration) = oembed.duration {
        if duration > MAX_VIDEO_DURATION_SECS {
            return Err("Video too long".into());
        }
    }
    
    let formats = vec![
        VideoFormat {
            format_id: "720p".to_string(),
            quality: "720p".to_string(),
            fps: 30,
            ext: "mp4".to_string(),
            file_size: Some(20_000_000), 
            download_url: format!("https://www.dailymotion.com/video/{}/download?quality=720", video_id),
        },
        VideoFormat {
            format_id: "480p".to_string(),
            quality: "480p".to_string(),
            fps: 30,
            ext: "mp4".to_string(),
            file_size: Some(12_000_000), 
            download_url: format!("https://www.dailymotion.com/video/{}/download?quality=480", video_id),
        },
        VideoFormat {
            format_id: "360p".to_string(),
            quality: "360p".to_string(),
            fps: 30,
            ext: "mp4".to_string(),
            file_size: Some(8_000_000), 
            download_url: format!("https://www.dailymotion.com/video/{}/download?quality=360", video_id),
        },
    ];
    
    Ok(VideoInfo {
        id: video_id,
        title: oembed.title,
        description: format!("Video by {}", oembed.author_name),
        duration: oembed.duration,
        thumbnail: oembed.thumbnail_url,
        uploader: oembed.author_name,
        upload_date: oembed.upload_date,
        formats,
        platform: "Dailymotion".to_string(),
    })
}


fn extract_dailymotion_id(url: &str) -> Result<String, Box<dyn std::error::Error>> {
    let patterns = vec![
        r"dailymotion\.com/video/([a-zA-Z0-9]+)",
        r"dai\.ly/([a-zA-Z0-9]+)",
    ];
    
    for pattern in patterns {
        if let Ok(regex) = regex::Regex::new(pattern) {
            if let Some(captures) = regex.captures(url) {
                if let Some(id) = captures.get(1) {
                    return Ok(id.as_str().to_string());
                }
            }
        }
    }
    
    Err("Invalid Dailymotion URL".into())
}
