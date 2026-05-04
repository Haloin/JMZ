use reqwest::{Client, ClientBuilder, Response};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use once_cell::sync::Lazy;
use rand::seq::SliceRandom;
use tracing::warn;

#[derive(Clone, Debug)]
pub struct ProxyConfig {
    pub url: String,
    pub failures: u32,
    pub last_used: Option<Instant>,
}

static PROXY_MANAGER: Lazy<Mutex<Vec<ProxyConfig>>> = Lazy::new(|| {
    let proxies = load_proxies_from_env();
    Mutex::new(proxies)
});

fn load_proxies_from_env() -> Vec<ProxyConfig> {
    let list = std::env::var("PROXY_LIST").unwrap_or_default();
    list.split(',')
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|url| ProxyConfig { url: url.to_string(), failures: 0, last_used: None })
        .collect()
}

pub fn build_client_with_proxy(proxy_url: &str) -> anyhow::Result<Client> {
    let proxy = reqwest::Proxy::all(proxy_url)?;
    let client = ClientBuilder::new()
        .proxy(proxy)
        .timeout(Duration::from_secs(20))
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .build()?;
    Ok(client)
}

pub async fn fetch_with_proxy_rotation(url: &str, retries: usize) -> anyhow::Result<Response> {
    let proxies: Vec<ProxyConfig> = {
        let guard = PROXY_MANAGER.lock().unwrap();
        let mut list: Vec<&ProxyConfig> = guard
            .iter()
            .filter(|p| p.failures < 3)
            .collect();
        list.shuffle(&mut rand::thread_rng());
        list.iter().take(retries).map(|p| (*p).clone()).collect()
    };

    if proxies.is_empty() {
        let client = Client::builder()
            .timeout(Duration::from_secs(20))
            .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
            .build()?;
        return Ok(client.get(url).send().await?);
    }

    for proxy in &proxies {
        match build_client_with_proxy(&proxy.url) {
            Ok(client) => match client.get(url).send().await {
                Ok(resp) => return Ok(resp),
                Err(e) => {
                    warn!("Proxy {} failed: {}", proxy.url, e);
                    let mut guard = PROXY_MANAGER.lock().unwrap();
                    if let Some(p) = guard.iter_mut().find(|p| p.url == proxy.url) {
                        p.failures += 1;
                    }
                }
            },
            Err(e) => {
                warn!("Failed to build proxy client for {}: {}", proxy.url, e);
            }
        }
    }

    Err(anyhow::anyhow!("All proxy attempts failed for URL: {}", url))
}

pub fn proxy_count() -> usize {
    PROXY_MANAGER.lock().unwrap().len()
}


