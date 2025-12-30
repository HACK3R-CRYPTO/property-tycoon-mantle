# Railway Deployment Guide

Complete guide for deploying Property Tycoon backend and database to Railway.

## Overview

Railway is a modern platform that makes deploying PostgreSQL and Node.js applications easy. This guide covers:
1. Deploying PostgreSQL database
2. Deploying NestJS backend
3. Setting up environment variables
4. Connecting services

## Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub repository connected to Railway
- Mantle network access (for contract interactions)

## Step 1: Deploy PostgreSQL Database

### Option A: Using Railway's PostgreSQL Template

1. Go to Railway dashboard: https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"** (or "New" → "Database" → "PostgreSQL")
4. Choose your repository
5. Railway will automatically provision PostgreSQL

### Option B: Manual PostgreSQL Setup

1. In Railway dashboard, click **"New"** → **"Database"** → **"PostgreSQL"**
2. Railway will create a PostgreSQL instance
3. Note the connection details from the **"Variables"** tab

### Get Database Connection String

After PostgreSQL is deployed:

1. Click on your PostgreSQL service
2. Go to **"Variables"** tab
3. Copy the `DATABASE_URL` variable (Railway provides this automatically)
4. Format: `postgresql://postgres:PASSWORD@HOST:PORT/railway`

## Step 2: Deploy Backend Service

### Method 1: Deploy from GitHub (Recommended)

1. In Railway dashboard, click **"New Project"**
2. Select **"Deploy from GitHub repo"**
3. Choose your `property-tycoon-mantle` repository
4. Railway will detect it's a Node.js project
5. **Important**: Set the **Root Directory** to `backend`:
   - Go to service settings
   - Under **"Source"**, set **Root Directory** to `backend`

### Method 2: Manual Setup

1. Click **"New"** → **"GitHub Repo"**
2. Select your repository
3. Set **Root Directory** to `backend`
4. Railway will auto-detect Node.js and build

### Configure Build Settings

Railway should auto-detect, but verify:

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:prod`
- **Node Version**: 18 or higher (Railway auto-detects)

## Step 3: Set Environment Variables

Go to your backend service → **"Variables"** tab and add:

### Required Variables

```env
# Database (use Railway's PostgreSQL DATABASE_URL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Mantle Network
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
L1_RPC_URL=https://eth.llamarpc.com

# Contract Addresses (Mantle Sepolia Testnet)
PROPERTY_NFT_ADDRESS=0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c
GAME_TOKEN_ADDRESS=0x3334f87178AD0f33e61009777a3dFa1756e9c23f
YIELD_DISTRIBUTOR_ADDRESS=0xb950EE50c98cD686DA34C535955203e2CE065F88
MARKETPLACE_ADDRESS=0x6b6b65843117C55da74Ea55C954a329659EFBeF0
QUEST_SYSTEM_ADDRESS=0x89f72227168De554A28874aA79Bcb6f0E8e2227C
TOKEN_SWAP_ADDRESS=0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E

# Private Key (for contract interactions)
PRIVATE_KEY=your_private_key_here

# Server Configuration
PORT=3001
API_PREFIX=api
CORS_ORIGIN=https://your-frontend-domain.com
```

### Using Railway's Variable References

For the database connection, use Railway's variable reference:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

This automatically connects to your PostgreSQL service.

## Step 4: Initialize Database

After deployment, initialize the database schema:

### Option A: Using Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Login:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Run database initialization:
   ```bash
   railway run npm run db:init
   ```

### Option B: Using Railway's One-Click Shell

1. Go to your backend service
2. Click **"Deployments"** → **"View Logs"**
3. Click **"Shell"** button
4. Run:
   ```bash
   npm run db:init
   ```

### Option C: Manual SQL Execution

1. Go to PostgreSQL service
2. Click **"Data"** tab
3. Use Railway's SQL editor to run initialization scripts

## Step 5: Connect Services

Railway automatically connects services in the same project. To reference PostgreSQL from backend:

1. In backend service settings
2. Go to **"Variables"** tab
3. Add: `DATABASE_URL=${{Postgres.DATABASE_URL}}`
4. Railway will inject the connection string automatically

## Step 6: Configure CORS

Update CORS origin to allow your frontend:

1. In backend **"Variables"** tab
2. Set `CORS_ORIGIN` to your frontend URL:
   - Local: `http://localhost:3000`
   - Production: `https://your-frontend-domain.com`
   - Multiple: `http://localhost:3000,https://your-frontend-domain.com`

