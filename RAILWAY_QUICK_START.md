# Railway Quick Start Guide

Fast deployment guide for Property Tycoon on Railway.

## Quick Deploy (5 Minutes)

### Step 1: Deploy PostgreSQL

1. Go to https://railway.app
2. Click **"New Project"**
3. Click **"New"** → **"Database"** → **"PostgreSQL"**
4. Wait for deployment (30 seconds)
5. Copy the `DATABASE_URL` from **"Variables"** tab

### Step 2: Deploy Backend

1. In the same project, click **"New"** → **"GitHub Repo"**
2. Select your `property-tycoon-mantle` repository
3. **Important**: Set **Root Directory** to `backend`
4. Railway will auto-detect and build

### Step 3: Set Environment Variables

Go to backend service → **"Variables"** tab → **"New Variable"**:

**Required Variables:**

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
MANTLE_RPC_URL=https://rpc.sepolia.mantle.xyz
PRIVATE_KEY=0xyour_private_key_here
PROPERTY_NFT_ADDRESS=0xeD1c7F14F40DF269E561Eb775fbD0b9dF3B4892c
GAME_TOKEN_ADDRESS=0x3334f87178AD0f33e61009777a3dFa1756e9c23f
YIELD_DISTRIBUTOR_ADDRESS=0xb950EE50c98cD686DA34C535955203e2CE065F88
MARKETPLACE_ADDRESS=0x6b6b65843117C55da74Ea55C954a329659EFBeF0
QUEST_SYSTEM_ADDRESS=0x89f72227168De554A28874aA79Bcb6f0E8e2227C
TOKEN_SWAP_ADDRESS=0xAd22cC67E66F1F0b0D1Be33F53Bd0948796a460E
CORS_ORIGIN=http://localhost:3000
```

**Note**: Use `${{Postgres.DATABASE_URL}}` to reference PostgreSQL automatically.

### Step 4: Initialize Database

1. Go to backend service → **"Deployments"** → **"Shell"**
2. Run:
   ```bash
   npm run db:init
   ```

### Step 5: Get Backend URL

1. Go to backend service → **"Settings"**
2. Click **"Generate Domain"**
3. Copy the URL (e.g., `https://your-app.up.railway.app`)

### Step 6: Update Frontend

Update `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app/api
```

## That's It! 🎉

Your backend is now live on Railway. Test it:

```bash
curl https://your-app.up.railway.app/api/docs
```

## Troubleshooting

**Build fails?**
- Check Root Directory is set to `backend`
- Verify Node.js version (needs 18+)

**Database connection fails?**
- Use `${{Postgres.DATABASE_URL}}` not a manual string
- Check PostgreSQL service is running

**Backend crashes?**
- Check all environment variables are set
- Verify `PRIVATE_KEY` has `0x` prefix
- Check logs in Railway dashboard

## Next Steps

- Deploy frontend to Vercel/Netlify
- Update frontend `.env.local` with backend URL
- Test full integration

For detailed instructions, see [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)

