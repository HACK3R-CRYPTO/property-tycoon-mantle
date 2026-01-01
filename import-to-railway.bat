@echo off
REM Import local database to Railway PostgreSQL
REM Usage: import-to-railway.bat YOUR_RAILWAY_DATABASE_URL

if "%1"=="" (
    echo ❌ Error: Please provide your Railway DATABASE_URL
    echo Usage: import-to-railway.bat "postgresql://postgres:password@host:port/database"
    exit /b 1
)

set RAILWAY_DB_URL=%1
set BACKUP_FILE=property_tycoon_backup.sql

if not exist "%BACKUP_FILE%" (
    echo ❌ Error: Backup file not found: %BACKUP_FILE%
    echo Please run the export command first
    exit /b 1
)

echo 📤 Importing database to Railway...
echo ⚠️  This will replace all data in Railway database!

REM Import using psql via Docker
docker run --rm -i -v "%CD%\%BACKUP_FILE%:/backup.sql" postgres:16-alpine psql "%RAILWAY_DB_URL%" < "%BACKUP_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo ✅ Database imported successfully!
) else (
    echo ❌ Import failed. Check the error above.
    exit /b 1
)

