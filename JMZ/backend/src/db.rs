use sqlx::{sqlite::SqlitePoolOptions, Pool, Sqlite};

pub type DbPool = Pool<Sqlite>;

pub async fn init_db(database_url: &str) -> anyhow::Result<DbPool> {
    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect_with(
            database_url.parse::<sqlx::sqlite::SqliteConnectOptions>()?
                .create_if_missing(true)
                .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
                .synchronous(sqlx::sqlite::SqliteSynchronous::Normal),
        )
        .await?;

    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            is_admin BOOLEAN DEFAULT FALSE,
            subscription_tier TEXT DEFAULT 'free',
            subscription_expires_at DATETIME,
            downloads_used INTEGER DEFAULT 0,
            downloads_limit INTEGER DEFAULT 10,
            storage_used_bytes INTEGER DEFAULT 0,
            storage_limit_bytes INTEGER DEFAULT 1073741824,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT
        )"#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS downloads (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            url TEXT NOT NULL,
            title TEXT,
            platform TEXT,
            quality TEXT,
            format TEXT,
            status TEXT DEFAULT 'pending',
            s3_key TEXT,
            file_size_bytes INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            completed_at DATETIME,
            expires_at DATETIME,
            error_message TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )"#,
    )
    .execute(&pool)
    .await?;

    sqlx::query(
        r#"CREATE TABLE IF NOT EXISTS payments (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            stripe_payment_intent_id TEXT,
            amount_cents INTEGER NOT NULL,
            currency TEXT DEFAULT 'usd',
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )"#,
    )
    .execute(&pool)
    .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id)")
        .execute(&pool)
        .await?;

    sqlx::query("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        .execute(&pool)
        .await?;

    seed_admin(&pool).await?;

    Ok(pool)
}

async fn seed_admin(pool: &DbPool) -> anyhow::Result<()> {
    let count: i64 =
        sqlx::query_scalar("SELECT COUNT(*) FROM users WHERE is_admin = TRUE")
            .fetch_one(pool)
            .await?;

    if count == 0 {
        let admin_email = std::env::var("ADMIN_EMAIL")
            .unwrap_or_else(|_| "admin@vidsnatch.local".to_string());
        let admin_password = std::env::var("ADMIN_PASSWORD")
            .unwrap_or_else(|_| {
                let random: String = (0..16)
                    .map(|_| rand::random::<u8>())
                    .map(|b| format!("{:02x}", b))
                    .collect();
                random
            });

        let id = uuid::Uuid::new_v4().to_string();
        let hash = bcrypt::hash(&admin_password, bcrypt::DEFAULT_COST)?;

        sqlx::query(
            r#"INSERT INTO users (id, email, password_hash, is_admin, subscription_tier, downloads_limit, storage_limit_bytes)
               VALUES (?, ?, ?, TRUE, 'enterprise', 999999, 1099511627776)"#,
        )
        .bind(&id)
        .bind(&admin_email)
        .bind(&hash)
        .execute(pool)
        .await?;

        tracing::info!("Admin account created: {}", admin_email);
    }

    Ok(())
}

#[derive(sqlx::FromRow, Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct User {
    pub id: String,
    pub email: String,
    pub password_hash: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
    pub is_active: bool,
    pub is_admin: bool,
    pub subscription_tier: String,
    pub subscription_expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub downloads_used: i64,
    pub downloads_limit: i64,
    pub storage_used_bytes: i64,
    pub storage_limit_bytes: i64,
    pub stripe_customer_id: Option<String>,
    pub stripe_subscription_id: Option<String>,
}

#[derive(sqlx::FromRow, Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct Download {
    pub id: String,
    pub user_id: String,
    pub url: String,
    pub title: Option<String>,
    pub platform: Option<String>,
    pub quality: Option<String>,
    pub format: Option<String>,
    pub status: String,
    pub s3_key: Option<String>,
    pub file_size_bytes: Option<i64>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
    pub error_message: Option<String>,
}

impl User {
    pub async fn create(pool: &DbPool, email: &str, password: &str) -> anyhow::Result<Self> {
        let id = uuid::Uuid::new_v4().to_string();
        let hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)?;

