# Testing Leveling System with curl

## Test the User Profile Endpoint

The profile endpoint should return `level` and `totalExperiencePoints` fields.

### Replace these values:
- `YOUR_RAILWAY_URL` - Your Railway backend URL (e.g., `https://your-app.railway.app`)
- `WALLET_ADDRESS` - A wallet address to test (e.g., `0x3210607AC8126770E850957cE7373ee7e59e3A29`)

### Test Command:

```bash
# Test with Railway URL
curl -X GET "https://YOUR_RAILWAY_URL/api/users/profile/WALLET_ADDRESS" \
  -H "Content-Type: application/json"

# Or test with localhost (if running locally)
curl -X GET "http://localhost:3001/api/users/profile/WALLET_ADDRESS" \
  -H "Content-Type: application/json"
```

### Expected Response:

```json
{
  "id": "uuid-here",
  "walletAddress": "0x...",
  "username": "username or null",
  "avatar": "https://api.dicebear.com/...",
  "totalPortfolioValue": "1000000000000000000",
  "totalYieldEarned": "500000000000000000",
  "propertiesOwned": 5,
  "totalExperiencePoints": "1250.5",  // ✅ Should be present
  "level": 2,                           // ✅ Should be present
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### What to Check:

1. ✅ **`level` field exists** - Should be a number (1, 2, 3, etc.)
2. ✅ **`totalExperiencePoints` field exists** - Should be a string number
3. ✅ **Level is calculated correctly** - Based on properties, yield, portfolio
4. ✅ **Title matches level** - Frontend should show correct title

### Test Multiple Users:

```bash
# Test user 1
curl "https://YOUR_RAILWAY_URL/api/users/profile/0x3210607AC8126770E850957cE7373ee7e59e3A29"

# Test user 2 (if you have another address)
curl "https://YOUR_RAILWAY_URL/api/users/profile/0xANOTHER_ADDRESS"
```

### Check Migration Logs:

If you have access to Railway logs, check for:
- `✅ Migration completed successfully!`
- `🔄 Updating levels for existing users...`
- `✅ Updated 0x...: Level X, XP Y`

### Troubleshooting:

**If `level` is missing or 1 for all users:**
- Migration might not have run
- Check Railway logs for migration errors
- Run manually: `npm run update:existing-levels:prod`

**If `totalExperiencePoints` is 0:**
- User might have no properties/yield/portfolio
- This is correct for new users
- Levels will update when they mint properties or claim yield

