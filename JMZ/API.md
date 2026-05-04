# API Reference

Base URL: `/api`

## Auth

POST /auth/register - Create account
POST /auth/login - Login
GET /auth/me - Current user

## Downloads

POST /extract - Get video info
POST /download - Start download
GET /progress/{id} - Download progress
POST /cancel/{id} - Cancel download
GET /history - Download history

## Payments

GET /tiers - Subscription plans
POST /checkout - Create checkout
POST /cancel-subscription - Cancel plan

## Admin

GET /admin/stats - Dashboard stats
GET /admin/users - User list
GET /admin/downloads - Download logs
