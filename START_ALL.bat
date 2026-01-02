                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                @echo off
REM Property Tycoon - Start All Services (Windows)
REM This script starts Docker, Backend, and Frontend

echo 🚀 Starting Property Tycoon...

REM Step 1: Start Docker (PostgreSQL)
echo 📦 Starting Docker PostgreSQL...
docker-compose up -d postgres

REM Wait for database to be ready
echo ⏳ Waiting for database to be ready...
timeout /t 5 /nobreak >nul

REM Step 2: Start Backend (in new window)
echo 🔧 Starting Backend...
start "Backend Server" cmd /k "cd backend && npm run start:dev"

REM Wait a bit for backend to start
timeout /t 3 /nobreak >nul

REM Step 3: Start Frontend (in new window)
echo 🎨 Starting Frontend...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo ✅ All services started!
echo.
echo 📍 Frontend: http://localhost:3000
echo 📍 Backend: http://localhost:3001
echo 📍 API Docs: http://localhost:3001/api/docs
echo.
echo Press any key to exit...
pause >nul







