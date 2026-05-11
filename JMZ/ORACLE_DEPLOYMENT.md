# 🚀 VidSnatch Oracle Cloud Deployment Guide

## 📋 Prerequisites

1. **Oracle Cloud Account** - Sign up at [oracle.com/cloud/free](https://oracle.com/cloud/free)
2. **Credit Card** - Required for verification (you won't be charged)
3. **GitHub Repository** - Your code should be pushed to GitHub

---

## 🎯 Step 1: Create Oracle Cloud VM

1. **Sign in to Oracle Cloud Console**
2. Go to **Compute** → **Instances**
3. Click **Create Instance**
4. Configure:
   - **Name**: `vidsnatch-server`
   - **Compartment**: Default
   - **Availability Domain**: Any
   - **Image**: Ubuntu 22.04
   - **Shape**: VM.Standard.A1.Flex (Always Free)
   - **VCPU Count**: 4
   - **Memory (GB)**: 24
   - **Boot Volume**: 50 GB
5. **Add SSH Keys**:
   - Upload your public key OR
   - Generate a new pair and download the private key
6. Click **Create Instance**

---

## 🔑 Step 2: Connect to Your Server

```bash
# If you generated new keys:
chmod 600 your-private-key.pem
ssh -i your-private-key.pem ubuntu@YOUR_SERVER_IP

# If using existing SSH key:
ssh ubuntu@YOUR_SERVER_IP
```

---

## 📥 Step 3: Deploy Your Application

### Option A: Automatic Deployment (Recommended)

```bash
# Download and run the deployment script
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/vidsnatch/main/deploy-oracle.sh | bash
```

### Option B: Manual Deployment

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
sudo mkdir -p /opt/vidsnatch
sudo chown $USER:$USER /opt/vidsnatch
cd /opt/vidsnatch

# Clone your repository
git clone https://github.com/YOUR_USERNAME/vidsnatch.git .

# Set up environment
cp .env.production .env
nano .env  # Edit with your actual values

# Create data directory
mkdir -p data

# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🌐 Step 4: Configure Domain & SSL

### Point Your Domain
1. Go to your domain registrar
2. Add A record: `@ → YOUR_SERVER_IP`
3. Add A record: `www → YOUR_SERVER_IP`

### Setup SSL Certificate
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (already configured)
sudo systemctl status certbot.timer
```

---

## 🔧 Step 5: Configure Production

### Update Environment Variables
```bash
cd /opt/vidsnatch
nano .env
```

**Important: Update these values:**
- `JWT_SECRET` - Generate a strong random secret
- `CORS_ORIGIN` - Set to your domain
- `STRIPE_SECRET_KEY` - If using payments
- `S3_*` - If using cloud storage

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

---

## 📊 Step 6: Verify Deployment

### Check Service Status
```bash
docker-compose -f docker-compose.prod.yml ps
```

### Check Logs
```bash
# API logs
docker-compose -f docker-compose.prod.yml logs -f api

# Web logs
docker-compose -f docker-compose.prod.yml logs -f web
```

### Test Your Application
- Frontend: `https://your-domain.com`
- API Health: `https://your-domain.com/api/health`

---

## 🔍 Monitoring & Maintenance

### Daily Backups (Automatic)
Backups are created daily and stored in `/opt/vidsnatch/backups`

### Manual Backup
```bash
cd /opt/vidsnatch
./backup.sh
```

### Update Application
```bash
cd /opt/vidsnatch
git pull main
docker-compose -f docker-compose.prod.yml up -d --build
```

### Monitor Resources
```bash
# System resources
htop

# Docker stats
docker stats

# Disk usage
df -h
```

---

## 🚨 Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs api

# Rebuild
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

**Database issues:**
```bash
# Check database file
ls -la /opt/vidsnatch/data/

# Manual database check
sqlite3 /opt/vidsnatch/data/data.db ".tables"
```

**SSL Certificate Issues:**
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew
```

### Performance Optimization

1. **Enable Swap** (if needed):
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

2. **Optimize Nginx** (already configured in `nginx/nginx.conf`)

3. **Monitor with Uptime Robot** or similar service

---

## 📈 Scaling Up

When you need more resources:
1. Go to Oracle Cloud Console
2. Navigate to your instance
3. Click **Edit**
4. Increase resources (you'll pay for additional usage)
5. Restart services

---

## 🆘 Support

### Oracle Cloud Support
- [Oracle Cloud Documentation](https://docs.oracle.com)
- [Oracle Cloud Support](https://support.oracle.com)

### Application Support
- Check logs: `docker-compose logs -f`
- Review this guide
- Check GitHub issues

---

## ✅ Deployment Checklist

- [ ] Oracle Cloud VM created (Always Free tier)
- [ ] SSH access working
- [ ] Docker and Docker Compose installed
- [ ] Repository cloned
- [ ] Environment variables configured
- [ ] Services built and running
- [ ] Domain pointed to server
- [ ] SSL certificate installed
- [ ] Backups configured
- [ ] Monitoring set up

---

## 🎉 You're Live!

Your VidSnatch application is now running on Oracle Cloud's powerful free tier!

**Access URLs:**
- **Frontend**: `https://your-domain.com`
- **API**: `https://your-domain.com/api`
- **Health Check**: `https://your-domain.com/health`

**Server Specs:**
- 4 CPU cores
- 24 GB RAM
- 50 GB storage
- 10 TB bandwidth/month

Enjoy your free, powerful hosting! 🚀