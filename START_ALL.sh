#!/bin/bash

# Property Tycoon - Start All Services
# This script starts Docker, Backend, and Frontend

echo "🚀 Starting Property Tycoon..."

# Step 1: Start Docker (PostgreSQL)
echo "📦 Starting Docker PostgreSQL..."
docker-compose up -d postgres

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 5

# Step 2: Start Backend (in background)
echo "🔧 Starting Backend..."
cd backend
npm run start:dev &
BACKEND_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Step 3: Start Frontend
echo "🎨 Starting Frontend..."
cd frontend
npm run dev

# Note: Frontend runs in foreground
# Press Ctrl+C to stop everything

# Cleanup function (if you want to add it)
# trap "kill $BACKEND_PID; docker-compose down; exit" INT TERM






