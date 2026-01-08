# Railway Deployment Guide

This guide will help you deploy the youruniverse-backend to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. GitHub repository connected to Railway
3. PostgreSQL database (Railway provides this)
4. Redis instance (Railway provides this)

## Step 1: Generate package-lock.json

Before deploying, make sure you have a `package-lock.json` file:

```bash
cd youruniverse-backend
npm install
```

This will generate `package-lock.json` which is required for `npm ci` in Docker.

## Step 2: Commit package-lock.json

Make sure `package-lock.json` is committed to your repository:

```bash
git add package-lock.json
git commit -m "Add package-lock.json for Docker builds"
git push
```

## Step 3: Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will automatically detect the Dockerfile

## Step 4: Add PostgreSQL Database

1. In your Railway project, click "New"
2. Select "Database" → "Add PostgreSQL"
3. Railway will automatically create a `DATABASE_URL` environment variable

## Step 5: Add Redis

1. In your Railway project, click "New"
2. Select "Database" → "Add Redis"
3. Railway will automatically create a `REDIS_URL` environment variable

## Step 6: Configure Environment Variables

In Railway, go to your service → Variables tab and add:

### Required Variables

```env
# Application
NODE_ENV=production
PORT=8000
HOST=0.0.0.0
API_VERSION=v1
APP_NAME=youruniverse-api

# Database (automatically set by Railway PostgreSQL)
# DATABASE_URL - Set automatically by Railway

# Redis (automatically set by Railway Redis)
# REDIS_URL - Set automatically by Railway

# JWT Tokens (CHANGE THESE!)
JWT_ACCESS_SECRET=your-super-secret-access-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@youruniverse.ai

# File Upload
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp,image/gif
UPLOAD_DIR=./uploads

# AWS S3 (Optional - if not configured, files will be stored locally)
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name
AWS_S3_ENDPOINT=
AWS_S3_CDN_URL=

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX_REQUESTS=5

# CORS (Update with your frontend URL)
CORS_ORIGIN=https://your-frontend-domain.com
CORS_CREDENTIALS=true

# Python Microservice (if applicable)
PYTHON_CHAT_SERVICE_URL=http://localhost:8001

# MFA / OTP
OTP_SECRET=your-otp-secret-key
OTP_ISSUER=youruniverse.ai
```

### Important Notes:

- **DATABASE_URL** and **REDIS_URL** are automatically set by Railway when you add those services
- **PORT** is automatically set by Railway - your app should use `process.env.PORT`
- Generate secure random strings for JWT secrets and OTP secret
- Update CORS_ORIGIN with your frontend domain

## Step 7: Deploy

Railway will automatically:
1. Build your Docker image using the Dockerfile
2. Run database migrations (`npx prisma migrate deploy`)
3. Start your application

## Step 8: Check Logs

Monitor your deployment in Railway's logs tab. You should see:
- Database migrations running
- Server starting on the PORT provided by Railway

## Step 9: Get Your Domain

Railway automatically provides a domain. You can:
1. Go to Settings → Networking
2. Generate a domain or use a custom domain

## Troubleshooting

### Build Fails: "npm ci requires package-lock.json"

**Solution**: Make sure `package-lock.json` is committed to your repository:
```bash
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Database Connection Fails

**Solution**: Make sure:
1. PostgreSQL service is added to your Railway project
2. `DATABASE_URL` environment variable is set (Railway does this automatically)
3. Your app code uses `process.env.DATABASE_URL`

### Port Issues

**Solution**: Railway sets `PORT` automatically. Make sure your app uses:
```typescript
const port = process.env.PORT || 8000;
```

### Migrations Fail

**Solution**: Check that:
1. Prisma schema is correct
2. Database is accessible
3. `DATABASE_URL` is correctly formatted

## Environment Variables Reference

See `env.example` for all available environment variables and their descriptions.