        sqlx::query("INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)")
            .bind(&id)
            .bind(email)
            .bind(&hash)
            .execute(pool)
            .await?;

        Ok(Self::get_by_id(pool, &id).await?.expect("User just inserted"))
    }

    pub async fn get_by_id(pool: &DbPool, id: &str) -> anyhow::Result<Option<Self>> {
        Ok(sqlx::query_as("SELECT * FROM users WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?)
    }

    pub async fn get_by_email(pool: &DbPool, email: &str) -> anyhow::Result<Option<Self>> {
        Ok(sqlx::query_as("SELECT * FROM users WHERE email = ?")
            .bind(email)
            .fetch_optional(pool)
            .await?)
    }

    pub fn verify_password(&self, password: &str) -> bool {
        bcrypt::verify(password, &self.password_hash).unwrap_or(false)
    }

    pub fn has_active_subscription(&self) -> bool {
        if self.subscription_tier == "free" {
            return false;
        }
        match self.subscription_expires_at {
            Some(expires) => expires > chrono::Utc::now(),
            None => true,
        }
    }

    pub fn can_download(&self) -> bool {
        if self.is_admin {
            return true;
        }
        self.downloads_used < self.downloads_limit
    }

    pub async fn increment_downloads(&self, pool: &DbPool) -> anyhow::Result<()> {
        sqlx::query("UPDATE users SET downloads_used = downloads_used + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
            .bind(&self.id)
            .execute(pool)
            .await?;
        Ok(())
    }

    pub async fn update_subscription(
        &self,
        pool: &DbPool,
        tier: &str,
        stripe_sub_id: Option<&str>,
        expires_at: Option<chrono::DateTime<chrono::Utc>>,
    ) -> anyhow::Result<()> {
        let (limit, storage) = tier_limits(tier);
        sqlx::query(
            r#"UPDATE users SET
               subscription_tier = ?,
               stripe_subscription_id = ?,
               subscription_expires_at = ?,
               downloads_limit = ?,
               storage_limit_bytes = ?,
               updated_at = CURRENT_TIMESTAMP
               WHERE id = ?"#,
        )
        .bind(tier)
        .bind(stripe_sub_id)
        .bind(expires_at)
        .bind(limit)
        .bind(storage)
        .bind(&self.id)
        .execute(pool)
        .await?;
        Ok(())
    }
}

impl Download {
    pub async fn create(
        pool: &DbPool,
        user_id: &str,
        url: &str,
        title: Option<&str>,
        platform: Option<&str>,
        quality: Option<&str>,
        format: Option<&str>,
    ) -> anyhow::Result<Self> {
        let id = uuid::Uuid::new_v4().to_string();
        let expires = chrono::Utc::now() + chrono::Duration::days(7);

        sqlx::query(
            r#"INSERT INTO downloads (id, user_id, url, title, platform, quality, format, expires_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)"#,
        )
        .bind(&id)
        .bind(user_id)
        .bind(url)
        .bind(title)
        .bind(platform)
        .bind(quality)
        .bind(format)
        .bind(expires)
        .execute(pool)
        .await?;

        Ok(Self::get_by_id(pool, &id).await?.expect("Download just inserted"))
    }

    pub async fn get_by_id(pool: &DbPool, id: &str) -> anyhow::Result<Option<Self>> {
        Ok(sqlx::query_as("SELECT * FROM downloads WHERE id = ?")
            .bind(id)
            .fetch_optional(pool)
            .await?)
    }

    pub async fn get_by_user(pool: &DbPool, user_id: &str) -> anyhow::Result<Vec<Self>> {
        Ok(sqlx::query_as(
            "SELECT * FROM downloads WHERE user_id = ? ORDER BY created_at DESC LIMIT 100",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?)
    }
}

fn tier_limits(tier: &str) -> (i64, i64) {
    match tier {
        "basic"      => (100,    10_737_418_240),
        "pro"        => (1_000,  107_374_182_400),
        "private"    => (999_999, 536_870_912_000),
        "enterprise" => (999_999, 1_099_511_627_776),
        _            => (10,     1_073_741_824),
    }
}


