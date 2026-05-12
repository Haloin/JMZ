#!/bin/bash

# Quick Demo Deployment Script for Render Platform
echo "🚀 Deploying VidSnatch Demo..."

# Check if we have the necessary files
if [ ! -f "render-services.yaml" ]; then
    echo "❌ render-services.yaml not found"
    exit 1
fi

# Instructions for manual deployment
echo "📋 Manual Deployment Steps:"
echo ""
echo "1. Go to https://render.com"
echo "2. Sign up with GitHub"
echo "3. Click 'New Web Service'"
echo "4. Select your JMZ repository"
echo "5. Use these settings:"
echo ""
echo "Backend Service:"
echo "- Name: vidsnatch-api"
echo "- Docker Context: ./backend"
echo "- Plan: Free"
echo "- Environment Variables:"
echo "  - JWT_SECRET: (click Generate)"
echo "  - DATABASE_URL: sqlite:/app/data/data.db"
echo "  - NODE_ENV: production"
echo ""
echo "Frontend Service:"
echo "- Name: vidsnatch-demo"
echo "- Docker Context: ."
echo "- Plan: Free"
echo "- Environment Variables:"
echo "  - NODE_ENV: production"
echo "  - REACT_APP_API_URL: [use-your-api-url]/api"
echo ""
echo "🎯 Your demo will be live at:"
echo "- API: https://vidsnatch-api.onrender.com"
echo "- Frontend: https://vidsnatch-demo.onrender.com"