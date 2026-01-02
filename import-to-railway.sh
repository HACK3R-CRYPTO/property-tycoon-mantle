#!/bin/bash

# Import local database to Railway PostgreSQL
# Usage: ./import-to-railway.sh YOUR_RAILWAY_DATABASE_URL

if [ -z "$1" ]; then
  echo "❌ Error: Please provide your Railway DATABASE_URL"
  echo "Usage: ./import-to-railway.sh 'postgresql://postgres:password@host:port/database'"
  exit 1
fi

RAILWAY_DB_URL="$1"
BACKUP_FILE="property_tycoon_backup.sql"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "❌ Error: Backup file not found: $BACKUP_FILE"
  echo "Please run the export command first"
  exit 1
fi

echo "📤 Importing database to Railway..."
echo "⚠️  This will replace all data in Railway database!"

# Import using psql via Docker
docker run --rm -i \
  -v "$(pwd)/$BACKUP_FILE:/backup.sql" \
  postgres:16-alpine \
  psql "$RAILWAY_DB_URL" < /backup.sql

if [ $? -eq 0 ]; then
  echo "✅ Database imported successfully!"
else
  echo "❌ Import failed. Check the error above."
  exit 1
fi


