# VidSnatch Deployment Guide

## 🚀 Quick Deploy with Render (Recommended for Beginners)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will auto-detect your Docker setup
6. Choose "Free" plan
7. Click "Create Web Service"

### Step 3: Deploy Both Services
- **API Service**: Connect `backend/Dockerfile`
- **Web Service**: Connect root `Dockerfile`

### Step 4: Configure Environment
- Set `JWT_SECRET` in Render dashboard
- Add any other required environment variables

## 📋 What's Already Configured

✅ **Docker containers** ready for deployment  
✅ **Render configuration** file (`render.yaml`)  
✅ **Nginx** configured for production  
✅ **Git ignore** file set up  
✅ **Health checks** configured  

## 🌐 After Deployment

Your app will be available at:
- Frontend: `https://your-app.onrender.com`
- API: `https://your-api.onrender.com`

## 🔧 Custom Domain (Optional)

1. In Render dashboard, go to your service
2. Click "Custom Domains"
3. Add your domain
4. Update DNS records as shown

## 💡 Alternative: Oracle Cloud Free Tier

If you want more resources (4 cores, 24GB RAM):
1. Sign up at [oracle.com/cloud/free](https://oracle.com/cloud/free)
2. Create an Ubuntu VM
3. Install Docker: `curl -sSL https://get.docker.com | sh`
4. Clone your repo and run: `docker-compose up -d`

## 🆘 Need Help?

- Render docs: [render.com/docs](https://render.com/docs)
- Oracle Cloud docs: [docs.oracle.com](https://docs.oracle.com)