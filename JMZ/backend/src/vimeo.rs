
use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::models::{VideoInfo, VideoFormat};
use crate::proxy::fetch_with_proxy_rotation;

const VIMEO_API_BASE: &str = "https://vimeo.com/api/oembed.json";
const MAX_VIDEO_DURATION_SECS: u64 = 7200; 


#[derive(Debug, Deserialize)]
struct VimeoOEmbed {
    title: String,
    author_name: String,
    duration: Option<u64>,
    thumbnail_url: String,
    upload_date: String,
}


pub async fn extract_video_info(url: &str) -> Result<VideoInfo, Box<dyn std::error::Error>> {
    let client = Client::new();
    
    
    let video_id = extract_vimeo_id(url)?;
    
    
    let oembed_url = format!("{}?url=https://vimeo.com/{}", VIMEO_API_BASE, video_id);
    
    let response = fetch_with_proxy_rotation(&client, &oembed_url).await?;
    let oembed: VimeoOEmbed = serde_json::from_str(&response)?;
    
  
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
            file_size: Some(25_000_000), 
            download_url: format!("https://vimeo.com/{}/download?quality=720p", video_id),
        },
        VideoFormat {
            format_id: "360p".to_string(),
            quality: "360p".to_string(),
            fps: 30,
            ext: "mp4".to_string(),
            file_size: Some(10_000_000), 
            download_url: format!("https://vimeo.com/{}/download?quality=360p", video_id),
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
        platform: "Vimeo".to_string(),
    })
}


fn extract_vimeo_id(url: &str) -> Result<String, Box<dyn std::error::Error>> {
    let patterns = vec![
        r"vimeo\.com/(\d+)",
        r"vimeo\.com/.*/(\d+)",
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
    
    Err("Invalid Vimeo URL".into())
}
