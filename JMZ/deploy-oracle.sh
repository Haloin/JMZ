#!/bin/bash

# VidSnatch Oracle Cloud Deployment Script
# This script sets up the entire application on Oracle Cloud Free Tier

set -e

echo "🚀 Starting VidSnatch deployment on Oracle Cloud..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
echo "🔧 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p /opt/vidsnatch
sudo chown $USER:$USER /opt/vidsnatch
cd /opt/vidsnatch

# Clone repository (replace with your repo URL)
echo "📥 Cloning repository..."
git clone https://github.com/YOUR_USERNAME/vidsnatch.git .

# Create production environment file
echo "⚙️ Creating production environment..."
cat > .env << EOF
# Production Environment Variables
JWT_SECRET=$(openssl rand -base64 32)
DATABASE_URL=sqlite:/app/data/data.db
NODE_ENV=production
RUST_LOG=info
PORT=9000

# Optional: Add your API keys
STRIPE_SECRET_KEY=
S3_ACCESS_KEY=
S3_SECRET_KEY=
EOF

# Create data directory
echo "💾 Creating data directory..."
mkdir -p data

# Build and start services
echo "🏗️ Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose -f docker-compose.prod.yml ps

# Setup SSL with Let's Encrypt (optional)
echo "🔒 Setting up SSL certificate..."
sudo apt install -y certbot python3-certbot-nginx

# Get server IP
SERVER_IP=$(curl -s ifconfig.me)
echo "🌐 Your server IP: $SERVER_IP"

echo "✅ Deployment complete!"
echo "🎯 Your application should be available at: http://$SERVER_IP:3000"
echo "📊 API available at: http://$SERVER_IP:9000"
echo ""
echo "📝 Next steps:"
echo "1. Configure your domain name to point to $SERVER_IP"
echo "2. Run: sudo certbot --nginx -d your-domain.com"
echo "3. Update your frontend API URL in production"