## Step 7: Get Backend URL

After deployment:

1. Go to backend service
2. Click **"Settings"** → **"Generate Domain"**
3. Railway will provide a URL like: `https://your-service.up.railway.app`
4. Use this URL in your frontend `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://your-service.up.railway.app/api
   ```

## Step 8: Verify Deployment

### Check Backend Health

```bash
curl https://your-service.up.railway.app/api/docs
```

Should return Swagger documentation page.

### Check Database Connection

Check backend logs in Railway dashboard. Should see:
- Database connection successful
- Event indexer started
- WebSocket gateway initialized

## Railway-Specific Configuration

### Port Configuration

Railway automatically sets `PORT` environment variable. Your backend already uses:
```typescript
const port = process.env.PORT || 3001;
```

This works automatically with Railway.

### Health Checks

Railway automatically health checks on the root endpoint. Your backend serves Swagger docs at `/api/docs` which works as a health check.

### Build Optimization

Railway uses Nixpacks for builds. The `nixpacks.toml` file optimizes:
- Node.js version
- Build commands
- Start commands

## Environment Variables Reference

### Database Variables (Auto-provided by Railway)

- `DATABASE_URL` - Full PostgreSQL connection string
- `PGHOST` - Database host
- `PGPORT` - Database port
- `PGDATABASE` - Database name
- `PGUSER` - Database user
- `PGPASSWORD` - Database password

### Backend Variables (You Set)

- `MANTLE_RPC_URL` - Mantle network RPC endpoint
- `PRIVATE_KEY` - Wallet private key for contract calls
- `PROPERTY_NFT_ADDRESS` - PropertyNFT contract address
- `GAME_TOKEN_ADDRESS` - GameToken contract address
- `YIELD_DISTRIBUTOR_ADDRESS` - YieldDistributor contract address
- `MARKETPLACE_ADDRESS` - Marketplace contract address
- `QUEST_SYSTEM_ADDRESS` - QuestSystem contract address
- `TOKEN_SWAP_ADDRESS` - TokenSwap contract address
- `CORS_ORIGIN` - Frontend origin for CORS
- `API_PREFIX` - API prefix (default: `api`)

## Troubleshooting

### Build Fails

**Issue**: Build command fails
**Solution**: 
- Check Node.js version (needs 18+)
- Verify `package.json` has correct scripts
- Check Railway logs for specific errors

### Database Connection Fails

**Issue**: Cannot connect to PostgreSQL
**Solution**:
- Verify `DATABASE_URL` is set correctly
- Use `${{Postgres.DATABASE_URL}}` reference
- Check PostgreSQL service is running
- Verify network connectivity

### Backend Crashes on Start

**Issue**: Backend starts then crashes
**Solution**:
- Check environment variables are all set
- Verify `PRIVATE_KEY` is correct format (with 0x prefix)
- Check contract addresses are valid
- Review logs for specific errors

### CORS Errors

**Issue**: Frontend can't connect to backend
**Solution**:
- Set `CORS_ORIGIN` to your frontend URL
- Include protocol (`https://` not just domain)
- Restart backend after changing CORS settings

### Database Schema Not Initialized

**Issue**: Tables don't exist
**Solution**:
- Run `npm run db:init` via Railway shell
- Or manually execute SQL from `backend/src/database/init-db.ts`
- Check database logs for errors

## Cost Estimation

Railway pricing (as of 2024):
- **Free Tier**: $5 credit/month
- **PostgreSQL**: ~$5/month for small instance
- **Backend**: ~$5/month for small instance
- **Total**: ~$10/month (or free with credits)

## Production Checklist

- [ ] PostgreSQL deployed and running
- [ ] Backend deployed and accessible
- [ ] Database schema initialized
- [ ] All environment variables set
- [ ] CORS configured for frontend
- [ ] Backend URL added to frontend `.env.local`
- [ ] Health checks passing
- [ ] Event indexer running
- [ ] WebSocket connections working
- [ ] API documentation accessible

## Next Steps

After backend is deployed:

1. Update frontend `.env.local` with backend URL
2. Deploy frontend (Vercel, Netlify, or Railway)
3. Test full integration
4. Monitor logs for any issues

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app



