use aws_sdk_s3::{Client, Config};
use aws_sdk_s3::config::{Credentials, Region};
use aws_sdk_s3::primitives::ByteStream;
use std::time::Duration;

pub struct S3Storage {
    client: Client,
    bucket: String,
    base_url: String,
}

impl S3Storage {
    pub async fn new(
        access_key: &str,
        secret_key: &str,
        region: &str,
        bucket: &str,
        endpoint: Option<&str>,
    ) -> anyhow::Result<Self> {
        let creds = Credentials::new(access_key, secret_key, None, None, "env");
        let region = Region::new(region.to_string());

        let mut builder = Config::builder()
            .region(region.clone())
            .credentials_provider(creds);

        if let Some(ep) = endpoint {
            builder = builder.endpoint_url(ep);
        }

        let client = Client::from_conf(builder.build());

        let base_url = endpoint
            .map(|ep| format!("{}/{}", ep, bucket))
            .unwrap_or_else(|| format!("https://{}.s3.{}.amazonaws.com", bucket, region));

        Ok(Self { client, bucket: bucket.to_string(), base_url })
    }

    pub async fn upload(&self, key: &str, data: Vec<u8>, content_type: &str) -> anyhow::Result<String> {
        self.client
            .put_object()
            .bucket(&self.bucket)
            .key(key)
            .body(ByteStream::from(data))
            .content_type(content_type)
            .send()
            .await?;
        Ok(self.public_url(key))
    }

    pub async fn delete(&self, key: &str) -> anyhow::Result<()> {
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await?;
        Ok(())
    }

    pub async fn presign_url(&self, key: &str, ttl: Duration) -> anyhow::Result<String> {
        let config = aws_sdk_s3::presign::PresigningConfig::builder()
            .expires_in(ttl)
            .build()?;
        let url = self.client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .presigned(config)
            .await?;
        Ok(url.uri().to_string())
    }

    pub fn public_url(&self, key: &str) -> String {
        format!("{}/{}", self.base_url, key)
    }
}

pub fn s3_key(user_id: &str, download_id: &str, filename: &str) -> String {
    format!("users/{}/downloads/{}/{}", user_id, download_id, filename)
}


