# Railway Database Migration Guide

## How Migrations Work on Railway

When you push code to Railway, the database migrations run **automatically** before the app starts.

### Automatic Migration Process

1. **Railway builds your app** (`npm run build`)
2. **Railway runs the start command** which includes:
   - `npm run start:prod:with-migration` (configured in `railway.json`)
   - This runs: `node dist/database/migrate-level-columns.js && node dist/main`
3. **Migration script checks** if the new columns exist:
   - `total_experience_points` (NUMERIC)
   - `level` (INTEGER)
4. **If columns don't exist**, they are added automatically
5. **If columns already exist**, the migration is skipped (safe to run multiple times)
6. **App starts normally** after migration completes

### What Gets Migrated

The migration adds two new columns to the `users` table:
- `total_experience_points` - Stores calculated XP (default: 0)
- `level` - Stores user level (default: 1)

### Migration Safety

✅ **Safe to run multiple times** - The migration checks if columns exist before adding them
✅ **No data loss** - Existing users get default values (0 XP, Level 1)
✅ **Automatic** - Runs on every deployment
✅ **Idempotent** - Can be run repeatedly without issues

### Manual Migration (if needed)

If you need to run the migration manually:

```bash
# Development
npm run migrate:level

# Production (after build)
npm run migrate:level:prod
```

### Verifying Migration

After deployment, you can verify the migration worked by:

1. **Check Railway logs** - Look for:
   - `🔄 Migrating users table: adding level and experience columns...`
   - `✅ Migration completed successfully!`

2. **Query the database**:
   ```sql
   SELECT column_name, data_type, column_default 
   FROM information_schema.columns 
   WHERE table_name = 'users' 
   AND column_name IN ('total_experience_points', 'level');
   ```

### Troubleshooting

**If migration fails:**
- Check Railway logs for error messages
- Verify `DATABASE_URL` environment variable is set correctly
- Ensure database connection is working

**If columns already exist:**
- This is normal - the migration will skip adding them
- You'll see: `Column total_experience_points already exists`

### Notes

- The migration is **idempotent** - safe to run multiple times
- Existing users will have `level = 1` and `total_experience_points = 0` initially
- Levels will be automatically calculated when leaderboard updates run
- No downtime required - migration runs before app starts

