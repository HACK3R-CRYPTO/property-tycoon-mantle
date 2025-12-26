#!/bin/bash

echo "=== Property Tycoon Database Check ==="
echo ""

# Check if database is running
if docker ps | grep -q property-tycoon-db; then
    echo "✅ Database container is running"
else
    echo "❌ Database container is not running"
    echo "Start it with: docker-compose up -d postgres"
    exit 1
fi

echo ""
echo "=== Database Connection Test ==="
docker exec property-tycoon-db psql -U postgres -d property_tycoon -c "SELECT version();" 2>/dev/null

echo ""
echo "=== Tables ==="
docker exec property-tycoon-db psql -U postgres -d property_tycoon -c "\dt" 2>/dev/null

echo ""
echo "=== Table Counts ==="
docker exec property-tycoon-db psql -U postgres -d property_tycoon -c "
SELECT 
    'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'yield_records', COUNT(*) FROM yield_records
UNION ALL
SELECT 'marketplace_listings', COUNT(*) FROM marketplace_listings
UNION ALL
SELECT 'quests', COUNT(*) FROM quests
UNION ALL
SELECT 'quest_progress', COUNT(*) FROM quest_progress
UNION ALL
SELECT 'leaderboard', COUNT(*) FROM leaderboard;
" 2>/dev/null

echo ""
echo "=== Sample Data ==="
echo "Users:"
docker exec property-tycoon-db psql -U postgres -d property_tycoon -c "SELECT wallet_address, created_at FROM users LIMIT 5;" 2>/dev/null

echo ""
echo "Properties:"
docker exec property-tycoon-db psql -U postgres -d property_tycoon -c "SELECT token_id, property_type, value FROM properties LIMIT 5;" 2>/dev/null

echo ""
echo "To connect interactively:"
echo "  docker exec -it property-tycoon-db psql -U postgres -d property_tycoon"

