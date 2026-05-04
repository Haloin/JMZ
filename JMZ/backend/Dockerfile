FROM rust:1.75-slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Cache dependencies before copying source
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo 'fn main() {}' > src/main.rs
RUN cargo build --release --locked
RUN rm src/main.rs

COPY src ./src
RUN touch src/main.rs && cargo build --release --locked

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --system --no-create-home api

WORKDIR /app
RUN mkdir -p /app/data /app/downloads && chown -R api:api /app

COPY --from=builder /app/target/release/vidsnatch-api /usr/local/bin/api

USER api

ENV RUST_LOG=info
ENV PORT=9000
ENV DATABASE_URL=sqlite:/app/data/data.db

EXPOSE 9000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:9000/api/health || exit 1

CMD ["api"]
