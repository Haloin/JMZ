use once_cell::sync::Lazy;
use regex::Regex;

static PLATFORM_PATTERNS: Lazy<Vec<(Regex, &'static str)>> = Lazy::new(|| {
    vec![
        (Regex::new(r"youtube\.com|youtu\.be").unwrap(), "youtube"),
        (Regex::new(r"instagram\.com").unwrap(), "instagram"),
        (Regex::new(r"twitter\.com|x\.com").unwrap(), "twitter"),
        (Regex::new(r"tiktok\.com").unwrap(), "tiktok"),
        (Regex::new(r"reddit\.com").unwrap(), "reddit"),
        (Regex::new(r"vimeo\.com").unwrap(), "vimeo"),
        (Regex::new(r"soundcloud\.com").unwrap(), "soundcloud"),
    ]
});

pub fn detect_platform(url: &str) -> String {
    for (pattern, platform) in PLATFORM_PATTERNS.iter() {
        if pattern.is_match(url) {
            return platform.to_string();
        }
    }
    "unknown".to_string()
}


